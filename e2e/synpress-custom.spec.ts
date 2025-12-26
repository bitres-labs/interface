/**
 * Custom Synpress E2E Test with explicit extension loading
 */

import { test as base, expect, chromium, type BrowserContext, type Page } from '@playwright/test'
import path from 'node:path'
import fs from 'fs-extra'

// MetaMask extension path
const METAMASK_PATH = path.join(process.cwd(), '.cache-synpress', 'metamask-chrome-11.9.1')

// Wallet password (from wallet setup)
const WALLET_PASSWORD = 'Tester@1234'

function getExtensionIdFromUrl(url?: string) {
  if (!url) return undefined
  const match = url.match(/^chrome-extension:\/\/([^/]+)\//)
  return match?.[1]
}

async function getExtensionIdFromContext(context: BrowserContext) {
  for (const worker of context.serviceWorkers()) {
    const id = getExtensionIdFromUrl(worker.url())
    if (id) return id
  }

  for (const page of context.pages()) {
    const id = getExtensionIdFromUrl(page.url())
    if (id) return id
  }

  try {
    const worker = await context.waitForEvent('serviceworker', { timeout: 10000 })
    const id = getExtensionIdFromUrl(worker.url())
    if (id) return id
  } catch {
    // fall through
  }

  try {
    const page = await context.waitForEvent('page', { timeout: 10000 })
    const id = getExtensionIdFromUrl(page.url())
    if (id) return id
  } catch {
    // fall through
  }

  throw new Error('MetaMask extension ID not found - extension may not have loaded')
}

// Extend test to include custom fixtures
const test = base.extend<{
  extensionContext: BrowserContext
  extensionPage: Page
  appPage: Page
}>({
  extensionContext: async ({ }, use, testInfo) => {
    // Verify MetaMask extension exists
    if (!await fs.exists(METAMASK_PATH)) {
      throw new Error(`MetaMask extension not found at ${METAMASK_PATH}. Run 'npx synpress test/wallet-setup' first.`)
    }

    // Create a unique temporary user data directory for this test
    const userDataDir = path.join(process.cwd(), '.cache-synpress', `test-profile-${testInfo.testId}`)
    await fs.remove(userDataDir) // Remove if exists
    await fs.ensureDir(userDataDir)

    // Launch browser with extension loaded
    // Key: ignoreDefaultArgs to prevent --disable-extensions
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false, // Extensions don't work in headless mode
      channel: process.env.PW_CHANNEL as 'chrome' | 'chromium' | undefined,
      ignoreDefaultArgs: ['--disable-extensions', '--enable-automation'],
      args: [
        `--disable-extensions-except=${METAMASK_PATH}`,
        `--load-extension=${METAMASK_PATH}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--no-sandbox',
      ],
      viewport: { width: 1280, height: 720 },
    })

    await use(context)

    // Cleanup
    await context.close()
    await fs.remove(userDataDir)
  },

  extensionPage: async ({ extensionContext }, use) => {
    // Wait for MetaMask extension page to open
    await new Promise(resolve => setTimeout(resolve, 3000))

    const extensionId = await getExtensionIdFromContext(extensionContext)
    const pages = extensionContext.pages()
    console.log('Open pages:', pages.map(p => p.url()))

    let metamaskPage = pages.find(p => p.url().includes(extensionId))
    if (!metamaskPage) {
      metamaskPage = await extensionContext.newPage()
    }

    await metamaskPage.goto(`chrome-extension://${extensionId}/home.html`)
    await metamaskPage.waitForLoadState('domcontentloaded')

    await use(metamaskPage)
  },

  appPage: async ({ extensionContext }, use) => {
    const page = await extensionContext.newPage()
    await use(page)
  }
})

test.describe('Custom Synpress: MetaMask Tests', () => {
  test('should load MetaMask extension', async ({ extensionContext }) => {
    // Wait for pages to load
    await new Promise(resolve => setTimeout(resolve, 5000))

    const pages = extensionContext.pages()
    console.log('All pages:', pages.map(p => p.url()))

    // Check for extension page
    const hasExtension = pages.some(p => p.url().includes('chrome-extension://'))
    console.log('Has extension page:', hasExtension)

    // Take screenshot
    for (const page of pages) {
      if (page.url().includes('chrome-extension://')) {
        await page.screenshot({ path: 'test-results/metamask-loaded.png' })
      }
    }

    expect(hasExtension).toBe(true)
  })

  test('should detect extension in chrome management', async ({ extensionContext }) => {
    await new Promise(resolve => setTimeout(resolve, 3000))

    const page = await extensionContext.newPage()
    await page.goto('chrome://extensions')
    await page.waitForTimeout(2000)

    await page.screenshot({ path: 'test-results/chrome-extensions.png' })

    // Try to get extensions list
    const extensions = await page.evaluate(() => {
      // @ts-ignore
      return chrome.management?.getAll?.() || []
    })

    console.log('Detected extensions:', JSON.stringify(extensions, null, 2))

    await page.close()

    expect(extensions.length).toBeGreaterThan(0)
  })
})
