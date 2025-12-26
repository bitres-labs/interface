/**
 * Synpress E2E Test: Redeem BTD with OKX Wallet
 *
 * Uses Playwright to automate OKX extension for real transaction signing.
 */

import { metaMaskFixtures } from './utils/metamask-fixtures-router'
import { expect } from '@playwright/test'
import BasicSetup from '../test/wallet-setup/okx.setup'
import { connectWallet, isWalletConnected } from './utils/test-helpers'

// Create test instance with OKX fixtures
const test = metaMaskFixtures(BasicSetup, 0)

test.describe('Synpress: Redeem BTD with OKX Wallet', () => {
  test('should connect OKX wallet', async ({ page, metamask }) => {
    // Navigate to app
    await page.goto('http://localhost:3000/')
    await page.waitForTimeout(3000)

    // Connect wallet
    await connectWallet(page, metamask)

    const isConnected = await isWalletConnected(page)

    console.log('Wallet connected:', isConnected)
    await page.screenshot({ path: 'test-results/synpress-connected.png' })

    expect(isConnected).toBe(true)
  })

  test('should execute redeem BTD with permit signature', async ({ page, metamask }) => {
    test.setTimeout(90000)

    // Navigate and connect
    await page.goto('http://localhost:3000/')
    await page.waitForTimeout(3000)
    await connectWallet(page, metamask)
    await page.waitForTimeout(2000)

    // Switch to Redeem BTD tab
    const redeemTab = page.locator('button:has-text("Redeem BTD")').first()
    if (await redeemTab.count() > 0) {
      await redeemTab.click()
      await page.waitForTimeout(1000)
    }

    // Enter amount
    const input = page.locator('input[type="number"], input[inputmode="decimal"]').first()
    if (await input.count() > 0) {
      await input.fill('10')
      await page.waitForTimeout(1000)
    }
    await page.screenshot({ path: 'test-results/synpress-redeem-amount.png' })

    // Click redeem button
    const redeemButton = page.locator('button:has-text("Redeem BTD")').last()
    if (await redeemButton.count() > 0 && !(await redeemButton.isDisabled())) {
      await redeemButton.click()
      await page.waitForTimeout(2000)

      // MetaMask will popup for permit signature
      try {
        await metamask.confirmSignature()
        console.log('Permit signature approved')
        await page.waitForTimeout(3000)

        // After permit, transaction should be sent
        await metamask.confirmTransaction()
        console.log('Transaction confirmed')
        await page.waitForTimeout(5000)

        await page.screenshot({ path: 'test-results/synpress-redeem-complete.png' })
      } catch (e) {
        console.log('Signature/Transaction handling:', e)
        await page.screenshot({ path: 'test-results/synpress-redeem-error.png' })
      }
    }
  })

  test('should execute mint BTD flow', async ({ page, metamask }) => {
    test.setTimeout(90000)

    // Navigate and connect
    await page.goto('http://localhost:3000/')
    await page.waitForTimeout(3000)
    await connectWallet(page, metamask)
    await page.waitForTimeout(2000)

    // Should be on Mint tab by default
    const mintTab = page.locator('button:has-text("Mint")').first()
    await mintTab.click()
    await page.waitForTimeout(1000)

    // Enter WBTC amount
    const input = page.locator('input[type="number"], input[inputmode="decimal"]').first()
    if (await input.count() > 0) {
      await input.fill('0.001')
      await page.waitForTimeout(1000)
    }
    await page.screenshot({ path: 'test-results/synpress-mint-amount.png' })

    // Click mint button (might say Approve first)
    const actionButton = page.locator('button:has-text("Mint"), button:has-text("Approve")').last()
    if (await actionButton.count() > 0 && !(await actionButton.isDisabled())) {
      const buttonText = await actionButton.textContent()
      console.log('Action button:', buttonText)

      await actionButton.click()
      await page.waitForTimeout(2000)

      // Handle approval if needed
      if (buttonText?.includes('Approve')) {
        try {
          await metamask.confirmTransaction()
          console.log('Approval transaction confirmed')
          await page.waitForTimeout(5000)

          // Now click Mint button
          const mintButton = page.locator('button:has-text("Mint")').last()
          if (await mintButton.count() > 0) {
            await mintButton.click()
            await page.waitForTimeout(2000)
            await metamask.confirmTransaction()
            console.log('Mint transaction confirmed')
          }
        } catch (e) {
          console.log('Transaction handling:', e)
        }
      } else {
        try {
          await metamask.confirmTransaction()
          console.log('Mint transaction confirmed')
        } catch (e) {
          console.log('Transaction handling:', e)
        }
      }

      await page.waitForTimeout(5000)
      await page.screenshot({ path: 'test-results/synpress-mint-complete.png' })
    }
  })
})
