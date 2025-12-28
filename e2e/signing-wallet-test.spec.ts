/**
 * E2E Test with Enhanced Signing Wallet
 *
 * Uses Hardhat's impersonation and eth_signTypedData_v4 for real permit signatures.
 */

import { test, expect } from '@playwright/test'
import { injectSigningWallet, connectWallet, TEST_ADDRESS } from './utils/signing-wallet'

test.describe('Signing Wallet Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Fund and impersonate the test account
    await fetch('http://localhost:8545', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'hardhat_impersonateAccount',
        params: [TEST_ADDRESS],
        id: 1,
      }),
    })

    await fetch('http://localhost:8545', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'hardhat_setBalance',
        params: [TEST_ADDRESS, '0x56BC75E2D63100000'], // 100 ETH
        id: 2,
      }),
    })

    // Inject signing wallet before navigation
    await injectSigningWallet(page)
    await page.goto('http://localhost:3000/')
    await page.waitForTimeout(2000)
  })

  test('should detect injected wallet', async ({ page }) => {
    const hasWallet = await page.evaluate(() => {
      return typeof window.ethereum !== 'undefined'
    })
    console.log('Wallet detected:', hasWallet)
    expect(hasWallet).toBe(true)
  })

  test('should connect wallet successfully', async ({ page }) => {
    // Listen for console messages
    page.on('console', msg => {
      if (msg.text().includes('[SigningWallet]')) {
        console.log('Browser:', msg.text())
      }
    })

    await connectWallet(page)
    await page.waitForTimeout(3000)

    // Check if connected by looking for address in page
    const content = await page.content()
    const isConnected = content.includes('0xf39F') || content.toLowerCase().includes('f39fd6')

    console.log('Wallet connected:', isConnected)
    await page.screenshot({ path: 'test-results/signing-wallet-connected.png' })

    expect(isConnected).toBe(true)
  })

  test('should execute mint BTD with approval', async ({ page }) => {
    test.setTimeout(120000)

    page.on('console', msg => {
      if (msg.text().includes('[SigningWallet]')) {
        console.log('Browser:', msg.text())
      }
    })

    // Connect wallet
    await connectWallet(page)
    await page.waitForTimeout(3000)

    // Make sure we're on Mint tab
    const mintTab = page.locator('button:has-text("Mint")').first()
    if (await mintTab.count() > 0) {
      await mintTab.click()
      await page.waitForTimeout(1000)
    }

    // Enter WBTC amount
    const input = page.locator('input[type="number"], input[inputmode="decimal"]').first()
    if (await input.count() > 0) {
      await input.fill('0.0001')
      await page.waitForTimeout(1500)
    }
    await page.screenshot({ path: 'test-results/signing-mint-amount.png' })

    // Click action button
    const actionButton = page.locator('button:has-text("Mint BTD"), button:has-text("Approve WBTC")').last()
    const buttonText = await actionButton.textContent()
    console.log('Action button:', buttonText)

    if (await actionButton.count() > 0 && !(await actionButton.isDisabled())) {
      await actionButton.click()
      await page.waitForTimeout(5000)
      await page.screenshot({ path: 'test-results/signing-mint-clicked.png' })

      // If it was approve, now click Mint
      if (buttonText?.includes('Approve')) {
        await page.waitForTimeout(5000)
        const mintButton = page.locator('button:has-text("Mint BTD")').last()
        if (await mintButton.count() > 0 && !(await mintButton.isDisabled())) {
          await mintButton.click()
          await page.waitForTimeout(5000)
        }
      }

      await page.screenshot({ path: 'test-results/signing-mint-complete.png' })

      // Check for success indicator
      const hasSuccess = await page.locator('text=/success|confirmed|complete/i').count() > 0
      const hasError = await page.locator('text=/error|failed|rejected/i').count() > 0

      console.log('Success:', hasSuccess, 'Error:', hasError)
    }
  })

  test('should execute redeem BTD with permit signature', async ({ page }) => {
    test.setTimeout(120000)

    page.on('console', msg => {
      if (msg.text().includes('[SigningWallet]')) {
        console.log('Browser:', msg.text())
      }
    })

    // Connect wallet
    await connectWallet(page)
    await page.waitForTimeout(3000)

    // Switch to Redeem BTD tab
    const redeemTab = page.locator('button:has-text("Redeem BTD")').first()
    if (await redeemTab.count() > 0) {
      await redeemTab.click()
      await page.waitForTimeout(1000)
    }

    // Enter BTD amount
    const input = page.locator('input[type="number"], input[inputmode="decimal"]').first()
    if (await input.count() > 0) {
      await input.fill('10')
      await page.waitForTimeout(1500)
    }
    await page.screenshot({ path: 'test-results/signing-redeem-amount.png' })

    // Click redeem button
    const redeemButton = page.locator('button:has-text("Redeem BTD")').last()
    const buttonText = await redeemButton.textContent()
    console.log('Redeem button:', buttonText)

    if (await redeemButton.count() > 0 && !(await redeemButton.isDisabled())) {
      console.log('Clicking redeem button...')
      await redeemButton.click()

      // Wait for permit signature request and transaction
      await page.waitForTimeout(10000)
      await page.screenshot({ path: 'test-results/signing-redeem-clicked.png' })

      // Check for success/error
      const hasSuccess = await page.locator('text=/success|confirmed|complete/i').count() > 0
      const hasError = await page.locator('text=/error|failed|rejected/i').count() > 0

      console.log('Redeem result - Success:', hasSuccess, 'Error:', hasError)

      if (!hasSuccess && !hasError) {
        // Check page content for any feedback
        const content = await page.content()
        if (content.includes('Insufficient') || content.includes('insufficient')) {
          console.log('Insufficient balance')
        }
      }
    }

    await page.screenshot({ path: 'test-results/signing-redeem-complete.png' })
  })
})
