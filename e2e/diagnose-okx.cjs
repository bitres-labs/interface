const path = require('node:path')
const fs = require('fs')
const os = require('node:os')
const https = require('node:https')
const { execFileSync } = require('node:child_process')
const { chromium } = require('@playwright/test')

const OKX_EXTENSION_ID = 'mcohilncbfahbmgdjkbpemcciiolgcge'

function download(url, destPath) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        return resolve(download(res.headers.location, destPath))
      }
      if (res.statusCode !== 200) {
        res.resume()
        return reject(new Error(`Download failed: ${res.statusCode} ${url}`))
      }
      const file = fs.createWriteStream(destPath)
      res.pipe(file)
      file.on('finish', () => file.close(resolve))
    })
    request.on('error', reject)
  })
}

function convertCrxToZip(crxPath, zipPath) {
  const buf = fs.readFileSync(crxPath)
  let offset = -1
  for (let i = 0; i < buf.length - 3; i += 1) {
    if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x03 && buf[i + 3] === 0x04) {
      offset = i
      break
    }
  }
  if (offset === -1) {
    throw new Error('ZIP header not found in CRX')
  }
  fs.writeFileSync(zipPath, buf.slice(offset))
}

function getExtensionIdFromUrl(url) {
  const match = url?.match(/^chrome-extension:\/\/([^/]+)\//)
  return match?.[1]
}

async function main() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'okx-diagnose-'))
  const crxPath = path.join(tmpRoot, 'okx.crx')
  const zipPath = path.join(tmpRoot, 'okx.zip')
  const extDir = path.join(tmpRoot, 'okx-extension')
  const profileDir = path.join(tmpRoot, 'okx-profile')

  const updateUrl = `https://clients2.google.com/service/update2/crx?response=redirect&acceptformat=crx2,crx3&prodversion=114.0.0.0&x=id%3D${OKX_EXTENSION_ID}%26uc`
  console.log('[diagnose] downloading OKX CRX...')
  await download(updateUrl, crxPath)
  console.log('[diagnose] CRX size:', fs.statSync(crxPath).size)
  convertCrxToZip(crxPath, zipPath)
  execFileSync('unzip', ['-q', zipPath, '-d', extDir])

  const manifestPath = path.join(extDir, 'manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  console.log('[diagnose] manifest_version:', manifest.manifest_version)
  console.log('[diagnose] name:', manifest.name)

  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${extDir}`,
      `--load-extension=${extDir}`,
      '--no-sandbox'
    ],
    ignoreDefaultArgs: [
      '--disable-extensions',
      '--disable-component-extensions-with-background-pages',
      '--disable-extensions-except',
      '--enable-automation'
    ]
  })

  await new Promise(r => setTimeout(r, 8000))

  const serviceWorkers = context.serviceWorkers().map(sw => sw.url())
  const pages = context.pages().map(p => p.url())
  console.log('[diagnose] service workers:', serviceWorkers)
  console.log('[diagnose] pages:', pages)

  const extensionIds = [
    ...serviceWorkers.map(getExtensionIdFromUrl),
    ...pages.map(getExtensionIdFromUrl)
  ].filter(Boolean)
  const uniqueIds = [...new Set(extensionIds)]
  console.log('[diagnose] extension ids from URLs:', uniqueIds)

  const prefsPath = path.join(profileDir, 'Default', 'Preferences')
  if (fs.existsSync(prefsPath)) {
    const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'))
    const keys = prefs?.extensions?.settings ? Object.keys(prefs.extensions.settings) : []
    console.log('[diagnose] Preferences extension keys:', keys)
  } else {
    console.log('[diagnose] Preferences not found:', prefsPath)
  }

  await context.close()

  if (!uniqueIds.length) {
    console.error('[diagnose] OKX extension did not register in profile.')
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('[diagnose] failed:', error)
  process.exit(1)
})
