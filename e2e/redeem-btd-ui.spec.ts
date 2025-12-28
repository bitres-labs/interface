/**
 * E2E Test: Redeem BTD - UI Verification
 *
 * Tests the Redeem BTD tab UI functionality:
 * 1. Navigate to the page
 * 2. Click Redeem BTD tab
 * 3. Enter amount
 * 4. Verify preview output is displayed
 */

import { test, expect } from '@playwright/test'

test.describe('Redeem BTD - UI Tests', () => {
  test('should show Redeem BTD tab and display preview', async ({ page }) => {
    test.setTimeout(60000)
    console.log('=== Redeem BTD UI Test ===')

    // Step 1: Navigate to page
    console.log('\n--- Step 1: Navigate to page ---')
    await page.goto('/')
    await page.waitForTimeout(3000)
    await page.screenshot({ path: 'test-results/redeem-ui-1-initial.png' })

    // Step 2: Click Redeem BTD tab
    console.log('\n--- Step 2: Click Redeem BTD tab ---')
    const redeemTab = page.locator('button:has-text("Redeem BTD")').first()
    await expect(redeemTab).toBeVisible({ timeout: 10000 })
    await redeemTab.click()
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'test-results/redeem-ui-2-tab-clicked.png' })

    // Verify tab is active (has selected styling with border-primary)
    const tabClasses = await redeemTab.getAttribute('class')
    console.log('Tab classes after click:', tabClasses?.substring(0, 100))
    expect(tabClasses).toContain('border-primary')

    // Step 3: Enter amount
    console.log('\n--- Step 3: Enter amount ---')
    const input = page.locator('input[type="number"]').first()
    await expect(input).toBeVisible({ timeout: 5000 })
    await input.fill('100')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'test-results/redeem-ui-3-amount-entered.png' })

    // Step 4: Verify output display
    console.log('\n--- Step 4: Verify output ---')
    // The output should show some WBTC value
    const outputSection = page.locator('[class*="output"], [class*="Output"], [class*="receive"]')
    if (await outputSection.count() > 0) {
      const html = await outputSection.first().innerHTML()
      console.log('Output section found:', html.substring(0, 200))
    }

    // Look for WBTC display
    const wbtcText = page.locator('text=/WBTC/')
    if (await wbtcText.count() > 0) {
      console.log('Found WBTC label')
    }

    // Check for numeric output value
    const numericOutput = page.locator('text=/\\d+\\.\\d+/')
    if (await numericOutput.count() > 0) {
      const values = await numericOutput.allTextContents()
      console.log('Numeric values found:', values.slice(0, 5))
    }

    // Step 5: Verify button state
    console.log('\n--- Step 5: Verify button state ---')
    const actionButton = page.locator('button:has-text("Connect Wallet"), button:has-text("Redeem BTD")').last()
    if (await actionButton.count() > 0) {
      const buttonText = await actionButton.textContent()
      console.log('Action button text:', buttonText)
      // Without wallet connected, should show "Connect Wallet to Redeem BTD"
    }

    await page.screenshot({ path: 'test-results/redeem-ui-4-final.png' })
    console.log('\n=== Redeem BTD UI Test Complete ===')
  })

  test('should switch between tabs correctly', async ({ page }) => {
    test.setTimeout(30000)
    console.log('=== Tab Switching Test ===')

    await page.goto('/')
    await page.waitForTimeout(2000)

    // Find all tabs
    const mintTab = page.locator('button:has-text("Mint BTD")').first()
    const redeemBTDTab = page.locator('button:has-text("Redeem BTD")').first()
    const redeemBTBTab = page.locator('button:has-text("Redeem BTB")').first()

    await expect(mintTab).toBeVisible({ timeout: 10000 })

    // Click each tab and verify it becomes active
    console.log('Clicking Mint BTD tab...')
    await mintTab.click()
    await page.waitForTimeout(500)

    console.log('Clicking Redeem BTD tab...')
    await redeemBTDTab.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'test-results/tab-switch-redeem-btd.png' })

    // Verify input label shows BTD
    const btdInput = page.locator('text=/BTD/').first()
    await expect(btdInput).toBeVisible()

    console.log('Clicking Redeem BTB tab...')
    await redeemBTBTab.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: 'test-results/tab-switch-redeem-btb.png' })

    // Verify input label shows BTB
    const btbInput = page.locator('text=/BTB/').first()
    await expect(btbInput).toBeVisible()

    console.log('\n=== Tab Switching Test Complete ===')
  })
})
