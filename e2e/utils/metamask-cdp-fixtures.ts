import { chromium, type BrowserContext, type Page, test as base } from '@playwright/test'
import { MetaMask, unlockForFixture } from '@synthetixio/synpress-metamask/playwright'
import { defineWalletSetup } from '@synthetixio/synpress-cache'

type MetaMaskFixtures = {
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
  console.log('[MetaMask][CDP] Looking for extension ID...')
  console.log('[MetaMask][CDP] Service workers:', context.serviceWorkers().map(w => w.url()))
  console.log('[MetaMask][CDP] Pages:', context.pages().map(p => p.url()))

  for (const worker of context.serviceWorkers()) {
    const id = getExtensionIdFromUrl(worker.url())
    if (id) {
      console.log('[MetaMask][CDP] Found ID from service worker:', id)
      return id
    }
  }

  for (const page of context.pages()) {
    const id = getExtensionIdFromUrl(page.url())
    if (id) {
      console.log('[MetaMask][CDP] Found ID from page:', id)
      return id
    }
  }

  console.log('[MetaMask][CDP] Waiting for service worker event...')
  try {
    const worker = await context.waitForEvent('serviceworker', { timeout: 10000 })
    console.log('[MetaMask][CDP] Got service worker:', worker.url())
    const id = getExtensionIdFromUrl(worker.url())
    if (id) return id
  } catch (e) {
    console.log('[MetaMask][CDP] Service worker wait failed:', e)
  }

  console.log('[MetaMask][CDP] Waiting for page event...')
  try {
    const page = await context.waitForEvent('page', { timeout: 10000 })
    console.log('[MetaMask][CDP] Got page:', page.url())
    const id = getExtensionIdFromUrl(page.url())
    if (id) return id
  } catch (e) {
    console.log('[MetaMask][CDP] Page wait failed:', e)
  }

  throw new Error('MetaMask extension ID not found - extension may not have loaded')
}

export const metaMaskFixtures = (walletSetup: ReturnType<typeof defineWalletSetup>) => {
  return base.extend<MetaMaskFixtures>({
    context: async ({}, use) => {
      const cdpUrl = process.env.PW_CDP_URL || 'http://127.0.0.1:9222'
      console.log('[MetaMask][CDP] Connecting to:', cdpUrl)

      const browser = await chromium.connectOverCDP(cdpUrl)
      const context = browser.contexts()[0]

      if (!context) {
        throw new Error('[MetaMask][CDP] No browser context found from CDP')
      }

      await use(context)

      // Do not close the browser; it's managed externally.
      await browser.close()
    },
    metamaskPage: async ({ context }, use) => {
      const extensionId = await getExtensionIdFromContext(context)
      _metamaskPage = context.pages().find(p => p.url().includes(extensionId)) || context.pages()[0]

      if (!_metamaskPage) {
        _metamaskPage = await context.newPage()
      }

      await _metamaskPage.goto(`chrome-extension://${extensionId}/home.html`)
      await _metamaskPage.waitForLoadState('domcontentloaded')
      await _metamaskPage.waitForTimeout(1000)

      await use(_metamaskPage)
    },
    extensionId: async ({ context }, use) => {
      const extensionId = await getExtensionIdFromContext(context)
      await use(extensionId)
    },
    metamask: async ({ context, extensionId }, use) => {
      const { walletPassword } = walletSetup

      if (!_metamaskPage) {
        _metamaskPage = await context.newPage()
        await _metamaskPage.goto(`chrome-extension://${extensionId}/home.html`)
        await _metamaskPage.waitForLoadState('domcontentloaded')
        await _metamaskPage.waitForTimeout(1000)
      }

      await unlockForFixture(_metamaskPage, walletPassword)

      const metamask = new MetaMask(context, _metamaskPage, walletPassword, extensionId)
      await use(metamask)
    }
  })
}
