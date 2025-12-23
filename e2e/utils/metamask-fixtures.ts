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

// Inline prepareExtension since it's not exported
async function prepareExtension(forceCache = true) {
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
  return unzipResult.outputPath
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

async function getExtensionIdFromContext(context: BrowserContext) {
  // Check existing service workers
  for (const worker of context.serviceWorkers()) {
    const id = getExtensionIdFromUrl(worker.url())
    if (id) return id
  }

  // Check existing pages
  for (const page of context.pages()) {
    const id = getExtensionIdFromUrl(page.url())
    if (id) return id
  }

  // Wait for service worker event
  try {
    const worker = await context.waitForEvent('serviceworker', { timeout: 10000 })
    const id = getExtensionIdFromUrl(worker.url())
    if (id) return id
  } catch {
    // Continue to page fallback
  }

  // Wait for page event as fallback
  try {
    const page = await context.waitForEvent('page', { timeout: 10000 })
    const id = getExtensionIdFromUrl(page.url())
    if (id) return id
  } catch {
    // Extension not found
  }

  throw new Error('MetaMask extension ID not found - extension may not have loaded')
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

      const metamaskPath = await prepareExtension()

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

      const { cookies, origins } = await currentContext.storageState()

      if (cookies) {
        await context.addCookies(cookies)
      }
      if (origins && origins.length > 0) {
        await persistLocalStorage(origins, context)
      }

      const extensionId = await getExtensionIdFromContext(context)

      _metamaskPage = context.pages()[0] as Page
      await _metamaskPage.goto(`chrome-extension://${extensionId}/home.html`)
      await _metamaskPage.waitForLoadState('domcontentloaded')
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
