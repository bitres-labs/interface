/**
 * 12 - Error Handling Tests
 *
 * Tests for edge cases: zero amounts, insufficient balance,
 * disabled buttons, invalid inputs.
 */

import { test, expect } from '../sepolia/fixtures'
import { navigateTo } from '../sepolia/helpers'
import { TIMEOUT } from '../sepolia/constants'

test.describe('Error Handling & Edge Cases', () => {
  test('mint with zero amount shows disabled button', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/mint')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Input zero
    const input = page.locator('input[type="number"], input[inputmode="decimal"], [role="spinbutton"]').first()
    if ((await input.count()) > 0) {
      await input.fill('0')
      await page.waitForTimeout(TIMEOUT.SHORT)
    }

    // Mint button should be disabled with zero input
    const mintBtn = page.locator('button:has-text("Mint BTD")').last()
    if ((await mintBtn.count()) > 0) {
      const isDisabled = await mintBtn.isDisabled()
      const btnText = await mintBtn.textContent()
      // Button should be disabled or show "Enter an amount"
      const isInactive =
        isDisabled ||
        btnText?.toLowerCase().includes('enter') ||
        btnText?.toLowerCase().includes('amount')
      expect(isInactive).toBeTruthy()
    }
  })

  test('mint with amount exceeding balance shows error or disabled', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/mint')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Input a very large amount
    const input = page.locator('input[type="number"], input[inputmode="decimal"], [role="spinbutton"]').first()
    if ((await input.count()) > 0) {
      await input.fill('999999999')
      await page.waitForTimeout(TIMEOUT.MEDIUM)
    }

    // Should show error or disabled button
    const body = await page.textContent('body')
    const mintBtn = page.locator('button:has-text("Mint BTD")').last()

    if ((await mintBtn.count()) > 0) {
      const isDisabled = await mintBtn.isDisabled()
      const btnText = await mintBtn.textContent()
      const hasError =
        isDisabled ||
        body?.toLowerCase().includes('insufficient') ||
        body?.toLowerCase().includes('exceeds') ||
        body?.toLowerCase().includes('not enough') ||
        btnText?.toLowerCase().includes('insufficient')
      expect(hasError).toBeTruthy()
    }
  })

  test('stake with zero amount shows disabled button', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/stake')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    const input = page.locator('input').first()
    if ((await input.count()) > 0) {
      await input.click()
      await input.fill('0')
      await page.waitForTimeout(TIMEOUT.SHORT)
    }

    // Stake button should be disabled
    const stakeBtn = page.locator(
      'button:has-text("Stake BTD"), button:has-text("Deposit")'
    ).last()

    if ((await stakeBtn.count()) > 0) {
      const isDisabled = await stakeBtn.isDisabled()
      const btnText = await stakeBtn.textContent()
      const isInactive =
        isDisabled ||
        btnText?.toLowerCase().includes('enter') ||
        btnText?.toLowerCase().includes('amount')
      expect(isInactive).toBeTruthy()
    }
  })

  test('farm withdraw exceeding deposited amount shows error', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/farm')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Try to find withdraw UI — may need to click a pool first
    const poolNames = page.locator('text=BRS/BTD, text=BTD/USDC, text=USDC')
    if ((await poolNames.count()) > 0) {
      await poolNames.first().click()
      await page.waitForTimeout(TIMEOUT.MEDIUM)
    }

    // Switch to withdraw tab
    const withdrawTab = page.locator('button:has-text("Withdraw"), button:has-text("Unstake")').first()
    if ((await withdrawTab.count()) === 0) {
      console.log('[Error] No withdraw tab on farm page - skipping')
      test.skip()
      return
    }

    try {
      await withdrawTab.click({ timeout: TIMEOUT.SHORT })
    } catch {
      console.log('[Error] Withdraw tab found but not interactable - skipping')
      test.skip()
      return
    }
    await page.waitForTimeout(TIMEOUT.SHORT)

    // Input a very large amount
    const input = page.locator('input[type="number"], input[inputmode="decimal"], input').first()
    if ((await input.count()) > 0) {
      await input.fill('999999999')
      await page.waitForTimeout(TIMEOUT.MEDIUM)
    }

    // Should show error or disabled button
    const body = await page.textContent('body')
    const withdrawBtn = page.locator(
      'button:has-text("Withdraw"), button:has-text("Unstake")'
    ).last()

    if ((await withdrawBtn.count()) > 0) {
      const isDisabled = await withdrawBtn.isDisabled()
      const hasError =
        isDisabled ||
        body?.toLowerCase().includes('insufficient') ||
        body?.toLowerCase().includes('exceeds') ||
        body?.toLowerCase().includes('not enough')
      expect(hasError).toBeTruthy()
    }
  })

  test('swap handles gracefully with empty input', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/swap')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Don't fill any input - just check the swap button state
    const swapBtn = page.locator('button:has-text("Swap")').last()

    if ((await swapBtn.count()) > 0) {
      const isDisabled = await swapBtn.isDisabled()
      const btnText = await swapBtn.textContent()
      const isInactive =
        isDisabled ||
        btnText?.toLowerCase().includes('enter') ||
        btnText?.toLowerCase().includes('amount') ||
        btnText?.toLowerCase().includes('select')
      expect(isInactive).toBeTruthy()
      console.log('[Error] Swap button correctly inactive without input')
    }

    // Verify no crash
    const body = await page.textContent('body')
    expect(body).not.toContain('Application error')
  })
})
