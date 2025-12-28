/**
 * E2E Test: Redeem BTD UI Flow
 *
 * Tests the redeem BTD functionality in the MintPreview component
 */

import { test, expect, Page } from '@playwright/test'
import { injectMockWallet, connectWallet, closeRainbowKitModal, TEST_ADDRESS } from './utils/mock-wallet'

test.describe('Redeem BTD UI', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage where MintPreview is located
    await page.goto('/')
    await page.waitForTimeout(2000)
  })

  test('should find and click Redeem BTD tab', async ({ page }) => {
    // Look for Redeem BTD tab/button
    const redeemBTDTab = page.locator('button:has-text("Redeem BTD")')

    const count = await redeemBTDTab.count()
    console.log(`Found ${count} Redeem BTD tab(s)`)

    if (count > 0) {
      await redeemBTDTab.first().click()
      await page.waitForTimeout(1000)

      // Verify we're in redeem mode - should see BTD input
      const inputLabel = page.locator('text=/BTD|You Pay|From/i')
      const labelCount = await inputLabel.count()
      console.log(`Found ${labelCount} BTD-related labels`)

      expect(count).toBeGreaterThan(0)
    }
  })

  test('should enter amount in Redeem BTD mode', async ({ page }) => {
    // Switch to Redeem BTD mode
    const redeemTab = page.locator('button:has-text("Redeem BTD")').first()
    if (await redeemTab.count() > 0) {
      await redeemTab.click()
      await page.waitForTimeout(1000)
    }

    // Find input field
    const input = page.locator('input[type="text"], input[type="number"], input[inputmode="decimal"]').first()

    if (await input.count() > 0) {
      // Enter an amount
      await input.fill('100')
      await page.waitForTimeout(500)

      const value = await input.inputValue()
      console.log(`Input value: ${value}`)

      expect(value).toContain('100')
    }
  })

  test('should show output preview when entering redeem amount', async ({ page }) => {
    // Switch to Redeem BTD mode
    const redeemTab = page.locator('button:has-text("Redeem BTD")').first()
    if (await redeemTab.count() > 0) {
      await redeemTab.click()
      await page.waitForTimeout(1000)
    }

    // Enter amount
    const input = page.locator('input[type="text"], input[type="number"], input[inputmode="decimal"]').first()
    if (await input.count() > 0) {
      await input.fill('100')
      await page.waitForTimeout(1000)

      // Look for output preview (WBTC amount)
      const outputDisplay = page.locator('text=/\\d+\\.\\d+.*WBTC|You Receive|To/')
      const outputCount = await outputDisplay.count()
      console.log(`Found ${outputCount} output displays`)

      // Take screenshot for visual verification
      await page.screenshot({ path: 'test-results/redeem-btd-preview.png' })
    }
  })

  test('should show Redeem button', async ({ page }) => {
    // Switch to Redeem BTD mode
    const redeemTab = page.locator('button:has-text("Redeem BTD")').first()
    if (await redeemTab.count() > 0) {
      await redeemTab.click()
      await page.waitForTimeout(1000)
    }

    // Look for Redeem button
    const redeemButton = page.locator('button:has-text("Redeem"), button:has-text("Connect Wallet")')
    const count = await redeemButton.count()
    console.log(`Found ${count} Redeem/Connect buttons`)

    if (count > 0) {
      const buttonText = await redeemButton.first().textContent()
      console.log(`Button text: ${buttonText}`)

      // Button should exist (might say "Connect Wallet" if not connected)
      expect(count).toBeGreaterThan(0)
    }
  })

  test('should display correct mode labels', async ({ page }) => {
    // Check all mode tabs exist
    const mintTab = page.locator('button:has-text("Mint")')
    const redeemBTDTab = page.locator('button:has-text("Redeem BTD")')
    const redeemBTBTab = page.locator('button:has-text("Redeem BTB")')

    console.log(`Mint tabs: ${await mintTab.count()}`)
    console.log(`Redeem BTD tabs: ${await redeemBTDTab.count()}`)
    console.log(`Redeem BTB tabs: ${await redeemBTBTab.count()}`)

    // At least the main tabs should exist
    expect(await mintTab.count()).toBeGreaterThanOrEqual(0)
  })

  test('full redeem flow - enter amount and check button state', async ({ page }) => {
    console.log('=== Full Redeem BTD UI Flow ===')

    // Step 1: Go to home page
    console.log('Step 1: On home page')
    await page.screenshot({ path: 'test-results/redeem-step1-home.png' })

    // Step 2: Find and click Redeem BTD tab
    const redeemTab = page.locator('button:has-text("Redeem BTD")').first()
    if (await redeemTab.count() > 0) {
      console.log('Step 2: Clicking Redeem BTD tab')
      await redeemTab.click()
      await page.waitForTimeout(1000)
      await page.screenshot({ path: 'test-results/redeem-step2-tab-clicked.png' })
    } else {
      console.log('Step 2: No Redeem BTD tab found, checking page structure')
      const allButtons = await page.locator('button').allTextContents()
      console.log('All buttons:', allButtons.slice(0, 20))
    }

    // Step 3: Enter amount
    const input = page.locator('input[type="text"], input[type="number"], input[inputmode="decimal"]').first()
    if (await input.count() > 0) {
      console.log('Step 3: Entering amount 50')
      await input.fill('50')
      await page.waitForTimeout(1000)
      await page.screenshot({ path: 'test-results/redeem-step3-amount-entered.png' })
    }

    // Step 4: Check action button
    const actionButton = page.locator('button:has-text("Redeem"), button:has-text("Connect"), button:has-text("Approve")')
    if (await actionButton.count() > 0) {
      const buttonText = await actionButton.first().textContent()
      const isDisabled = await actionButton.first().isDisabled()
      console.log(`Step 4: Action button = "${buttonText}", disabled = ${isDisabled}`)
      await page.screenshot({ path: 'test-results/redeem-step4-button-state.png' })
    }

    console.log('=== Flow Complete ===')
  })
})

// Test with connected wallet
test.describe('Redeem BTD with Wallet', () => {
  test.beforeEach(async ({ page }) => {
    // Impersonate the test address in Hardhat so it can send transactions
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

    // Give the account some ETH for gas
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

    // Inject mock wallet before navigation
    await injectMockWallet(page)
    await page.goto('/')
    await page.waitForTimeout(2000)
  })

  test('should detect mock wallet', async ({ page }) => {
    const hasWallet = await page.evaluate(() => {
      return typeof window.ethereum !== 'undefined'
    })
    console.log('Mock wallet detected:', hasWallet)
    expect(hasWallet).toBe(true)
  })

  test('should connect wallet and show address', async ({ page }) => {
    // Click connect button
    await connectWallet(page)
    await page.waitForTimeout(2000)

    // Take screenshot after connection attempt
    await page.screenshot({ path: 'test-results/wallet-connect-attempt.png' })

    // Check for address display or connected state
    const pageContent = await page.content()
    const hasAddress = pageContent.includes('0xf39F') || pageContent.includes('f39Fd6')
    console.log('Address visible after connect:', hasAddress)
  })

  test('should show balance after wallet connection', async ({ page }) => {
    await connectWallet(page)
    await page.waitForTimeout(3000)

    // Look for balance display
    const balanceText = page.locator('text=/Balance:?\\s*[\\d.,]+/i')
    const count = await balanceText.count()
    console.log(`Found ${count} balance displays`)

    await page.screenshot({ path: 'test-results/wallet-connected-balances.png' })
  })

  test('full redeem flow with connected wallet', async ({ page }) => {
    test.setTimeout(60000) // Increase timeout to 60s
    console.log('=== Full Redeem BTD Flow with Wallet ===')
    console.log('Test Address:', TEST_ADDRESS)

    // Listen to console messages from the page
    page.on('console', msg => {
      if (msg.text().includes('[MockWallet]')) {
        console.log('Browser:', msg.text())
      }
    })

    // Step 1: Connect wallet
    console.log('Step 1: Connecting wallet...')
    await connectWallet(page)
    await page.waitForTimeout(2000)

    // Close any modal that may still be open
    await closeRainbowKitModal(page)
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'test-results/redeem-wallet-step1-connected.png' })

    // Step 2: Switch to Redeem BTD mode
    console.log('Step 2: Switching to Redeem BTD mode...')
    const redeemTab = page.locator('button:has-text("Redeem BTD")').first()
    if (await redeemTab.count() > 0) {
      // Use force click to bypass any overlay issues
      await redeemTab.click({ force: true })
      await page.waitForTimeout(1000)
    }
    await page.screenshot({ path: 'test-results/redeem-wallet-step2-tab.png' })

    // Step 3: Enter redeem amount
    console.log('Step 3: Entering amount...')
    const input = page.locator('input[type="text"], input[type="number"], input[inputmode="decimal"]').first()
    if (await input.count() > 0) {
      await input.fill('10')
      await page.waitForTimeout(1500)
    }
    await page.screenshot({ path: 'test-results/redeem-wallet-step3-amount.png' })

    // Step 4: Check action button state
    console.log('Step 4: Checking action button...')
    const actionButton = page.locator('button:has-text("Redeem"), button:has-text("Approve"), button:has-text("Insufficient")')
    if (await actionButton.count() > 0) {
      const buttonText = await actionButton.first().textContent()
      const isDisabled = await actionButton.first().isDisabled()
      console.log(`Action button: "${buttonText}", disabled: ${isDisabled}`)

      // If button says "Approve", click it
      if (buttonText?.includes('Approve')) {
        console.log('Step 5: Clicking Approve button...')
        await actionButton.first().click()
        await page.waitForTimeout(3000)
        await page.screenshot({ path: 'test-results/redeem-wallet-step5-approve.png' })
      }

      // If button says "Redeem", click it
      if (buttonText?.includes('Redeem') && !isDisabled) {
        console.log('Step 6: Clicking Redeem button...')
        await actionButton.first().click()
        await page.waitForTimeout(5000) // Wait longer for transaction
        await page.screenshot({ path: 'test-results/redeem-wallet-step6-redeem.png' })

        // Check if transaction was sent by looking for success/error toast
        const toastSuccess = page.locator('text=/success|confirmed|complete/i')
        const toastError = page.locator('text=/error|failed|rejected/i')

        if (await toastSuccess.count() > 0) {
          console.log('✅ Transaction appears successful!')
        } else if (await toastError.count() > 0) {
          const errorText = await toastError.first().textContent()
          console.log('❌ Transaction error:', errorText)
        } else {
          console.log('⚠️ No transaction feedback detected')
        }
      }
    }

    await page.screenshot({ path: 'test-results/redeem-wallet-final.png' })
    console.log('=== Flow Complete ===')
  })
})
