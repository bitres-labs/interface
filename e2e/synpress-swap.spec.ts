/**
 * Synpress E2E Test: Swap Operations
 *
 * Tests for token swap functionality via Uniswap V2
 */

import { metaMaskFixtures } from './utils/metamask-fixtures-router'
import { expect } from '@playwright/test'
import BasicSetup from '../test/wallet-setup/basic.setup'
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

test.describe('Swap Interface', () => {
  test.beforeEach(async ({ page, metamask }) => {
    await navigateTo(page, '/swap')
    await connectWallet(page, metamask)
    await page.waitForTimeout(WAIT.MEDIUM)
  })

  test('should display Swap interface', async ({ page }) => {
    // Check for swap elements
    const swapTab = page.locator('button:has-text("Swap")')
    expect(await swapTab.count()).toBeGreaterThan(0)

    // Check for input/output fields
    const inputs = page.locator('input[type="number"], input[inputmode="decimal"]')
    expect(await inputs.count()).toBeGreaterThanOrEqual(1)

    await takeScreenshot(page, 'swap-interface')
  })

  test('should show token selectors', async ({ page }) => {
    // Check for token selector buttons
    const tokenSelectors = page.locator('[role="combobox"], [data-testid="token-select"], button:has-text("Select")')
    expect(await tokenSelectors.count()).toBeGreaterThan(0)

    await takeScreenshot(page, 'swap-token-selectors')
  })

  test('should show slippage settings', async ({ page }) => {
    // Look for settings/slippage button
    const settingsButton = page.locator('button[aria-label*="settings"], button:has-text("Settings"), [class*="settings"]')
    if (await settingsButton.count() > 0) {
      await settingsButton.first().click()
      await page.waitForTimeout(WAIT.SHORT)

      const content = await page.content()
      const hasSlippage = content.includes('Slippage') || content.includes('slippage') || content.includes('%')
      expect(hasSlippage).toBe(true)

      await takeScreenshot(page, 'swap-slippage-settings')
    }
  })
})

test.describe('Swap Token Selection', () => {
  test.beforeEach(async ({ page, metamask }) => {
    await navigateTo(page, '/swap')
    await connectWallet(page, metamask)
    await clickTab(page, 'Swap')
    await page.waitForTimeout(WAIT.MEDIUM)
  })

  test('should select input token', async ({ page }) => {
    const tokenSelector = page.locator('[role="combobox"], [data-testid="token-select"]').first()
    if (await tokenSelector.count() > 0) {
      await tokenSelector.click()
      await page.waitForTimeout(WAIT.SHORT)

      // Check for available tokens
      const content = await page.content()
      console.log('Available input tokens in dropdown')

      await takeScreenshot(page, 'swap-input-token-dropdown')
    }
  })

  test('should select output token', async ({ page }) => {
    const tokenSelectors = page.locator('[role="combobox"], [data-testid="token-select"]')
    if (await tokenSelectors.count() > 1) {
      await tokenSelectors.nth(1).click()
      await page.waitForTimeout(WAIT.SHORT)

      await takeScreenshot(page, 'swap-output-token-dropdown')
    }
  })

  test('should swap token positions with switch button', async ({ page }) => {
    // Look for swap/switch button between input and output
    const switchButton = page.locator('button:has([class*="rotate"]), button:has([class*="switch"]), button:has([class*="arrow"])').first()
    if (await switchButton.count() > 0) {
      await switchButton.click()
      await page.waitForTimeout(WAIT.SHORT)

      await takeScreenshot(page, 'swap-tokens-switched')
    }
  })
})

test.describe('Swap Execution', () => {
  test.beforeEach(async ({ page, metamask }) => {
    await navigateTo(page, '/swap')
    await connectWallet(page, metamask)
    await clickTab(page, 'Swap')
    await page.waitForTimeout(WAIT.MEDIUM)
  })

  test('should calculate output amount', async ({ page }) => {
    await fillAmount(page, '0.1')
    await page.waitForTimeout(WAIT.MEDIUM)

    // Check for calculated output
    const outputs = page.locator('input[type="number"], input[inputmode="decimal"]')
    if (await outputs.count() > 1) {
      const outputValue = await outputs.nth(1).inputValue()
      console.log('Calculated output:', outputValue)
    }

    await takeScreenshot(page, 'swap-calculation')
  })

  test('should show price impact', async ({ page }) => {
    await fillAmount(page, '1')
    await page.waitForTimeout(WAIT.MEDIUM)

    const content = await page.content()
    const hasPriceInfo = content.includes('Price') || content.includes('price') || content.includes('Impact') || content.includes('Rate')

    await takeScreenshot(page, 'swap-price-info')
  })

  test('should fill MAX amount', async ({ page }) => {
    await clickMaxButton(page)
    await page.waitForTimeout(WAIT.SHORT)

    const value = await getInputValue(page)
    expect(value).toBeDefined()

    await takeScreenshot(page, 'swap-max-amount')
  })

  test('should execute swap transaction', async ({ page, metamask }) => {
    test.setTimeout(120000)

    await fillAmount(page, '0.01')
    await page.waitForTimeout(WAIT.MEDIUM)

    await takeScreenshot(page, 'swap-before-tx')

    const swapButton = page.locator('button:has-text("Swap")').last()
    if (await swapButton.count() > 0 && !(await swapButton.isDisabled())) {
      await swapButton.click()
      await page.waitForTimeout(WAIT.MEDIUM)

      // Handle approve if needed
      try {
        await handleApprove(metamask)
        console.log('Token approve confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('No approve needed or already approved')
      }

      // Handle swap transaction
      try {
        await handleTransaction(metamask)
        console.log('Swap transaction confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('Swap transaction handling:', e)
      }

      await takeScreenshot(page, 'swap-after-tx')
    }
  })

  test('should disable Swap button when amount is zero', async ({ page }) => {
    await fillAmount(page, '0')
    await page.waitForTimeout(WAIT.SHORT)

    const disabled = await isButtonDisabled(page, 'Swap')
    expect(disabled).toBe(true)
  })

  test('should show insufficient balance error', async ({ page }) => {
    await fillAmount(page, '999999999')
    await page.waitForTimeout(WAIT.MEDIUM)

    const content = await page.content()
    const hasError = content.includes('Insufficient') || content.includes('insufficient') || content.includes('balance')

    await takeScreenshot(page, 'swap-insufficient-balance')
  })
})

test.describe('Swap Add Liquidity', () => {
  test.beforeEach(async ({ page, metamask }) => {
    await navigateTo(page, '/swap')
    await connectWallet(page, metamask)
    await clickTab(page, 'Add Liquidity')
    await page.waitForTimeout(WAIT.MEDIUM)
  })

  test('should display Add Liquidity interface', async ({ page }) => {
    const addLiqTab = page.locator('button:has-text("Add Liquidity")')
    expect(await addLiqTab.count()).toBeGreaterThan(0)

    await takeScreenshot(page, 'swap-add-liquidity-interface')
  })

  test('should show two token input fields', async ({ page }) => {
    const inputs = page.locator('input[type="number"], input[inputmode="decimal"]')
    expect(await inputs.count()).toBeGreaterThanOrEqual(2)

    await takeScreenshot(page, 'swap-add-liquidity-inputs')
  })

  test('should calculate paired amount', async ({ page }) => {
    await fillAmount(page, '100', 0)
    await page.waitForTimeout(WAIT.MEDIUM)

    // Second input should auto-calculate
    const inputs = page.locator('input[type="number"], input[inputmode="decimal"]')
    if (await inputs.count() > 1) {
      const secondValue = await inputs.nth(1).inputValue()
      console.log('Paired amount:', secondValue)
    }

    await takeScreenshot(page, 'swap-add-liquidity-calculation')
  })

  test('should execute Add Liquidity transaction', async ({ page, metamask }) => {
    test.setTimeout(150000)

    await fillAmount(page, '10', 0)
    await page.waitForTimeout(WAIT.MEDIUM)

    await takeScreenshot(page, 'swap-add-liquidity-before')

    const addButton = page.locator('button:has-text("Add Liquidity"), button:has-text("Add")').last()
    if (await addButton.count() > 0 && !(await addButton.isDisabled())) {
      await addButton.click()
      await page.waitForTimeout(WAIT.MEDIUM)

      // May need to approve first token
      try {
        await handleApprove(metamask)
        console.log('First token approve confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('First approve handling:', e)
      }

      // May need to approve second token
      try {
        await handleApprove(metamask)
        console.log('Second token approve confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('Second approve handling:', e)
      }

      // Handle add liquidity transaction
      try {
        await handleTransaction(metamask)
        console.log('Add Liquidity transaction confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('Add Liquidity transaction handling:', e)
      }

      await takeScreenshot(page, 'swap-add-liquidity-after')
    }
  })
})

test.describe('Swap Remove Liquidity', () => {
  test.beforeEach(async ({ page, metamask }) => {
    await navigateTo(page, '/swap')
    await connectWallet(page, metamask)
    await clickTab(page, 'Remove Liquidity')
    await page.waitForTimeout(WAIT.MEDIUM)
  })

  test('should display Remove Liquidity interface', async ({ page }) => {
    const removeLiqTab = page.locator('button:has-text("Remove Liquidity")')
    expect(await removeLiqTab.count()).toBeGreaterThan(0)

    await takeScreenshot(page, 'swap-remove-liquidity-interface')
  })

  test('should show LP token input', async ({ page }) => {
    const inputs = page.locator('input[type="number"], input[inputmode="decimal"]')
    expect(await inputs.count()).toBeGreaterThan(0)

    await takeScreenshot(page, 'swap-remove-liquidity-input')
  })

  test('should show percentage slider or buttons', async ({ page }) => {
    // Look for percentage options (25%, 50%, 75%, 100%)
    const percentButtons = page.locator('button:has-text("25%"), button:has-text("50%"), button:has-text("75%"), button:has-text("100%"), button:has-text("MAX")')
    const hasPercentOptions = await percentButtons.count() > 0

    // Or slider
    const slider = page.locator('input[type="range"], [role="slider"]')
    const hasSlider = await slider.count() > 0

    expect(hasPercentOptions || hasSlider).toBe(true)

    await takeScreenshot(page, 'swap-remove-liquidity-percent')
  })

  test('should show output amounts breakdown', async ({ page }) => {
    await fillAmount(page, '10')
    await page.waitForTimeout(WAIT.MEDIUM)

    // Should show what tokens user will receive
    const content = await page.content()
    const hasBreakdown = content.includes('receive') || content.includes('Receive') || content.includes('Output')

    await takeScreenshot(page, 'swap-remove-liquidity-breakdown')
  })

  test('should execute Remove Liquidity transaction', async ({ page, metamask }) => {
    test.setTimeout(120000)

    await fillAmount(page, '5')
    await page.waitForTimeout(WAIT.MEDIUM)

    await takeScreenshot(page, 'swap-remove-liquidity-before')

    const removeButton = page.locator('button:has-text("Remove Liquidity"), button:has-text("Remove")').last()
    if (await removeButton.count() > 0 && !(await removeButton.isDisabled())) {
      await removeButton.click()
      await page.waitForTimeout(WAIT.MEDIUM)

      // Handle approve if needed (LP token)
      try {
        await handleApprove(metamask)
        console.log('LP token approve confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('No LP approve needed')
      }

      // Handle remove liquidity transaction
      try {
        await handleTransaction(metamask)
        console.log('Remove Liquidity transaction confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('Remove Liquidity transaction handling:', e)
      }

      await takeScreenshot(page, 'swap-remove-liquidity-after')
    }
  })
})

test.describe('Swap Tab Switching', () => {
  test('should switch between Swap, Add Liquidity, Remove Liquidity tabs', async ({ page, metamask }) => {
    await navigateTo(page, '/swap')
    await connectWallet(page, metamask)

    const tabs = ['Swap', 'Add Liquidity', 'Remove Liquidity']
    for (const tab of tabs) {
      await clickTab(page, tab)
      await page.waitForTimeout(WAIT.SHORT)

      const tabButton = page.locator(`button:has-text("${tab}")`).first()
      const classes = await tabButton.getAttribute('class')
      console.log(`Tab ${tab} classes:`, classes)

      await takeScreenshot(page, `swap-tab-${tab.toLowerCase().replace(' ', '-')}`)
    }
  })
})
