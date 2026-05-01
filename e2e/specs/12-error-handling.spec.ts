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
    const input = page
      .locator('input[type="number"], input[inputmode="decimal"], [role="spinbutton"]')
      .first()
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

  test('mint with amount exceeding balance shows error or disabled', async ({
    sepoliaPage: page,
  }) => {
    await navigateTo(page, '/mint')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Input a very large amount
    const input = page
      .locator('input[type="number"], input[inputmode="decimal"], [role="spinbutton"]')
      .first()
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
    const stakeBtn = page.locator('button:has-text("Stake BTD"), button:has-text("Deposit")').last()

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

    // Farm page shows pools with Deposit/Withdraw/Claim buttons directly
    // Input a very large amount in the first pool's input
    const input = page.locator('input[type="number"], input[inputmode="decimal"]').first()
    if ((await input.count()) === 0) {
      console.log('[Error] No input field on farm page - skipping')
      test.skip()
      return
    }

    await input.fill('999999999')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // The first Withdraw button should be disabled or show "Low Balance"
    const withdrawBtn = page.locator('button:has-text("Withdraw")').first()
    const body = await page.textContent('body')

    if ((await withdrawBtn.count()) > 0) {
      const isDisabled = await withdrawBtn.isDisabled()
      const btnText = await withdrawBtn.textContent()
      const hasError =
        isDisabled ||
        btnText?.includes('Low Balance') ||
        body?.toLowerCase().includes('insufficient') ||
        body?.toLowerCase().includes('exceeds') ||
        body?.toLowerCase().includes('low balance')
      console.log(`[Error] Withdraw button state: disabled=${isDisabled}, text="${btnText}"`)
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
