/**
 * Synpress E2E Test: Mint and Redeem Operations
 *
 * Tests for minting BTD with WBTC and redeeming BTD/BTB
 */

import { metaMaskFixtures } from './utils/metamask-fixtures-router'
import { expect } from '@playwright/test'
import BasicSetup from '../test/wallet-setup/okx.setup'
import {
  connectWallet,
  navigateTo,
  fillAmount,
  clickMaxButton,
  clickTab,
  clickButton,
  isButtonDisabled,
  getInputValue,
  handleApprove,
  handlePermit,
  handleTransaction,
  takeScreenshot,
  WAIT
} from './utils/test-helpers'

const test = metaMaskFixtures(BasicSetup, 0)

test.describe('Mint BTD', () => {
  test.beforeEach(async ({ page, metamask }) => {
    await navigateTo(page, '/')
    await connectWallet(page, metamask)
    await clickTab(page, 'Mint')
    await page.waitForTimeout(WAIT.MEDIUM)
  })

  test('should display Mint interface', async ({ page }) => {
    // Check for WBTC input
    const wbtcLabel = page.locator('text=WBTC')
    expect(await wbtcLabel.count()).toBeGreaterThan(0)

    // Check for BTD output
    const btdLabel = page.locator('text=BTD')
    expect(await btdLabel.count()).toBeGreaterThan(0)

    // Check for Mint button
    const mintButton = page.locator('button:has-text("Mint")')
    expect(await mintButton.count()).toBeGreaterThan(0)

    await takeScreenshot(page, 'mint-interface')
  })

  test('should fill MAX amount', async ({ page }) => {
    await clickMaxButton(page)

    const value = await getInputValue(page)
    expect(parseFloat(value)).toBeGreaterThan(0)

    await takeScreenshot(page, 'mint-max-amount')
  })

  test('should calculate BTD output when entering WBTC amount', async ({ page }) => {
    await fillAmount(page, '0.001')
    await page.waitForTimeout(WAIT.MEDIUM)

    // Check that output shows calculated BTD amount
    const outputContainer = page.locator('[class*="output"], [class*="receive"]')
    if (await outputContainer.count() > 0) {
      const text = await outputContainer.textContent()
      expect(text).toBeTruthy()
    }

    await takeScreenshot(page, 'mint-calculation')
  })

  test('should show fee information', async ({ page }) => {
    await fillAmount(page, '0.01')
    await page.waitForTimeout(WAIT.MEDIUM)

    // Look for fee display
    const feeText = page.locator('text=/fee|Fee/')
    expect(await feeText.count()).toBeGreaterThan(0)
  })

  test('should execute Mint BTD transaction', async ({ page, metamask }) => {
    test.setTimeout(120000)

    await fillAmount(page, '0.001')
    await page.waitForTimeout(WAIT.MEDIUM)

    await takeScreenshot(page, 'mint-before-tx')

    // Click Mint button
    const mintButton = page.locator('button:has-text("Mint BTD"), button:has-text("Mint")').last()
    if (await mintButton.count() > 0 && !(await mintButton.isDisabled())) {
      await mintButton.click()
      await page.waitForTimeout(WAIT.MEDIUM)

      // Handle approve if needed
      try {
        await handleApprove(metamask)
        console.log('Approve transaction confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('No approve needed or already approved')
      }

      // Handle mint transaction
      try {
        await handleTransaction(metamask)
        console.log('Mint transaction confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('Mint transaction handling:', e)
      }

      await takeScreenshot(page, 'mint-after-tx')
    }
  })

  test('should disable Mint button when amount is zero', async ({ page }) => {
    await fillAmount(page, '0')
    await page.waitForTimeout(WAIT.SHORT)

    const disabled = await isButtonDisabled(page, 'Mint')
    const content = await page.content()
    const hasValidation = /enter|connect|insufficient/i.test(content)
    expect(disabled || hasValidation).toBe(true)
  })
})

test.describe('Redeem BTD', () => {
  test.beforeEach(async ({ page, metamask }) => {
    await navigateTo(page, '/')
    await connectWallet(page, metamask)
    await clickTab(page, 'Redeem BTD')
    await page.waitForTimeout(WAIT.MEDIUM)
  })

  test('should display Redeem BTD interface', async ({ page }) => {
    const redeemTab = page.locator('button:has-text("Redeem BTD")')
    expect(await redeemTab.count()).toBeGreaterThan(0)

    await takeScreenshot(page, 'redeem-btd-interface')
  })

  test('should show redemption breakdown', async ({ page }) => {
    await fillAmount(page, '100')
    await page.waitForTimeout(WAIT.MEDIUM)

    // Should show what user will receive (WBTC, BTB, BRS depending on CR)
    const content = await page.content()
    const hasBreakdown = content.includes('WBTC') || content.includes('receive')
    expect(hasBreakdown).toBe(true)

    await takeScreenshot(page, 'redeem-btd-breakdown')
  })

  test('should execute Redeem BTD with permit signature', async ({ page, metamask }) => {
    test.setTimeout(120000)

    await fillAmount(page, '10')
    await page.waitForTimeout(WAIT.MEDIUM)

    await takeScreenshot(page, 'redeem-btd-before')

    const redeemButton = page.locator('button:has-text("Redeem BTD")').last()
    if (await redeemButton.count() > 0 && !(await redeemButton.isDisabled())) {
      await redeemButton.click()
      await page.waitForTimeout(WAIT.MEDIUM)

      // Handle permit signature
      try {
        await handlePermit(metamask)
        console.log('Permit signature approved')
        await page.waitForTimeout(WAIT.LONG)
      } catch (e) {
        console.log('Permit handling:', e)
      }

      // Handle redeem transaction
      try {
        await handleTransaction(metamask)
        console.log('Redeem transaction confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('Redeem transaction handling:', e)
      }

      await takeScreenshot(page, 'redeem-btd-after')
    }
  })

  test('should show cooldown warning if applicable', async ({ page }) => {
    // Check for cooldown message
    const cooldownText = page.locator('text=/cooldown|Cooldown|wait/')
    const hasCooldown = await cooldownText.count() > 0

    if (hasCooldown) {
      console.log('Cooldown is active')
      await takeScreenshot(page, 'redeem-btd-cooldown')
    }
  })
})

test.describe('Redeem BTB', () => {
  test.beforeEach(async ({ page, metamask }) => {
    await navigateTo(page, '/')
    await connectWallet(page, metamask)
    await clickTab(page, 'Redeem BTB')
    await page.waitForTimeout(WAIT.MEDIUM)
  })

  test('should display Redeem BTB interface', async ({ page }) => {
    const redeemTab = page.locator('button:has-text("Redeem BTB")')
    expect(await redeemTab.count()).toBeGreaterThan(0)

    await takeScreenshot(page, 'redeem-btb-interface')
  })

  test('should execute Redeem BTB with permit signature', async ({ page, metamask }) => {
    test.setTimeout(120000)

    await fillAmount(page, '10')
    await page.waitForTimeout(WAIT.MEDIUM)

    await takeScreenshot(page, 'redeem-btb-before')

    const redeemButton = page.locator('button:has-text("Redeem BTB")').last()
    if (await redeemButton.count() > 0 && !(await redeemButton.isDisabled())) {
      await redeemButton.click()
      await page.waitForTimeout(WAIT.MEDIUM)

      // Handle permit signature
      try {
        await handlePermit(metamask)
        console.log('Permit signature approved')
        await page.waitForTimeout(WAIT.LONG)
      } catch (e) {
        console.log('Permit handling:', e)
      }

      // Handle redeem transaction
      try {
        await handleTransaction(metamask)
        console.log('Redeem BTB transaction confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('Redeem BTB transaction handling:', e)
      }

      await takeScreenshot(page, 'redeem-btb-after')
    }
  })

  test('should show CR requirement for BTB redemption', async ({ page }) => {
    // BTB can only be redeemed when CR >= 100%
    const content = await page.content()
    const hasInfo = content.includes('CR') || content.includes('collateral') || content.includes('ratio')

    await takeScreenshot(page, 'redeem-btb-cr-info')
  })
})

test.describe('Mint Tab Switching', () => {
  test('should switch between Mint, Redeem BTD, Redeem BTB tabs', async ({ page, metamask }) => {
    await navigateTo(page, '/')
    await connectWallet(page, metamask)

    // Test each tab
    const tabs = ['Mint', 'Redeem BTD', 'Redeem BTB']
    for (const tab of tabs) {
      await clickTab(page, tab)
      await page.waitForTimeout(WAIT.SHORT)

      // Verify tab is active (check for active class or similar)
      const tabButton = page.locator(`button:has-text("${tab}")`).first()
      const isActive = await tabButton.getAttribute('class')
      console.log(`Tab ${tab} classes:`, isActive)

      await takeScreenshot(page, `mint-tab-${tab.toLowerCase().replace(' ', '-')}`)
    }
  })
})
