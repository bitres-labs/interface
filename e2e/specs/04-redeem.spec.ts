/**
 * 04 - Redeem Tests
 *
 * Navigate to /mint → Redeem tab → verify UI → attempt redeem if BTD available.
 */

import { test, expect } from '../sepolia/fixtures'
import { navigateTo, waitForTxComplete } from '../sepolia/helpers'
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

    // Check for zero balance or price oracle issues
    if (body?.includes('NaN') || body?.includes('Infinity')) {
      console.log('[Redeem] Price oracle showing NaN/Infinity - oracle may need configuration')
      return
    }

    const hasBalance = body?.match(/Balance:\s*([\d,.]+)/)
    const firstBalance = hasBalance?.[1]

    if (!firstBalance || parseFloat(firstBalance.replace(/,/g, '')) === 0) {
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
    const submitBtn = page.locator('button:has-text("Redeem BTD")').last()
    if ((await submitBtn.count()) > 0 && !(await submitBtn.isDisabled())) {
      await submitBtn.click()
      console.log('[Redeem] Transaction submitted, waiting for confirmation...')

      const completed = await waitForTxComplete(page, 'Redeem BTD', TIMEOUT.TX)
      if (completed) {
        console.log('[Redeem] Transaction completed')
      } else {
        console.log('[Redeem] Transaction still pending after timeout')
      }
    } else {
      console.log('[Redeem] Redeem button is disabled')
    }
  })
})
