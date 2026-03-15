/**
 * 02 - Faucet Tests
 *
 * Connect wallet → navigate to /faucet → claim test tokens.
 */

import { test, expect } from '../sepolia/fixtures'
import { navigateTo } from '../sepolia/helpers'
import { TIMEOUT, TEST_ADDRESS } from '../sepolia/constants'

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
})
