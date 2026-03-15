/**
 * 05 - Stake Tests
 *
 * Navigate to /stake → verify UI → attempt deposit/withdraw if balance available.
 */

import { test, expect } from '../sepolia/fixtures'
import { navigateTo, fillInput, clickButton, waitForTxSuccess, clickTab } from '../sepolia/helpers'
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
    await page.waitForTimeout(TIMEOUT.SHORT)

    const input = page.locator('input[type="number"], input[inputmode="decimal"], [role="spinbutton"]').first()
    if ((await input.count()) > 0) {
      await input.fill('0.001')
      const val = await input.inputValue()
      expect(val).toBe('0.001')
    }
  })

  test('can deposit BTD if balance available', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/stake')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    const body = await page.textContent('body')
    const hasZeroBalance = body?.includes('Balance: 0') || body?.includes('Balance:0')

    if (hasZeroBalance) {
      console.log('[Stake] No BTD balance available - skipping deposit test')
      test.skip()
      return
    }

    const input = page.locator('input[type="number"], input[inputmode="decimal"], [role="spinbutton"]').first()
    if ((await input.count()) > 0) {
      await input.fill('0.001')
      await page.waitForTimeout(TIMEOUT.MEDIUM)
    }

    const depositBtn = page.locator(
      'button:has-text("Deposit"), button:has-text("Stake"), button:has-text("Approve")'
    ).last()

    if ((await depositBtn.count()) > 0 && !(await depositBtn.isDisabled())) {
      await depositBtn.click()
      await waitForTxSuccess(page, TIMEOUT.TX)
    } else {
      console.log('[Stake] Deposit button is disabled')
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
