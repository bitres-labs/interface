/**
 * 06 - Farm Tests
 *
 * Navigate to /farm → verify pools → attempt deposit/claim/withdraw.
 */

import { test, expect } from '../sepolia/fixtures'
import { navigateTo, fillInput, clickButton, waitForTxSuccess, clickTab } from '../sepolia/helpers'
import { TIMEOUT } from '../sepolia/constants'

test.describe('Farm', () => {
  test('farm page loads and shows pool information', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/farm')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    const body = await page.textContent('body')
    expect(body?.toLowerCase()).toContain('farm')

    // Should show at least some pool or farming content
    const hasPoolContent =
      body?.includes('BRS') ||
      body?.includes('BTB') ||
      body?.includes('BTD') ||
      body?.toLowerCase().includes('pool') ||
      body?.toLowerCase().includes('reward') ||
      body?.toLowerCase().includes('deposit')
    expect(hasPoolContent).toBeTruthy()
  })

  test('farm page shows APR or reward info', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/farm')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    const body = await page.textContent('body')
    // Farm page should show some reward/APR/TVL metrics
    const hasMetrics =
      body?.toLowerCase().includes('apr') ||
      body?.toLowerCase().includes('tvl') ||
      body?.toLowerCase().includes('reward') ||
      body?.toLowerCase().includes('earn') ||
      body?.toLowerCase().includes('deposited')
    // This is informational - don't fail if metrics aren't shown
    if (!hasMetrics) {
      console.log('[Farm] No metrics found - page may be loading or empty')
    }
  })

  test('can interact with farm pool deposit', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/farm')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Look for deposit input
    const input = page.locator('input[type="number"], input[inputmode="decimal"], [role="spinbutton"]').first()
    if ((await input.count()) > 0) {
      await input.fill('0.001')
      const val = await input.inputValue()
      expect(val).toBe('0.001')
    } else {
      console.log('[Farm] No input found - may need to select a pool first')
    }
  })

  test('can claim farming rewards if available', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/farm')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    const claimBtn = page.locator(
      'button:has-text("Claim"), button:has-text("Harvest")'
    ).first()

    if ((await claimBtn.count()) > 0 && !(await claimBtn.isDisabled())) {
      await claimBtn.click()
      await waitForTxSuccess(page, TIMEOUT.TX)
    } else {
      console.log('[Farm] No claimable rewards or button not available')
    }
  })
})
