/**
 * Sepolia E2E Test: Mint BTD
 *
 * Tests minting BTD on Sepolia testnet via https://bitres.org
 *
 * Prerequisites:
 *   - OKX_SEED_PHRASE env var set with test wallet seed phrase
 *   - Test wallet has Sepolia ETH and WBTC
 *
 * Run:
 *   OKX_SEED_PHRASE="your seed phrase" npx playwright test e2e/sepolia-mint.spec.ts --headed
 */

import { metaMaskFixtures } from './utils/metamask-fixtures-router'
import { expect } from '@playwright/test'
import BasicSetup from '../test/wallet-setup/okx.setup'

const test = metaMaskFixtures(BasicSetup, 0)

const BASE_URL = 'https://bitres.org'

const WAIT = {
  SHORT: 1000,
  MEDIUM: 2000,
  LONG: 5000,
  TX: 10000,
}

test.describe('Sepolia Mint BTD', () => {
  test.beforeEach(async ({ page, metamask }) => {
    // Navigate to bitres.org
    await page.goto(BASE_URL)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(WAIT.MEDIUM)

    // Connect wallet
    const connectButton = page.locator('button:has-text("Connect Wallet")')
    if (await connectButton.count() > 0) {
      await connectButton.first().click()
      await page.waitForTimeout(WAIT.SHORT)

      // Select OKX wallet
      const okxOption = page.locator('button:has-text("OKX")')
      if (await okxOption.count() > 0) {
        await okxOption.first().click()
        await page.waitForTimeout(WAIT.SHORT)
        await metamask.connectToDapp()
        await page.waitForTimeout(WAIT.LONG)
      }
    }

    // Switch to Sepolia network if needed
    try {
      await metamask.approveNetworkChange()
      await page.waitForTimeout(WAIT.MEDIUM)
    } catch (e) {
      console.log('No network change needed or already on Sepolia')
    }

    // Click Mint tab
    const mintTab = page.locator('button:has-text("Mint")').first()
    if (await mintTab.count() > 0) {
      await mintTab.click()
      await page.waitForTimeout(WAIT.MEDIUM)
    }
  })

  test('should display Mint interface with prices', async ({ page }) => {
    // Check for WBTC input
    const wbtcLabel = page.locator('text=WBTC')
    expect(await wbtcLabel.count()).toBeGreaterThan(0)

    // Check for BTD output
    const btdLabel = page.locator('text=BTD')
    expect(await btdLabel.count()).toBeGreaterThan(0)

    // Check for price display (should show BTC price if TWAP is ready)
    const content = await page.content()
    const hasPriceInfo = content.includes('$') || content.includes('Price')
    console.log('Has price info:', hasPriceInfo)

    // Take screenshot
    await page.screenshot({ path: 'test-results/sepolia-mint-interface.png' })
  })

  test('should check button state when entering amount', async ({ page }) => {
    // Enter a small amount
    const input = page.locator('input[type="number"], input[inputmode="decimal"]').first()
    await input.fill('0.00001')
    await page.waitForTimeout(WAIT.MEDIUM)

    // Check button text
    const mintButton = page.locator('button:has-text("Mint BTD"), button:has-text("Mint")').last()
    const buttonText = await mintButton.textContent()
    console.log('Mint button text:', buttonText)

    const isDisabled = await mintButton.isDisabled()
    console.log('Button disabled:', isDisabled)

    // Take screenshot
    await page.screenshot({ path: 'test-results/sepolia-mint-with-amount.png' })

    // Log any error messages
    const errorMessages = page.locator('[class*="error"], [class*="warning"]')
    const errorCount = await errorMessages.count()
    if (errorCount > 0) {
      for (let i = 0; i < errorCount; i++) {
        const text = await errorMessages.nth(i).textContent()
        console.log('Error/Warning message:', text)
      }
    }
  })

  test('should attempt Mint BTD transaction', async ({ page, metamask }) => {
    test.setTimeout(120000)

    // Enter amount
    const input = page.locator('input[type="number"], input[inputmode="decimal"]').first()
    await input.fill('0.00001')
    await page.waitForTimeout(WAIT.MEDIUM)

    // Take screenshot before clicking
    await page.screenshot({ path: 'test-results/sepolia-mint-before-click.png' })

    // Click Mint button
    const mintButton = page.locator('button:has-text("Mint BTD"), button:has-text("Approve")').last()
    const buttonText = await mintButton.textContent()
    console.log('Clicking button:', buttonText)

    if (!(await mintButton.isDisabled())) {
      await mintButton.click()
      await page.waitForTimeout(WAIT.MEDIUM)

      // Take screenshot after clicking
      await page.screenshot({ path: 'test-results/sepolia-mint-after-click.png' })

      // Handle approve if needed
      try {
        console.log('Waiting for wallet approval...')
        await metamask.confirmTransaction()
        console.log('Wallet transaction confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('Wallet interaction result:', e)
      }

      // Check for success/error messages
      await page.waitForTimeout(WAIT.LONG)
      const content = await page.content()

      if (content.includes('success') || content.includes('Success')) {
        console.log('Transaction appears successful!')
      } else if (content.includes('error') || content.includes('Error') || content.includes('fail')) {
        console.log('Transaction may have failed')
        // Extract error message
        const errorEl = page.locator('[class*="error"], [class*="toast"], [role="alert"]')
        if (await errorEl.count() > 0) {
          const errorText = await errorEl.first().textContent()
          console.log('Error message:', errorText)
        }
      }

      // Take final screenshot
      await page.screenshot({ path: 'test-results/sepolia-mint-result.png' })
    } else {
      console.log('Mint button is disabled, cannot proceed')
      const disabledReason = await mintButton.textContent()
      console.log('Button shows:', disabledReason)
    }
  })

  test('should capture console errors', async ({ page }) => {
    const consoleErrors: string[] = []
    const consoleWarnings: string[] = []

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text())
      }
    })

    // Enter amount and wait
    const input = page.locator('input[type="number"], input[inputmode="decimal"]').first()
    await input.fill('0.00001')
    await page.waitForTimeout(WAIT.LONG)

    console.log('Console errors:', consoleErrors.length)
    consoleErrors.forEach(err => console.log('  -', err.slice(0, 200)))

    console.log('Console warnings:', consoleWarnings.length)
    consoleWarnings.forEach(warn => console.log('  -', warn.slice(0, 200)))
  })
})
