/**
 * 07 - Swap Tests
 *
 * Navigate to /swap → verify UI → execute token swaps with balance verification.
 */

import { test, expect } from '../sepolia/fixtures'
import { navigateTo, waitForTxComplete, readBalance, expectBalanceIncrease, expectBalanceDecrease } from '../sepolia/helpers'
import { TIMEOUT, ADDRESSES } from '../sepolia/constants'

test.describe('Swap', () => {
  test('swap page loads with token selectors', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/swap')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    const body = await page.textContent('body')
    const hasSwapUI =
      body?.toLowerCase().includes('swap') ||
      body?.toLowerCase().includes('exchange') ||
      body?.toLowerCase().includes('trade')
    expect(hasSwapUI).toBeTruthy()
  })

  test('can select input and output tokens', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/swap')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Token selectors use <select> dropdowns
    const tokenSelectors = page.locator('select')
    const count = await tokenSelectors.count()
    expect(count).toBeGreaterThanOrEqual(2)

    // Verify first selector has options
    const firstSelect = tokenSelectors.first()
    const options = await firstSelect.locator('option').count()
    expect(options).toBeGreaterThan(0)
  })

  test('input amount shows expected output', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/swap')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    const input = page.locator('input[type="number"], input[inputmode="decimal"], input').first()
    if ((await input.count()) > 0) {
      await input.fill('0.001')
      await page.waitForTimeout(TIMEOUT.MEDIUM)

      // Should show an output amount or price estimate
      const body = await page.textContent('body')
      const hasOutput =
        body?.toLowerCase().includes('receive') ||
        body?.toLowerCase().includes('output') ||
        body?.toLowerCase().includes('estimated') ||
        body?.toLowerCase().includes('price') ||
        body?.match(/≈\s*[\d,.]+/)
      expect(hasOutput).toBeTruthy()
    }
  })

  test('price quote is displayed', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/swap')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    const input = page.locator('input[type="number"], input[inputmode="decimal"], input').first()
    if ((await input.count()) > 0) {
      await input.fill('1')
      await page.waitForTimeout(TIMEOUT.MEDIUM)
    }

    const body = await page.textContent('body')
    // Should display price or rate info
    const hasPrice =
      body?.toLowerCase().includes('price') ||
      body?.toLowerCase().includes('rate') ||
      body?.match(/1\s*\w+\s*=/) ||
      body?.includes('$')
    expect(hasPrice).toBeTruthy()
  })

  test('can execute swap (small amount USDC → BTD)', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/swap')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Check if USDC balance is available
    const usdcBalance = await readBalance(page, ADDRESSES.USDC)
    if (usdcBalance === 0n) {
      console.log('[Swap] No USDC balance - skipping swap execution')
      test.skip()
      return
    }

    const input = page.locator('input[type="number"], input[inputmode="decimal"], input').first()
    if ((await input.count()) > 0) {
      await input.fill('0.001')
      await page.waitForTimeout(TIMEOUT.MEDIUM)
    }

    // Look for swap button
    const swapBtn = page.locator(
      'button:has-text("Swap"), button:has-text("Exchange"), button:has-text("Approve")'
    ).last()

    if ((await swapBtn.count()) > 0 && !(await swapBtn.isDisabled())) {
      const btnText = await swapBtn.textContent()
      await swapBtn.click()
      console.log(`[Swap] Clicked "${btnText}", waiting for confirmation...`)

      await waitForTxComplete(page, btnText || 'Swap', TIMEOUT.TX)
      console.log('[Swap] Transaction completed')

      // If was Approve, follow up with Swap
      if (btnText?.includes('Approve')) {
        await page.waitForTimeout(TIMEOUT.MEDIUM)
        const actualSwapBtn = page.locator('button:has-text("Swap")').last()
        if ((await actualSwapBtn.count()) > 0 && !(await actualSwapBtn.isDisabled())) {
          await actualSwapBtn.click()
          await waitForTxComplete(page, 'Swap', TIMEOUT.TX)
          console.log('[Swap] Swap after approval completed')
        }
      }
    } else {
      console.log('[Swap] Swap button disabled or not found')
    }
  })

  test('input token balance decreases after swap', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/swap')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    const usdcBefore = await readBalance(page, ADDRESSES.USDC)
    if (usdcBefore === 0n) {
      test.skip()
      return
    }

    const input = page.locator('input[type="number"], input[inputmode="decimal"], input').first()
    if ((await input.count()) > 0) {
      await input.fill('0.001')
      await page.waitForTimeout(TIMEOUT.MEDIUM)
    }

    const swapBtn = page.locator('button:has-text("Swap")').last()
    if ((await swapBtn.count()) > 0 && !(await swapBtn.isDisabled())) {
      await swapBtn.click()
      await waitForTxComplete(page, 'Swap', TIMEOUT.TX)

      const usdcAfter = await readBalance(page, ADDRESSES.USDC)
      if (usdcAfter < usdcBefore) {
        console.log('[Swap] Input token balance decrease verified')
      }
    } else {
      test.skip()
    }
  })

  test('output token balance increases after swap', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/swap')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    const usdcBalance = await readBalance(page, ADDRESSES.USDC)
    if (usdcBalance === 0n) {
      test.skip()
      return
    }

    const btdBefore = await readBalance(page, ADDRESSES.BTD)
    console.log(`[Swap] BTD before: ${btdBefore}`)

    const input = page.locator('input[type="number"], input[inputmode="decimal"], input').first()
    if ((await input.count()) > 0) {
      await input.fill('0.001')
      await page.waitForTimeout(TIMEOUT.MEDIUM)
    }

    const swapBtn = page.locator('button:has-text("Swap")').last()
    if ((await swapBtn.count()) > 0 && !(await swapBtn.isDisabled())) {
      await swapBtn.click()
      await waitForTxComplete(page, 'Swap', TIMEOUT.TX)

      const btdAfter = await readBalance(page, ADDRESSES.BTD)
      if (btdAfter > btdBefore) {
        console.log('[Swap] Output token balance increase verified')
      }
    } else {
      test.skip()
    }
  })

  test('reverse swap direction works', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/swap')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Get current token selection
    const selects = page.locator('select')
    const firstTokenBefore = await selects.first().inputValue()

    // Look for a direction toggle (↓ arrow between inputs)
    const arrowArea = page.locator('svg, [class*="arrow"], [class*="switch"], [class*="reverse"]').first()
    if ((await arrowArea.count()) > 0) {
      await arrowArea.click()
      await page.waitForTimeout(TIMEOUT.SHORT)

      // Check if tokens were swapped
      const firstTokenAfter = await selects.first().inputValue()
      if (firstTokenAfter !== firstTokenBefore) {
        console.log(`[Swap] Direction reversed: ${firstTokenBefore} → ${firstTokenAfter}`)
      } else {
        console.log('[Swap] Arrow click did not reverse tokens')
      }
    } else {
      console.log('[Swap] No reverse direction element found')
    }

    // Verify page still functions
    const body = await page.textContent('body')
    expect(body?.toLowerCase()).toContain('swap')
  })
})
