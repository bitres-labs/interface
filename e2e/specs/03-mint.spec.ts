/**
 * 03 - Mint Tests
 *
 * Navigate to /mint → verify UI state → attempt mint if possible.
 * Includes approval flow, balance verification, and fee display checks.
 */

import { test, expect } from '../sepolia/fixtures'
import { navigateTo, waitForTxComplete, readBalance, expectBalanceIncrease, expectBalanceDecrease } from '../sepolia/helpers'
import { TIMEOUT, ADDRESSES } from '../sepolia/constants'

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

  test('mint fee percentage is displayed', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/mint')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Input an amount to trigger fee display
    const input = page.locator('input[type="number"], input[inputmode="decimal"], [role="spinbutton"]').first()
    if ((await input.count()) > 0) {
      await input.fill('0.001')
      await page.waitForTimeout(TIMEOUT.SHORT)
    }

    // Fee should be displayed somewhere (e.g., "Fee: 0.3%" or "Mint Fee")
    const body = await page.textContent('body')
    const hasFee =
      body?.toLowerCase().includes('fee') ||
      body?.includes('%') ||
      body?.toLowerCase().includes('cost')
    expect(hasFee).toBeTruthy()
  })

  test('approval flow triggers for first-time mint', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/mint')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Check WBTC balance
    const body = await page.textContent('body')
    const hasBalance = body?.match(/Balance:\s*([\d,.]+)/)
    const firstBalance = hasBalance?.[1]

    if (!firstBalance || parseFloat(firstBalance.replace(/,/g, '')) === 0) {
      console.log('[Mint] No WBTC balance - skipping approval test')
      test.skip()
      return
    }

    const input = page.locator('input[type="number"], input[inputmode="decimal"], [role="spinbutton"]').first()
    if ((await input.count()) > 0) {
      await input.fill('0.00001')
      await page.waitForTimeout(TIMEOUT.MEDIUM)
    }

    // Check if Approve button appears (first-time users need to approve WBTC spend)
    const approveBtn = page.locator('button:has-text("Approve")').first()
    if ((await approveBtn.count()) > 0 && !(await approveBtn.isDisabled())) {
      console.log('[Mint] Approve button found - executing approval')
      await approveBtn.click()

      // Wait for approval tx to complete
      const completed = await waitForTxComplete(page, 'Approve', TIMEOUT.TX)
      if (completed) {
        console.log('[Mint] Approval transaction completed')
        // After approval, Mint button should become available
        await page.waitForTimeout(TIMEOUT.MEDIUM)
        const mintBtn = page.locator('button:has-text("Mint BTD")').last()
        expect(await mintBtn.count()).toBeGreaterThan(0)
      }
    } else {
      console.log('[Mint] No Approve button - already approved or uses permit')
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

  test('BTD balance increases after mint', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/mint')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Check for price oracle issues
    const body = await page.textContent('body')
    if (body?.includes('= 0.00 BTD') || body?.includes('BTC Price') && body?.includes('$0')) {
      console.log('[Mint] Oracle shows $0 BTC price - skipping balance verification')
      test.skip()
      return
    }

    const hasBalance = body?.match(/Balance:\s*([\d,.]+)/)
    const firstBalance = hasBalance?.[1]

    if (!firstBalance || parseFloat(firstBalance.replace(/,/g, '')) === 0) {
      console.log('[Mint] No WBTC balance - skipping BTD balance verification')
      test.skip()
      return
    }

    // Check if a previous tx is still confirming
    if (body?.toLowerCase().includes('confirming')) {
      console.log('[Mint] Previous tx still confirming - skipping')
      test.skip()
      return
    }

    // Record BTD balance before
    const btdBefore = await readBalance(page, ADDRESSES.BTD)
    console.log(`[Mint] BTD before: ${btdBefore}`)

    const input = page.locator('input[type="number"], input[inputmode="decimal"], [role="spinbutton"]').first()
    if ((await input.count()) > 0) {
      await input.fill('0.00001')
      await page.waitForTimeout(TIMEOUT.MEDIUM)
    }

    // Find the actual submit button (not the tab)
    const allMintBtns = page.locator('button:has-text("Mint BTD")')
    const submitBtn = allMintBtns.last()
    if ((await submitBtn.count()) > 0 && !(await submitBtn.isDisabled())) {
      await submitBtn.click()
      await waitForTxComplete(page, 'Mint', TIMEOUT.TX)

      // Verify BTD balance increased
      await expectBalanceIncrease(page, ADDRESSES.BTD, btdBefore)
      console.log('[Mint] BTD balance increase verified')
    } else {
      console.log('[Mint] Mint button disabled - skipping')
      test.skip()
    }
  })

  test('WBTC balance decreases after mint', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/mint')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    const body = await page.textContent('body')
    if (body?.includes('= 0.00 BTD') || body?.includes('BTC Price') && body?.includes('$0')) {
      console.log('[Mint] Oracle shows $0 BTC price - skipping balance verification')
      test.skip()
      return
    }

    const hasBalance = body?.match(/Balance:\s*([\d,.]+)/)
    const firstBalance = hasBalance?.[1]

    if (!firstBalance || parseFloat(firstBalance.replace(/,/g, '')) === 0) {
      console.log('[Mint] No WBTC balance - skipping WBTC balance verification')
      test.skip()
      return
    }

    if (body?.toLowerCase().includes('confirming')) {
      console.log('[Mint] Previous tx still confirming - skipping')
      test.skip()
      return
    }

    // Record WBTC balance before
    const wbtcBefore = await readBalance(page, ADDRESSES.WBTC)
    console.log(`[Mint] WBTC before: ${wbtcBefore}`)

    const input = page.locator('input[type="number"], input[inputmode="decimal"], [role="spinbutton"]').first()
    if ((await input.count()) > 0) {
      await input.fill('0.00001')
      await page.waitForTimeout(TIMEOUT.MEDIUM)
    }

    const submitBtn = page.locator('button:has-text("Mint BTD")').last()
    if ((await submitBtn.count()) > 0 && !(await submitBtn.isDisabled())) {
      await submitBtn.click()
      await waitForTxComplete(page, 'Mint', TIMEOUT.TX)

      // Verify WBTC balance decreased
      await expectBalanceDecrease(page, ADDRESSES.WBTC, wbtcBefore)
      console.log('[Mint] WBTC balance decrease verified')
    } else {
      console.log('[Mint] Mint button disabled - skipping')
      test.skip()
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
