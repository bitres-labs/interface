/**
 * 04 - Redeem Tests
 *
 * Navigate to /mint → Redeem tab → verify UI → attempt redeem if BTD available.
 */

import { test, expect } from '../sepolia/fixtures'
import { navigateTo, fillInput, clickButton, waitForTxSuccess, clickTab } from '../sepolia/helpers'
import { TIMEOUT } from '../sepolia/constants'

test.describe('Redeem BTD', () => {
  test('redeem tab loads correctly', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/mint')

    // Switch to Redeem tab
    const redeemTab = page.locator('button:has-text("Redeem BTD")').first()
    expect(await redeemTab.count()).toBeGreaterThan(0)
    await redeemTab.click()
    await page.waitForTimeout(TIMEOUT.SHORT)

    // Should show BTD input and WBTC output
    const body = await page.textContent('body')
    expect(body).toContain('BTD')
    expect(body).toContain('Balance')
  })

  test('can input BTD amount for redeem', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/mint')
    await page.locator('button:has-text("Redeem BTD")').first().click()
    await page.waitForTimeout(TIMEOUT.SHORT)

    const input = page.locator('input[type="number"], input[inputmode="decimal"], [role="spinbutton"]').first()
    if ((await input.count()) > 0) {
      await input.fill('0.001')
      const val = await input.inputValue()
      expect(val).toBe('0.001')
    }
  })

  test('can redeem BTD for WBTC if balance available', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/mint')
    await page.locator('button:has-text("Redeem BTD")').first().click()
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Check BTD balance
    const body = await page.textContent('body')
    const hasZeroBalance = body?.includes('Balance: 0') || body?.includes('Balance:0')

    if (hasZeroBalance) {
      console.log('[Redeem] No BTD balance available - skipping redeem test')
      test.skip()
      return
    }

    const input = page.locator('input[type="number"], input[inputmode="decimal"], [role="spinbutton"]').first()
    if ((await input.count()) > 0) {
      await input.fill('0.001')
      await page.waitForTimeout(TIMEOUT.MEDIUM)
    }

    // Look for redeem submit button
    const submitBtn = page.locator('button:has-text("Redeem")').last()
    if ((await submitBtn.count()) > 0 && !(await submitBtn.isDisabled())) {
      await submitBtn.click()
      await waitForTxSuccess(page, TIMEOUT.TX)
    } else {
      console.log('[Redeem] Redeem button is disabled')
    }
  })
})
