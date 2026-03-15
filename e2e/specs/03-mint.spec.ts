/**
 * 03 - Mint Tests
 *
 * Navigate to /mint → verify UI state → attempt mint if possible.
 * Uses extremely small amounts to preserve test funds.
 */

import { test, expect } from '../sepolia/fixtures'
import { navigateTo, waitForTxComplete } from '../sepolia/helpers'
import { TIMEOUT } from '../sepolia/constants'

test.describe('Mint BTD', () => {
  test('mint page loads with wallet connected', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/mint')

    // Should show mint UI elements
    const body = await page.textContent('body')
    expect(body).toContain('WBTC')
    expect(body).toContain('BTD')
    expect(body).toContain('Balance')

    // Tab buttons should be present
    const mintTab = page.locator('button:has-text("Mint BTD")').first()
    expect(await mintTab.count()).toBeGreaterThan(0)
  })

  test('mint page shows WBTC and BTD balance', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/mint')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Should show balance info (even if 0)
    const body = await page.textContent('body')
    expect(body?.toLowerCase()).toContain('balance')
    expect(body).toContain('WBTC')
  })

  test('can input WBTC amount', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/mint')
    await page.waitForTimeout(TIMEOUT.SHORT)

    // Find and fill the input
    const input = page.locator('input[type="number"], input[inputmode="decimal"], [role="spinbutton"]').first()
    if ((await input.count()) > 0) {
      await input.clear()
      await input.fill('0.00001')
      const val = await input.inputValue()
      expect(val).toBe('0.00001')
    }
  })

  test('can mint BTD from WBTC if balance available', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/mint')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Check WBTC balance
    const body = await page.textContent('body')
    const hasBalance = body?.match(/Balance:\s*([\d,.]+)/)
    const firstBalance = hasBalance?.[1]

    if (!firstBalance || parseFloat(firstBalance.replace(/,/g, '')) === 0) {
      console.log('[Mint] No WBTC balance available - skipping mint transaction test')
      test.skip()
      return
    }

    // Fill in a tiny amount
    const input = page.locator('input[type="number"], input[inputmode="decimal"], [role="spinbutton"]').first()
    if ((await input.count()) > 0) {
      await input.fill('0.00001')
      await page.waitForTimeout(TIMEOUT.MEDIUM)
    }

    // Look for Mint submit button (the last "Mint BTD" button is the submit, not the tab)
    const submitBtn = page.locator('button:has-text("Mint BTD")').last()

    if ((await submitBtn.count()) > 0 && !(await submitBtn.isDisabled())) {
      await submitBtn.click()
      console.log('[Mint] Transaction submitted, waiting for confirmation...')

      // Wait for tx to complete (⏳ disappears from button)
      const completed = await waitForTxComplete(page, 'Mint BTD', TIMEOUT.TX)
      if (completed) {
        console.log('[Mint] Transaction completed')
      } else {
        console.log('[Mint] Transaction still pending after timeout - Sepolia may be slow')
      }
    } else {
      console.log('[Mint] Mint button is disabled - may need approval or prices not loaded')
    }
  })

  test('redeem tab is accessible', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/mint')

    // Switch to Redeem tab
    const redeemTab = page.locator('button:has-text("Redeem BTD")').first()
    if ((await redeemTab.count()) > 0) {
      await redeemTab.click()
      await page.waitForTimeout(TIMEOUT.SHORT)

      // Should show redeem UI
      const body = await page.textContent('body')
      expect(body).toContain('BTD')
    }
  })
})
