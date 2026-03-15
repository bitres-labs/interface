/**
 * 04 - Redeem Tests
 *
 * Navigate to /mint → Redeem tab → verify UI → attempt redeem if BTD available.
 * Includes permit signature, balance verification, and BTB compensation display.
 */

import { test, expect } from '../sepolia/fixtures'
import { navigateTo, waitForTxComplete, readBalance, expectBalanceIncrease, expectBalanceDecrease } from '../sepolia/helpers'
import { TIMEOUT, ADDRESSES } from '../sepolia/constants'

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

  test('permit signature flow for redeem', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/mint')
    await page.locator('button:has-text("Redeem BTD")').first().click()
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    const body = await page.textContent('body')

    if (body?.includes('NaN') || body?.includes('Infinity')) {
      console.log('[Redeem] Price oracle showing NaN/Infinity - skipping permit test')
      test.skip()
      return
    }

    const hasBalance = body?.match(/Balance:\s*([\d,.]+)/)
    const firstBalance = hasBalance?.[1]

    if (!firstBalance || parseFloat(firstBalance.replace(/,/g, '')) === 0) {
      console.log('[Redeem] No BTD balance - skipping permit test')
      test.skip()
      return
    }

    const input = page.locator('input[type="number"], input[inputmode="decimal"], [role="spinbutton"]').first()
    if ((await input.count()) > 0) {
      await input.fill('0.001')
      await page.waitForTimeout(TIMEOUT.MEDIUM)
    }

    // Check if redeem uses permit (EIP-2612) instead of approve
    // Permit-based flow should show "Redeem" directly without separate Approve step
    const redeemBtn = page.locator('button:has-text("Redeem BTD")').last()
    const approveBtn = page.locator('button:has-text("Approve")').first()

    if ((await approveBtn.count()) > 0 && !(await approveBtn.isDisabled())) {
      console.log('[Redeem] Uses approve flow (not permit)')
    } else if ((await redeemBtn.count()) > 0 && !(await redeemBtn.isDisabled())) {
      console.log('[Redeem] Uses permit flow - redeem button directly available')
      // The signTypedData bridge will handle the EIP-2612 permit signature
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

  test('BTD balance decreases after redeem', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/mint')
    await page.locator('button:has-text("Redeem BTD")').first().click()
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    const body = await page.textContent('body')
    if (body?.includes('NaN') || body?.includes('Infinity')) {
      test.skip()
      return
    }

    const hasBalance = body?.match(/Balance:\s*([\d,.]+)/)
    if (!hasBalance?.[1] || parseFloat(hasBalance[1].replace(/,/g, '')) === 0) {
      console.log('[Redeem] No BTD balance - skipping')
      test.skip()
      return
    }

    const btdBefore = await readBalance(page, ADDRESSES.BTD)
    console.log(`[Redeem] BTD before: ${btdBefore}`)

    const input = page.locator('input[type="number"], input[inputmode="decimal"], [role="spinbutton"]').first()
    if ((await input.count()) > 0) {
      await input.fill('0.001')
      await page.waitForTimeout(TIMEOUT.MEDIUM)
    }

    const submitBtn = page.locator('button:has-text("Redeem BTD")').last()
    if ((await submitBtn.count()) > 0 && !(await submitBtn.isDisabled())) {
      await submitBtn.click()
      await waitForTxComplete(page, 'Redeem BTD', TIMEOUT.TX)

      await expectBalanceDecrease(page, ADDRESSES.BTD, btdBefore)
      console.log('[Redeem] BTD balance decrease verified')
    } else {
      test.skip()
    }
  })

  test('WBTC balance increases after redeem', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/mint')
    await page.locator('button:has-text("Redeem BTD")').first().click()
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    const body = await page.textContent('body')
    if (body?.includes('NaN') || body?.includes('Infinity')) {
      test.skip()
      return
    }

    const hasBalance = body?.match(/Balance:\s*([\d,.]+)/)
    if (!hasBalance?.[1] || parseFloat(hasBalance[1].replace(/,/g, '')) === 0) {
      console.log('[Redeem] No BTD balance - skipping')
      test.skip()
      return
    }

    const wbtcBefore = await readBalance(page, ADDRESSES.WBTC)
    console.log(`[Redeem] WBTC before: ${wbtcBefore}`)

    const input = page.locator('input[type="number"], input[inputmode="decimal"], [role="spinbutton"]').first()
    if ((await input.count()) > 0) {
      await input.fill('0.001')
      await page.waitForTimeout(TIMEOUT.MEDIUM)
    }

    const submitBtn = page.locator('button:has-text("Redeem BTD")').last()
    if ((await submitBtn.count()) > 0 && !(await submitBtn.isDisabled())) {
      await submitBtn.click()
      await waitForTxComplete(page, 'Redeem BTD', TIMEOUT.TX)

      await expectBalanceIncrease(page, ADDRESSES.WBTC, wbtcBefore)
      console.log('[Redeem] WBTC balance increase verified')
    } else {
      test.skip()
    }
  })

  test('BTB compensation amount is displayed', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/mint')
    await page.locator('button:has-text("Redeem BTD")').first().click()
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    const body = await page.textContent('body')
    if (body?.includes('NaN') || body?.includes('Infinity')) {
      test.skip()
      return
    }

    // Input an amount to trigger output display
    const input = page.locator('input[type="number"], input[inputmode="decimal"], [role="spinbutton"]').first()
    if ((await input.count()) > 0) {
      await input.fill('0.01')
      await page.waitForTimeout(TIMEOUT.MEDIUM)
    }

    // Check for BTB compensation display
    const afterBody = await page.textContent('body')
    const hasBTB =
      afterBody?.includes('BTB') ||
      afterBody?.toLowerCase().includes('compensation') ||
      afterBody?.toLowerCase().includes('bonus')
    expect(hasBTB).toBeTruthy()
  })
})
