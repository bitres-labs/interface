import path from 'node:path'
import fs from 'fs-extra'
import { chromium, type BrowserContext, type Page, test as base } from '@playwright/test'
import {
  CACHE_DIR_NAME,
  createTempContextDir,
  defineWalletSetup,
  removeTempContextDir,
  ensureCacheDirExists,
  downloadFile,
  unzipArchive
} from '@synthetixio/synpress-cache'
import { MetaMask, unlockForFixture } from '@synthetixio/synpress-metamask/playwright'

// MetaMask extension version and download URL
const DEFAULT_METAMASK_VERSION = '11.9.1'
const EXTENSION_DOWNLOAD_URL = `https://github.com/MetaMask/metamask-extension/releases/download/v${DEFAULT_METAMASK_VERSION}/metamask-chrome-${DEFAULT_METAMASK_VERSION}.zip`

type PreparedExtension = {
  extensionPath: string
  manifestName: string
}

async function resolveMetaMaskExtensionPath(unzipPath: string): Promise<PreparedExtension> {
  const rootManifestPath = path.join(unzipPath, 'manifest.json')
  if (await fs.pathExists(rootManifestPath)) {
    const manifest = await fs.readJson(rootManifestPath)
    return {
      extensionPath: unzipPath,
      manifestName: typeof manifest?.name === 'string' ? manifest.name : 'MetaMask'
    }
  }

  const entries = await fs.readdir(unzipPath, { withFileTypes: true })
  let fallback: PreparedExtension | undefined
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const candidatePath = path.join(unzipPath, entry.name)
    const manifestPath = path.join(candidatePath, 'manifest.json')
    if (!(await fs.pathExists(manifestPath))) continue
    const manifest = await fs.readJson(manifestPath)
    const manifestName = typeof manifest?.name === 'string' ? manifest.name : 'MetaMask'
    const prepared = { extensionPath: candidatePath, manifestName }
    if (manifestName.toLowerCase().includes('metamask')) {
      return prepared
    }
    fallback ??= prepared
  }

  return fallback ?? { extensionPath: unzipPath, manifestName: 'MetaMask' }
}

// Inline prepareExtension since it's not exported
async function prepareExtension(forceCache = true): Promise<PreparedExtension> {
  let outputDir = ''
  if (forceCache) {
    outputDir = ensureCacheDirExists()
  } else {
    outputDir = path.resolve('./', 'downloads')
    if (!(await fs.exists(outputDir))) {
      fs.mkdirSync(outputDir)
    }
  }
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

// Inline persistLocalStorage since it's not exported from the package
async function persistLocalStorage(
  origins: { origin: string; localStorage: { name: string; value: string }[] }[],
  context: BrowserContext
) {
  const newPage = await context.newPage()
  for (const { origin, localStorage } of origins) {
    const frame = newPage.mainFrame()
    await frame.goto(origin)
    await frame.evaluate((data) => {
      data.forEach(({ name, value }) => window.localStorage.setItem(name, value))
    }, localStorage)
  }
  await newPage.close()
}

type MetaMaskFixtures = {
  _contextPath: string
  metamask: MetaMask
  extensionId: string
  metamaskPage: Page
}

let _metamaskPage: Page

function getExtensionIdFromUrl(url?: string) {
  if (!url) return undefined
  const match = url.match(/^chrome-extension:\/\/([^/]+)\//)
  return match?.[1]
}

async function loadExtensionHomePage(context: BrowserContext, extensionId: string) {
  const extensionUrl = `chrome-extension://${extensionId}/home.html`
  let page = context.pages().find(p => p.url().includes(extensionId))
  if (!page) {
    page = await context.newPage()
  }

  let lastError: unknown
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      await page.goto(extensionUrl, { waitUntil: 'domcontentloaded', timeout: 15000 })
    } catch (error) {
      lastError = error
    }

    const url = page.url()
    if (url.startsWith('chrome-extension://') && !url.startsWith('chrome-error://')) {
      return page
    }

    await page.waitForTimeout(1000)
  }

  const errorMessage = lastError instanceof Error ? lastError.message : 'Unknown error'
  throw new Error(`MetaMask extension page failed to load after multiple attempts: ${errorMessage}`)
}

const KNOWN_BLOCKED_EXTENSION_IDS = new Set(['aeoadlieeijfdbkhbbnnmjcjlpchefgb'])

const EXTENSION_EVENT_TIMEOUT_MS = 5000

async function getExtensionIdFromContext(context: BrowserContext) {
  // Check existing service workers
  for (const worker of context.serviceWorkers()) {
    const id = getExtensionIdFromUrl(worker.url())
    if (id && !KNOWN_BLOCKED_EXTENSION_IDS.has(id)) return id
  }

  // Check existing pages
  for (const page of context.pages()) {
    const id = getExtensionIdFromUrl(page.url())
    if (id && !KNOWN_BLOCKED_EXTENSION_IDS.has(id)) return id
  }

  // Wait for service worker event
  try {
    const worker = await context.waitForEvent('serviceworker', { timeout: EXTENSION_EVENT_TIMEOUT_MS })
    const id = getExtensionIdFromUrl(worker.url())
    if (id && !KNOWN_BLOCKED_EXTENSION_IDS.has(id)) return id
  } catch {
    // Continue to page fallback
  }

  // Wait for page event as fallback
  try {
    const page = await context.waitForEvent('page', { timeout: EXTENSION_EVENT_TIMEOUT_MS })
    const id = getExtensionIdFromUrl(page.url())
    if (id && !KNOWN_BLOCKED_EXTENSION_IDS.has(id)) return id
  } catch {
    // Extension not found
  }

  throw new Error('MetaMask extension ID not found - extension may not have loaded')
}

const EXTENSION_DISCOVERY_TIMEOUT_MS = 10000

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function getExtensionIdFromPreferences(
  contextPath: string,
  extensionPath: string,
  manifestName: string
) {
  const preferencesPath = path.join(contextPath, 'Default', 'Preferences')
  const normalizedExtensionPath = path.resolve(extensionPath)
  const expectedName = manifestName.toLowerCase()
  const deadline = Date.now() + EXTENSION_DISCOVERY_TIMEOUT_MS

  while (Date.now() < deadline) {
    if (await fs.exists(preferencesPath)) {
      try {
        const preferences = await fs.readJson(preferencesPath)
        const settings = preferences?.extensions?.settings
        if (settings && typeof settings === 'object') {
          for (const [extensionId, entry] of Object.entries(settings)) {
            if (!entry || typeof entry !== 'object') {
              continue
            }
            const entryPath = typeof (entry as { path?: string }).path === 'string'
              ? path.resolve((entry as { path: string }).path)
              : ''
            const entryManifestName = typeof (entry as { manifest?: { name?: string } }).manifest?.name === 'string'
              ? (entry as { manifest: { name: string } }).manifest.name.toLowerCase()
              : ''
            if (entryPath && entryPath === normalizedExtensionPath && !KNOWN_BLOCKED_EXTENSION_IDS.has(extensionId)) {
              return extensionId
            }
            if (entryManifestName && entryManifestName.includes(expectedName) && !KNOWN_BLOCKED_EXTENSION_IDS.has(extensionId)) {
              return extensionId
            }
          }
        }
      } catch {
        // Retry while Preferences is being written.
      }
    }
    await sleep(500)
  }

  return undefined
}

async function getExtensionIdFromInstalledExtensions(
  contextPath: string,
  manifestName: string
): Promise<string | undefined> {
  const extensionsRoot = path.join(contextPath, 'Default', 'Extensions')
  const expectedName = manifestName.toLowerCase()
  const deadline = Date.now() + EXTENSION_DISCOVERY_TIMEOUT_MS

  while (Date.now() < deadline) {
    if (!(await fs.pathExists(extensionsRoot))) {
      await sleep(500)
      continue
    }

    const extensionIds = await fs.readdir(extensionsRoot)
    for (const extensionId of extensionIds) {
      if (KNOWN_BLOCKED_EXTENSION_IDS.has(extensionId)) continue
      const extensionDir = path.join(extensionsRoot, extensionId)
      let versions: string[] = []
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
          const name = typeof manifest?.name === 'string' ? manifest.name.toLowerCase() : ''
          if (name.includes(expectedName)) {
            return extensionId
          }
        } catch {
          // ignore bad manifests
        }
      }
    }

    await sleep(500)
  }

  return undefined
}

export const metaMaskFixtures = (walletSetup: ReturnType<typeof defineWalletSetup>, slowMo = 0) => {
  return base.extend<MetaMaskFixtures>({
    _contextPath: async ({ browserName }, use, testInfo) => {
      const contextPath = await createTempContextDir(browserName, testInfo.testId)

      await use(contextPath)

      const error = await removeTempContextDir(contextPath)
      if (error) {
        console.error(error)
      }
    },
    context: async ({ context: currentContext, _contextPath }, use) => {
      const { walletPassword, hash } = walletSetup

      const cacheDirPath = path.join(process.cwd(), CACHE_DIR_NAME, hash)
      if (!(await fs.exists(cacheDirPath))) {
        throw new Error(`Cache for ${hash} does not exist. Create it first!`)
      }

      await fs.copy(cacheDirPath, _contextPath)

      const { extensionPath: metamaskPath, manifestName } = await prepareExtension()
      console.log(`[metamask] extension path: ${metamaskPath} (${manifestName})`)
      if (process.env.PW_CHANNEL) {
        console.log(`[metamask] using browser channel: ${process.env.PW_CHANNEL}`)
      }

      const browserArgs = [
        `--disable-extensions-except=${metamaskPath}`,
        `--load-extension=${metamaskPath}`,
        '--no-sandbox'
      ]

      if (process.env.HEADLESS) {
        browserArgs.push('--headless=new')
      }

      const context = await chromium.launchPersistentContext(_contextPath, {
        headless: false,
        channel: process.env.PW_CHANNEL as 'chrome' | 'chromium' | undefined,
        args: browserArgs,
        ignoreDefaultArgs: [
          '--disable-extensions',
          '--disable-component-extensions-with-background-pages',
          '--disable-extensions-except',
          '--enable-automation'
        ],
        slowMo: process.env.HEADLESS ? 0 : slowMo
      })

      // Give extension time to initialize
      await new Promise(r => setTimeout(r, 3000))

      const extensionIdFromDisk = await getExtensionIdFromInstalledExtensions(_contextPath, manifestName)
      const extensionIdFromPrefs = await getExtensionIdFromPreferences(_contextPath, metamaskPath, manifestName)
      const { cookies, origins } = await currentContext.storageState()

      if (cookies) {
        await context.addCookies(cookies)
      }
      if (origins && origins.length > 0) {
        await persistLocalStorage(origins, context)
      }

      const extensionId = extensionIdFromDisk ?? extensionIdFromPrefs ?? await getExtensionIdFromContext(context)
      console.log(`[metamask] resolved extension id: ${extensionId}`)

      _metamaskPage = await loadExtensionHomePage(context, extensionId)
      await _metamaskPage.waitForTimeout(1000)
      await unlockForFixture(_metamaskPage, walletPassword)

      await use(context)

      await context.close()
    },
    metamaskPage: async ({ context: _ }, use) => {
      await use(_metamaskPage)
    },
    extensionId: async ({ context }, use) => {
      const extensionId = await getExtensionIdFromContext(context)
      await use(extensionId)
    },
    metamask: async ({ context, extensionId }, use) => {
      const { walletPassword } = walletSetup
      const metamask = new MetaMask(context, _metamaskPage, walletPassword, extensionId)

      await use(metamask)
    }
  })
}
