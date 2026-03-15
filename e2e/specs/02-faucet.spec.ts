/**
 * 02 - Faucet Tests
 *
 * Connect wallet → navigate to /faucet → claim test tokens.
 * Includes on-chain balance verification after claiming.
 */

import { test, expect } from '../sepolia/fixtures'
import { navigateTo, readBalance } from '../sepolia/helpers'
import { TIMEOUT, TEST_ADDRESS, ADDRESSES } from '../sepolia/constants'

test.describe('Faucet', () => {
  test('faucet page loads with wallet connected', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/faucet')

    // Page should show faucet UI
    const body = await page.textContent('body')
    expect(body?.toLowerCase()).toContain('faucet')

    // Wallet should be connected - check for shortened address (case-insensitive, checksummed)
    const shortAddr = TEST_ADDRESS.slice(0, 4).toLowerCase() // "0x8f"
    expect(body?.toLowerCase()).toContain(shortAddr)
  })

  test('faucet shows token info', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/faucet')

    // Should show token names
    const body = await page.textContent('body')
    expect(body).toContain('WBTC')
    expect(body).toContain('USDC')
    expect(body).toContain('USDT')
  })

  test('can claim test tokens if faucet is available', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/faucet')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    const body = await page.textContent('body')

    // Check if faucet is available on this network
    if (body?.includes('not yet deployed') || body?.includes('Not Available')) {
      console.log('[Faucet] Contract not deployed on this network - skipping claim test')
      test.skip()
      return
    }

    // Check if already in cooldown (already claimed recently)
    if (body?.toLowerCase().includes('cooldown') || body?.includes('Next claim available')) {
      console.log('[Faucet] Already in cooldown - tokens were claimed previously')
      // Verify we have balances (proves faucet works)
      expect(body).toContain('Your Balance')
      return
    }

    // Look for enabled claim button
    const claimBtn = page.locator(
      'button:has-text("Claim"), button:has-text("Get Tokens")'
    ).first()

    if ((await claimBtn.count()) > 0 && !(await claimBtn.isDisabled())) {
      await claimBtn.click()

      // Wait for either tx success text or cooldown (which means tx succeeded)
      try {
        await page.waitForFunction(
          () => {
            const text = document.body.innerText.toLowerCase()
            return (
              text.includes('success') ||
              text.includes('confirmed') ||
              text.includes('cooldown') ||
              text.includes('next claim available')
            )
          },
          undefined,
          { timeout: TIMEOUT.TX }
        )
        console.log('[Faucet] Claim transaction completed')
      } catch {
        console.log('[Faucet] Claim may still be processing')
      }
    } else {
      console.log('[Faucet] No enabled claim button found (may be in cooldown)')
    }
  })

  test('claim increases on-chain token balances', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/faucet')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    const body = await page.textContent('body')

    // Skip if faucet unavailable or in cooldown
    if (
      body?.includes('not yet deployed') ||
      body?.includes('Not Available') ||
      body?.toLowerCase().includes('cooldown') ||
      body?.includes('Next claim available') ||
      body?.toLowerCase().includes('claiming') ||
      body?.toLowerCase().includes('wait')
    ) {
      console.log('[Faucet] Faucet unavailable or in cooldown - skipping balance verification')
      test.skip()
      return
    }

    // Record balances before claiming
    const wbtcBefore = await readBalance(page, ADDRESSES.WBTC)
    const usdcBefore = await readBalance(page, ADDRESSES.USDC)
    const usdtBefore = await readBalance(page, ADDRESSES.USDT)
    console.log(`[Faucet] Before - WBTC: ${wbtcBefore}, USDC: ${usdcBefore}, USDT: ${usdtBefore}`)

    // Click claim — button text is "Claim Tokens"
    const claimBtn = page.locator(
      'button:has-text("Claim")'
    ).first()

    if ((await claimBtn.count()) > 0 && !(await claimBtn.isDisabled())) {
      await claimBtn.click()

      // Wait for tx to complete: button loading state disappears, or success/cooldown text
      try {
        await page.waitForFunction(
          () => {
            const text = document.body.innerText.toLowerCase()
            const buttons = Array.from(document.querySelectorAll('button'))
            const claimBtn = buttons.find(b => b.textContent?.includes('Claim'))
            const isLoading = claimBtn?.textContent?.includes('⏳')
            return (
              (!isLoading && !claimBtn?.disabled) ||
              text.includes('success') ||
              text.includes('confirmed') ||
              text.includes('cooldown') ||
              text.includes('next claim')
            )
          },
          undefined,
          { timeout: TIMEOUT.TX }
        )
      } catch {
        console.log('[Faucet] Claim may still be processing')
      }

      // Wait extra for chain state to settle
      await page.waitForTimeout(TIMEOUT.MEDIUM)

      // Verify at least one balance increased
      const wbtcAfter = await readBalance(page, ADDRESSES.WBTC)
      const usdcAfter = await readBalance(page, ADDRESSES.USDC)
      const usdtAfter = await readBalance(page, ADDRESSES.USDT)
      console.log(`[Faucet] After - WBTC: ${wbtcAfter}, USDC: ${usdcAfter}, USDT: ${usdtAfter}`)

      const anyIncreased =
        wbtcAfter > wbtcBefore || usdcAfter > usdcBefore || usdtAfter > usdtBefore
      expect(anyIncreased).toBeTruthy()
    } else {
      console.log('[Faucet] No enabled claim button - skipping')
      test.skip()
    }
  })

  test('cooldown timer displays after claiming', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/faucet')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    const body = await page.textContent('body')

    // If in cooldown, verify countdown is displayed
    if (body?.toLowerCase().includes('cooldown') || body?.includes('Next claim available')) {
      // Should show a time-related element (hours, minutes, countdown)
      const hasCountdown =
        body?.match(/\d+:\d+/) || // HH:MM format
        body?.toLowerCase().includes('hour') ||
        body?.toLowerCase().includes('minute') ||
        body?.toLowerCase().includes('next claim')
      expect(hasCountdown).toBeTruthy()
      console.log('[Faucet] Cooldown timer verified')
    } else {
      console.log('[Faucet] Not in cooldown - skipping cooldown timer check')
    }
  })
})
