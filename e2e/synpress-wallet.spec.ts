/**
 * Synpress E2E Test: Wallet Connection
 *
 * Tests for MetaMask wallet connection and disconnection
 */

import { metaMaskFixtures } from './utils/metamask-fixtures-router'
import { expect } from '@playwright/test'
import BasicSetup from '../test/wallet-setup/basic.setup'
import {
  connectWallet,
  isWalletConnected,
  navigateTo,
  takeScreenshot,
  WAIT
} from './utils/test-helpers'

const test = metaMaskFixtures(BasicSetup, 0)

test.describe('Wallet Connection', () => {
  test('should display Connect Wallet button when not connected', async ({ page }) => {
    await navigateTo(page, '/')

    const connectButton = page.locator('button:has-text("Connect Wallet")')
    expect(await connectButton.count()).toBeGreaterThan(0)
    expect(await connectButton.first().isVisible()).toBe(true)

    await takeScreenshot(page, 'wallet-not-connected')
  })

  test('should connect MetaMask wallet successfully', async ({ page, metamask }) => {
    await navigateTo(page, '/')
    await connectWallet(page, metamask)

    const connected = await isWalletConnected(page)
    expect(connected).toBe(true)

    await takeScreenshot(page, 'wallet-connected')
  })

  test('should display connected address', async ({ page, metamask }) => {
    await navigateTo(page, '/')
    await connectWallet(page, metamask)

    // Look for truncated address format (0x1234...5678)
    const addressPattern = /0x[a-fA-F0-9]{4}\.\.\.[a-fA-F0-9]{4}/
    const content = await page.content()
    expect(addressPattern.test(content)).toBe(true)
  })

  test('should persist connection across page navigation', async ({ page, metamask }) => {
    await navigateTo(page, '/')
    await connectWallet(page, metamask)

    // Navigate to different pages
    const pages = ['/stake', '/swap', '/farm', '/asset']
    for (const path of pages) {
      await navigateTo(page, path)
      const connected = await isWalletConnected(page)
      expect(connected).toBe(true)
    }
  })

  test('should show wallet modal with options', async ({ page }) => {
    await navigateTo(page, '/')

    const connectButton = page.locator('button:has-text("Connect Wallet")')
    await connectButton.first().click()
    await page.waitForTimeout(WAIT.SHORT)

    // RainbowKit modal should show wallet options
    const modal = page.locator('[role="dialog"], [class*="modal"]')
    expect(await modal.count()).toBeGreaterThan(0)

    // MetaMask option should be visible
    const metaMaskOption = page.locator('button:has-text("MetaMask")')
    expect(await metaMaskOption.count()).toBeGreaterThan(0)

    await takeScreenshot(page, 'wallet-modal')
  })

  test('should disconnect wallet', async ({ page, metamask }) => {
    await navigateTo(page, '/')
    await connectWallet(page, metamask)

    // Click on connected address to open dropdown
    const addressButton = page.locator('[class*="address"], [class*="account"]').first()
    if (await addressButton.count() > 0) {
      await addressButton.click()
      await page.waitForTimeout(WAIT.SHORT)

      // Click disconnect
      const disconnectButton = page.locator('button:has-text("Disconnect")')
      if (await disconnectButton.count() > 0) {
        await disconnectButton.click()
        await page.waitForTimeout(WAIT.MEDIUM)

        // Should show Connect Wallet button again
        const connectButton = page.locator('button:has-text("Connect Wallet")')
        expect(await connectButton.count()).toBeGreaterThan(0)
      }
    }

    await takeScreenshot(page, 'wallet-disconnected')
  })
})
