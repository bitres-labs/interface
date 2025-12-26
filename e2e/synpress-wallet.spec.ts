/**
 * Synpress E2E Test: Wallet Connection
 *
 * Tests for OKX wallet connection and disconnection
 */

import { metaMaskFixtures } from './utils/metamask-fixtures-router'
import { expect } from '@playwright/test'
import BasicSetup from '../test/wallet-setup/okx.setup'
import {
  connectWallet,
  isWalletConnected,
  navigateTo,
  takeScreenshot,
  WAIT
} from './utils/test-helpers'

const test = metaMaskFixtures(BasicSetup, 0)

test.describe('Wallet Connection', () => {
  test('should connect OKX wallet successfully', async ({ page, metamask }) => {
    await navigateTo(page, '/')
    const connectButton = page.locator('button:has-text("Connect Wallet")')
    expect(await connectButton.count()).toBeGreaterThan(0)
    expect(await connectButton.first().isVisible()).toBe(true)

    await connectWallet(page, metamask)

    const connected = await isWalletConnected(page)
    expect(connected).toBe(true)

    // Look for truncated address format (0x1234...5678)
    const addressPattern = /0x[a-fA-F0-9]{4}\.\.\.[a-fA-F0-9]{4}/
    const content = await page.content()
    const hasAddress = addressPattern.test(content)
    const showsWrongNetwork = /wrong network/i.test(content)
    expect(hasAddress || showsWrongNetwork).toBe(true)

    await takeScreenshot(page, 'wallet-connected')
  })
})
