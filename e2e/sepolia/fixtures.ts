/**
 * Playwright Fixtures for Sepolia E2E Tests
 *
 * Provides a `sepoliaPage` fixture that:
 * 1. Exposes Node.js signing bridge functions
 * 2. Injects Sepolia mock provider (window.ethereum)
 * 3. Navigates to the app
 * 4. Connects via wagmi's real connect() + injected() connector
 */

import { test as base, type Page } from '@playwright/test'
import { setupBridge } from './wallet-bridge'
import { injectSepoliaProvider } from './sepolia-provider'
import { TIMEOUT, TEST_ADDRESS, SEPOLIA_CHAIN_ID } from './constants'

/**
 * Connect wallet using wagmi's real connect() with injected() connector.
 *
 * The app exposes window.__e2e = { config, connect, injected, ... } in dev mode.
 * The injected() connector automatically uses window.ethereum (our mock provider).
 * This goes through wagmi's normal state machine — no hacks needed.
 */
async function connectWallet(page: Page): Promise<boolean> {
  const connected = await page.evaluate(async ({ chainId }) => {
    // Wait for __e2e to be available (async import in main.tsx)
    let retries = 0
    while (!(window as any).__e2e && retries < 50) {
      await new Promise(r => setTimeout(r, 100))
      retries++
    }

    const e2e = (window as any).__e2e
    if (!e2e) {
      console.log('[E2E] __e2e not found after waiting')
      return false
    }

    const { config, connect, injected } = e2e

    try {
      // Use wagmi's real connect action with injected() connector
      // injected() creates a connector that uses window.ethereum
      const result = await connect(config, {
        connector: injected(),
        chainId,
      })
      console.log('[E2E] Wallet connected via wagmi connect():', result.accounts)
      return true
    } catch (err: any) {
      console.log('[E2E] Connect error:', err.message)
      return false
    }
  }, { chainId: SEPOLIA_CHAIN_ID })

  return connected
}

/**
 * Wait until the UI reflects a connected wallet.
 */
async function waitForWalletUI(page: Page, timeout = 10000): Promise<boolean> {
  try {
    await page.waitForFunction(
      (addr) => {
        const short = addr.slice(0, 6)
        return document.body.innerText.toLowerCase().includes(short.toLowerCase())
      },
      TEST_ADDRESS,
      { timeout }
    )
    return true
  } catch {
    return false
  }
}

// Extend Playwright test with sepoliaPage fixture
export const test = base.extend<{ sepoliaPage: Page }>({
  sepoliaPage: async ({ page }, use) => {
    // 1. Setup bridge (exposeFunction must be before goto)
    await setupBridge(page)

    // 2. Inject provider (addInitScript must be before goto)
    await injectSepoliaProvider(page)

    // 3. Handle alerts (app uses window.alert for success messages)
    page.on('dialog', async (dialog) => {
      console.log('[Fixture] Dialog:', dialog.type(), dialog.message())
      await dialog.accept()
    })

    // 4. Navigate to app
    await page.goto('/', { waitUntil: 'networkidle', timeout: TIMEOUT.PAGE_LOAD })
    await page.waitForTimeout(2000)

    // 5. Connect wallet via wagmi's real connect() + injected()
    const connected = await connectWallet(page)
    if (connected) {
      await waitForWalletUI(page)
    }

    // Provide the page to the test
    await use(page)
  },
})

export { expect } from '@playwright/test'
