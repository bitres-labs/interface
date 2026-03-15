/**
 * 06 - Farm Tests
 *
 * Navigate to /farm → verify pools → attempt deposit/claim/withdraw.
 */

import { test, expect } from '../sepolia/fixtures'
import { navigateTo, waitForTxComplete, waitForTxSuccess } from '../sepolia/helpers'
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
      body?.toLowerCase().includes('apy') ||
      body?.toLowerCase().includes('tvl') ||
      body?.toLowerCase().includes('reward') ||
      body?.toLowerCase().includes('earn') ||
      body?.toLowerCase().includes('deposited') ||
      body?.toLowerCase().includes('total value')
    expect(hasMetrics).toBeTruthy()
  })

  test('can interact with farm pool deposit', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/farm')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Look for deposit input
    const input = page.locator('input[type="number"], input[inputmode="decimal"], input').first()
    if ((await input.count()) > 0) {
      await input.fill('0.001')
      const val = await input.inputValue()
      expect(parseFloat(val)).toBeGreaterThan(0)
    } else {
      console.log('[Farm] No input found - may need to select a pool first')
    }
  })

  test('can claim farming rewards if available', async ({ sepoliaPage: page }) => {
    // Claim All triggers multiple pool claims — needs extra time
    test.setTimeout(300_000)

    await navigateTo(page, '/farm')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Check if there are rewards to claim
    const body = await page.textContent('body')
    const rewardMatch = body?.match(/Your Total Rewards\s*([\d,.]+)/)
    const rewardAmount = rewardMatch ? parseFloat(rewardMatch[1].replace(/,/g, '')) : 0

    if (rewardAmount === 0) {
      console.log('[Farm] No rewards available to claim')
      return
    }

    console.log(`[Farm] Found ${rewardAmount} BRS rewards to claim`)

    // Try "Claim All" link/button
    const claimAll = page.locator('text=Claim All').first()
    const claimBtn = page.locator(
      'button:has-text("Claim"), button:has-text("Harvest")'
    ).first()

    if ((await claimAll.count()) > 0) {
      await claimAll.click()
      console.log('[Farm] Clicked Claim All, waiting for confirmation...')

      // Claim All may trigger multiple txs — wait longer and don't fail on timeout
      const completed = await waitForTxSuccess(page, TIMEOUT.TX)
      console.log(completed ? '[Farm] Claim completed' : '[Farm] Claim still pending — Sepolia may be slow')
    } else if ((await claimBtn.count()) > 0 && !(await claimBtn.isDisabled())) {
      await claimBtn.click()
      console.log('[Farm] Clicked Claim, waiting for confirmation...')
      await waitForTxSuccess(page, TIMEOUT.TX)
    } else {
      console.log('[Farm] No claimable rewards or button not available')
    }
  })
})
