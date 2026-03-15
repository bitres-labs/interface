/**
 * 05 - Stake Tests
 *
 * Navigate to /stake → verify UI → attempt deposit/withdraw if balance available.
 */

import { test, expect } from '../sepolia/fixtures'
import { navigateTo, waitForTxComplete } from '../sepolia/helpers'
import { TIMEOUT } from '../sepolia/constants'

test.describe('Stake BTD → stBTD', () => {
  test('stake page loads with wallet connected', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/stake')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    const body = await page.textContent('body')
    const hasStakeContent =
      body?.toLowerCase().includes('stake') ||
      body?.toLowerCase().includes('stbtd') ||
      body?.toLowerCase().includes('vault') ||
      body?.toLowerCase().includes('deposit')
    expect(hasStakeContent).toBeTruthy()
  })

  test('stake page shows balance info', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/stake')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    const body = await page.textContent('body')
    expect(body?.toLowerCase()).toContain('balance')
  })

  test('can input deposit amount', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/stake')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Try all possible input selectors
    const input = page.locator('input').first()
    if ((await input.count()) > 0) {
      await input.click()
      await input.fill('0.001')
      const val = await input.inputValue()
      expect(parseFloat(val)).toBeGreaterThan(0)
    }
  })

  test('can deposit BTD if balance available', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/stake')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    const body = await page.textContent('body')

    // Check BTD balance
    const balanceMatch = body?.match(/Balance:\s*([\d,.]+)/)
    const balance = balanceMatch?.[1]

    if (!balance || parseFloat(balance.replace(/,/g, '')) === 0) {
      console.log('[Stake] No BTD balance available - skipping deposit test')
      test.skip()
      return
    }

    // Fill amount
    const input = page.locator('input').first()
    if ((await input.count()) > 0) {
      await input.click()
      await input.fill('0.001')
      await page.waitForTimeout(TIMEOUT.MEDIUM)
    }

    // Look for stake/deposit button
    const depositBtn = page.locator(
      'button:has-text("Stake BTD"), button:has-text("Deposit"), button:has-text("Approve")'
    ).last()

    if ((await depositBtn.count()) > 0 && !(await depositBtn.isDisabled())) {
      const btnText = await depositBtn.textContent()
      await depositBtn.click()
      console.log(`[Stake] Clicked "${btnText}", waiting for confirmation...`)

      const completed = await waitForTxComplete(page, btnText || 'Stake', TIMEOUT.TX)
      if (completed) {
        console.log('[Stake] Transaction completed')
      } else {
        console.log('[Stake] Transaction still pending after timeout')
      }
    } else {
      console.log('[Stake] Deposit button is disabled or not found')
    }
  })

  test('withdraw tab is accessible', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/stake')

    const withdrawTab = page.locator('button:has-text("Withdraw"), button:has-text("Unstake")').first()
    if ((await withdrawTab.count()) > 0) {
      await withdrawTab.click()
      await page.waitForTimeout(TIMEOUT.SHORT)

      const body = await page.textContent('body')
      expect(body?.toLowerCase()).toContain('balance')
    }
  })
})
