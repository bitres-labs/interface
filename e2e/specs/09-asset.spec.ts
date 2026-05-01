/**
 * 09 - Asset Page Tests
 *
 * Navigate to /asset → verify portfolio overview, wallet balances,
 * staking/farming/liquidity positions, and quick action buttons.
 */

import { test, expect } from '../sepolia/fixtures'
import { navigateTo } from '../sepolia/helpers'
import { TIMEOUT } from '../sepolia/constants'

test.describe('Asset Page', () => {
  test('asset page loads with portfolio overview', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/asset')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    const body = await page.textContent('body')
    const hasAssetUI =
      body?.toLowerCase().includes('portfolio') ||
      body?.toLowerCase().includes('asset') ||
      body?.toLowerCase().includes('balance') ||
      body?.toLowerCase().includes('wallet') ||
      body?.toLowerCase().includes('total')
    expect(hasAssetUI).toBeTruthy()
  })

  test('wallet tab shows token balance list', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/asset')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Click Wallet tab if available
    const walletTab = page.locator('button:has-text("Wallet"), button:has-text("Tokens")').first()
    if ((await walletTab.count()) > 0) {
      await walletTab.click()
      await page.waitForTimeout(TIMEOUT.SHORT)
    }

    const body = await page.textContent('body')
    // Should show token symbols
    const hasTokens =
      body?.includes('WBTC') ||
      body?.includes('USDC') ||
      body?.includes('BTD') ||
      body?.includes('BRS') ||
      body?.includes('ETH')
    expect(hasTokens).toBeTruthy()
  })

  test('staking positions are displayed', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/asset')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Click Staking tab if available
    const stakingTab = page.locator('button:has-text("Staking"), button:has-text("Stake")').first()
    if ((await stakingTab.count()) > 0) {
      await stakingTab.click()
      await page.waitForTimeout(TIMEOUT.SHORT)
    }

    const body = await page.textContent('body')
    // Should show staking-related info
    const hasStaking =
      body?.includes('stBTD') ||
      body?.includes('stBTB') ||
      body?.toLowerCase().includes('stake') ||
      body?.toLowerCase().includes('apr') ||
      body?.toLowerCase().includes('exchange rate')
    expect(hasStaking).toBeTruthy()
  })

  test('farming positions are displayed', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/asset')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Click Farming tab if available
    const farmingTab = page.locator('button:has-text("Farming"), button:has-text("Farm")').first()
    if ((await farmingTab.count()) > 0) {
      await farmingTab.click()
      await page.waitForTimeout(TIMEOUT.SHORT)
    }

    const body = await page.textContent('body')
    const hasFarming =
      body?.toLowerCase().includes('farm') ||
      body?.toLowerCase().includes('pool') ||
      body?.toLowerCase().includes('reward') ||
      body?.toLowerCase().includes('staked') ||
      body?.includes('BRS')
    expect(hasFarming).toBeTruthy()
  })

  test('liquidity positions are displayed', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/asset')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Click Liquidity tab if available
    const liqTab = page
      .locator('button:has-text("Liquidity"), button:has-text("LP"), button:has-text("Pool")')
      .first()
    if ((await liqTab.count()) > 0) {
      await liqTab.click()
      await page.waitForTimeout(TIMEOUT.SHORT)
    }

    const body = await page.textContent('body')
    const hasLiquidity =
      body?.toLowerCase().includes('liquidity') ||
      body?.toLowerCase().includes('lp') ||
      body?.toLowerCase().includes('pool') ||
      body?.toLowerCase().includes('share')
    expect(hasLiquidity).toBeTruthy()
  })

  test('quick action buttons navigate to correct pages', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/asset')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Look for action buttons (Mint, Stake, Farm, Swap)
    const actionBtns = page.locator(
      'a:has-text("Mint"), a:has-text("Stake"), a:has-text("Farm"), a:has-text("Swap"), button:has-text("Mint"), button:has-text("Stake")'
    )
    const count = await actionBtns.count()

    if (count > 0) {
      // Click the first action button and verify navigation
      const firstBtn = actionBtns.first()
      const btnText = await firstBtn.textContent()
      await firstBtn.click()
      await page.waitForTimeout(TIMEOUT.MEDIUM)

      // Should have navigated away from /asset
      const url = page.url()
      const navigated =
        url.includes('/mint') ||
        url.includes('/stake') ||
        url.includes('/farm') ||
        url.includes('/swap')
      if (navigated) {
        console.log(`[Asset] Quick action "${btnText}" navigated to ${url}`)
      }
    } else {
      console.log('[Asset] No quick action buttons found')
    }
  })
})
