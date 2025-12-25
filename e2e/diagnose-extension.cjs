const path = require('node:path')
const fs = require('fs-extra')
const { chromium } = require('@playwright/test')
const {
  ensureCacheDirExists,
  downloadFile,
  unzipArchive
} = require('@synthetixio/synpress-cache')

const DEFAULT_METAMASK_VERSION = '11.9.1'
const EXTENSION_DOWNLOAD_URL = `https://github.com/MetaMask/metamask-extension/releases/download/v${DEFAULT_METAMASK_VERSION}/metamask-chrome-${DEFAULT_METAMASK_VERSION}.zip`

async function resolveLocalizedName(extensionPath, manifest) {
  if (typeof manifest?.name !== 'string') return ''
  if (!manifest.name.startsWith('__MSG_')) return manifest.name
  const key = manifest.name.replace(/^__MSG_/, '').replace(/__$/, '')
  const localesPath = path.join(extensionPath, '_locales', 'en', 'messages.json')
  if (!(await fs.pathExists(localesPath))) return manifest.name
  try {
    const messages = await fs.readJson(localesPath)
    return messages?.[key]?.message || manifest.name
  } catch {
    return manifest.name
  }
}

async function resolveMetaMaskExtensionPath(unzipPath) {
  const rootManifestPath = path.join(unzipPath, 'manifest.json')
  if (await fs.pathExists(rootManifestPath)) {
    const manifest = await fs.readJson(rootManifestPath)
    const manifestName = await resolveLocalizedName(unzipPath, manifest)
    return { extensionPath: unzipPath, manifest, manifestName }
  }

  const entries = await fs.readdir(unzipPath, { withFileTypes: true })
  let fallback
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const candidatePath = path.join(unzipPath, entry.name)
    const manifestPath = path.join(candidatePath, 'manifest.json')
    if (!(await fs.pathExists(manifestPath))) continue
    const manifest = await fs.readJson(manifestPath)
    const manifestName = await resolveLocalizedName(candidatePath, manifest)
    const prepared = { extensionPath: candidatePath, manifest, manifestName }
    if ((manifestName || '').toLowerCase().includes('metamask')) {
      return prepared
    }
    fallback ??= prepared
  }

  return fallback ?? { extensionPath: unzipPath, manifest: {}, manifestName: '' }
}

async function prepareExtension() {
  const outputDir = ensureCacheDirExists()
  const downloadResult = await downloadFile({
    url: EXTENSION_DOWNLOAD_URL,
    outputDir,
    fileName: `metamask-chrome-${DEFAULT_METAMASK_VERSION}.zip`
  })
  const unzipResult = await unzipArchive({
    archivePath: downloadResult.filePath
  })
  return resolveMetaMaskExtensionPath(unzipResult.outputPath)
}

async function listInstalledExtensions(contextPath) {
  const extensionsRoot = path.join(contextPath, 'Default', 'Extensions')
  if (!(await fs.pathExists(extensionsRoot))) {
    console.log('[diagnose] Extensions folder not found:', extensionsRoot)
    return []
  }
  const extensionIds = await fs.readdir(extensionsRoot)
  const entries = []
  for (const extensionId of extensionIds) {
    const extensionDir = path.join(extensionsRoot, extensionId)
    let versions = []
    try {
      versions = await fs.readdir(extensionDir)
    } catch {
      continue
    }
    for (const version of versions) {
      const manifestPath = path.join(extensionDir, version, 'manifest.json')
      if (!(await fs.pathExists(manifestPath))) continue
      try {
        const manifest = await fs.readJson(manifestPath)
        const name = await resolveLocalizedName(path.join(extensionDir, version), manifest)
        entries.push({ extensionId, version, name, manifestVersion: manifest?.manifest_version })
      } catch {
        // ignore invalid manifest
      }
    }
  }
  return entries
}

async function readPreferences(contextPath) {
  const preferencesPath = path.join(contextPath, 'Default', 'Preferences')
  if (!(await fs.pathExists(preferencesPath))) {
    return null
  }
  try {
    return await fs.readJson(preferencesPath)
  } catch {
    return null
  }
}

async function readChromeDebugLog(contextPath) {
  const candidates = [
    path.join(contextPath, 'chrome_debug.log'),
    path.join(contextPath, 'Default', 'chrome_debug.log')
  ]
  for (const candidate of candidates) {
    if (await fs.pathExists(candidate)) {
      try {
        const content = await fs.readFile(candidate, 'utf8')
        return { path: candidate, content }
      } catch {
        return { path: candidate, content: '' }
      }
    }
  }
  return null
}

async function main() {
  const overrideExecutable =
    process.env.DIAG_CHROMIUM_EXECUTABLE_PATH ||
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
    ''
  if (overrideExecutable) {
    console.log('[diagnose] override chromium executable:', overrideExecutable)
  }
  console.log('[diagnose] chromium executable:', chromium.executablePath())

  const tempDir = await fs.mkdtemp(path.join(process.cwd(), '.tmp-chrome-profile-'))
  let context
  try {
    const { extensionPath, manifest, manifestName } = await prepareExtension()
    console.log('[diagnose] metamask extension path:', extensionPath)
    console.log('[diagnose] metamask manifest name:', manifestName || manifest?.name || 'unknown')
    console.log('[diagnose] metamask manifest version:', manifest?.manifest_version)

    const args = [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--enable-features=ExtensionsManifestV2',
      '--disable-features=ExtensionsManifestV2Deprecation,ExtensionsManifestV2DeprecationWarning',
      '--enable-logging=stderr',
      '--v=1'
    ]

    context = await chromium.launchPersistentContext(tempDir, {
      headless: false,
      executablePath: overrideExecutable || undefined,
      args,
      ignoreDefaultArgs: [
        '--disable-extensions',
        '--disable-component-extensions-with-background-pages',
        '--disable-extensions-except',
        '--enable-automation'
      ]
    })

    const browser = context.browser()
    if (browser) {
      console.log('[diagnose] browser version:', browser.version())
    }

    await new Promise(r => setTimeout(r, 8000))

    console.log('[diagnose] service workers:', context.serviceWorkers().map(sw => sw.url()))
    console.log('[diagnose] pages:', context.pages().map(p => p.url()))

    const extensions = await listInstalledExtensions(tempDir)
    const preferences = await readPreferences(tempDir)
    const extensionSettings = preferences?.extensions?.settings
    const settingsKeys = extensionSettings && typeof extensionSettings === 'object'
      ? Object.keys(extensionSettings)
      : []
    console.log('[diagnose] Preferences extensions keys:', settingsKeys)

    const debugLog = await readChromeDebugLog(tempDir)
    if (debugLog && debugLog.content) {
      const lines = debugLog.content.trim().split('\n').slice(-50)
      console.log(`[diagnose] chrome_debug.log tail (${debugLog.path}):`)
      for (const line of lines) {
        console.log(line)
      }
    } else if (debugLog) {
      console.log(`[diagnose] chrome_debug.log found but empty (${debugLog.path})`)
    }
    if (!extensions.length) {
      console.error('[diagnose] No extensions registered in profile.')
      process.exitCode = 1
    } else {
      console.log('[diagnose] Installed extensions:')
      for (const entry of extensions) {
        console.log(`  - ${entry.extensionId} (${entry.version}) ${entry.name} [mv${entry.manifestVersion}]`)
      }
      const hasMetaMask = extensions.some(entry => (entry.name || '').toLowerCase().includes('metamask'))
      if (!hasMetaMask) {
        console.error('[diagnose] MetaMask not detected among installed extensions.')
        process.exitCode = 1
      }
    }
  } finally {
    if (context) {
      await context.close()
    }
    await fs.remove(tempDir)
  }
}

main().catch(error => {
  console.error('[diagnose] failed:', error)
  process.exit(1)
})
