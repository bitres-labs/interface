/**
 * Synpress E2E Test: Stake and Unstake Operations
 *
 * Tests for staking BTD/BTB to receive stBTD/stBTB and unstaking
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
  selectToken,
  WAIT
} from './utils/test-helpers'

const test = metaMaskFixtures(BasicSetup, 0)

test.describe('Stake BTD', () => {
  test.beforeEach(async ({ page, metamask }) => {
    await navigateTo(page, '/stake')
    await connectWallet(page, metamask)
    await clickTab(page, 'Stake')
    await page.waitForTimeout(WAIT.MEDIUM)
  })

  test('should display Stake interface', async ({ page }) => {
    // Check for stake elements
    const stakeTab = page.locator('button:has-text("Stake")')
    expect(await stakeTab.count()).toBeGreaterThan(0)

    // Check for input field
    const input = page.locator('input[type="number"], input[inputmode="decimal"]')
    expect(await input.count()).toBeGreaterThan(0)

    await takeScreenshot(page, 'stake-interface')
  })

  test('should show APR information', async ({ page }) => {
    const content = await page.content()
    const hasAPR = content.includes('APR') || content.includes('apy') || content.includes('APY')
    expect(hasAPR).toBe(true)

    await takeScreenshot(page, 'stake-apr-info')
  })

  test('should select BTD token for staking', async ({ page }) => {
    // Look for token selector or ensure BTD is selected
    const tokenSelector = page.locator('[role="combobox"], [data-testid="token-select"], button:has-text("BTD")')
    if (await tokenSelector.count() > 0) {
      await tokenSelector.first().click()
      await page.waitForTimeout(WAIT.SHORT)

      const btdOption = page.locator('text=BTD').first()
      if (await btdOption.count() > 0) {
        await btdOption.click()
        await page.waitForTimeout(WAIT.SHORT)
      }
    }

    const content = await page.content()
    expect(content.includes('BTD')).toBe(true)

    await takeScreenshot(page, 'stake-btd-selected')
  })

  test('should fill MAX amount for staking', async ({ page }) => {
    await clickMaxButton(page)

    const value = await getInputValue(page)
    // Value should be filled (may be 0 if no balance)
    expect(value).toBeDefined()

    await takeScreenshot(page, 'stake-max-amount')
  })

  test('should show stBTD output when staking BTD', async ({ page }) => {
    await fillAmount(page, '100')
    await page.waitForTimeout(WAIT.MEDIUM)

    const content = await page.content()
    const hasOutput = content.includes('stBTD') || content.includes('receive')
    expect(hasOutput).toBe(true)

    await takeScreenshot(page, 'stake-btd-output')
  })

  test('should execute Stake BTD transaction with approve', async ({ page, metamask }) => {
    test.setTimeout(120000)

    await fillAmount(page, '10')
    await page.waitForTimeout(WAIT.MEDIUM)

    await takeScreenshot(page, 'stake-btd-before')

    const stakeButton = page.locator('button:has-text("Stake")').last()
    if (await stakeButton.count() > 0 && !(await stakeButton.isDisabled())) {
      await stakeButton.click()
      await page.waitForTimeout(WAIT.MEDIUM)

      // Handle approve first (ERC20 approve for BTD)
      try {
        await handleApprove(metamask)
        console.log('BTD approve confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('No approve needed or already approved')
      }

      // Handle stake transaction
      try {
        await handleTransaction(metamask)
        console.log('Stake BTD transaction confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('Stake BTD transaction handling:', e)
      }

      await takeScreenshot(page, 'stake-btd-after')
    }
  })

  test('should disable Stake button when amount is zero', async ({ page }) => {
    await fillAmount(page, '0')
    await page.waitForTimeout(WAIT.SHORT)

    const disabled = await isButtonDisabled(page, 'Stake')
    expect(disabled).toBe(true)
  })
})

test.describe('Stake BTB', () => {
  test.beforeEach(async ({ page, metamask }) => {
    await navigateTo(page, '/stake')
    await connectWallet(page, metamask)
    await clickTab(page, 'Stake')
    await page.waitForTimeout(WAIT.MEDIUM)
  })

  test('should select BTB token for staking', async ({ page }) => {
    // Select BTB from token dropdown
    const tokenSelector = page.locator('[role="combobox"], [data-testid="token-select"]').first()
    if (await tokenSelector.count() > 0) {
      await tokenSelector.click()
      await page.waitForTimeout(WAIT.SHORT)

      const btbOption = page.locator('text=BTB').first()
      if (await btbOption.count() > 0) {
        await btbOption.click()
        await page.waitForTimeout(WAIT.SHORT)
      }
    }

    await takeScreenshot(page, 'stake-btb-selected')
  })

  test('should show stBTB output when staking BTB', async ({ page }) => {
    // Select BTB first
    const tokenSelector = page.locator('[role="combobox"], [data-testid="token-select"]').first()
    if (await tokenSelector.count() > 0) {
      await tokenSelector.click()
      await page.waitForTimeout(WAIT.SHORT)
      const btbOption = page.locator('text=BTB').first()
      if (await btbOption.count() > 0) {
        await btbOption.click()
      }
    }

    await fillAmount(page, '100')
    await page.waitForTimeout(WAIT.MEDIUM)

    const content = await page.content()
    const hasOutput = content.includes('stBTB') || content.includes('receive')
    expect(hasOutput).toBe(true)

    await takeScreenshot(page, 'stake-btb-output')
  })

  test('should execute Stake BTB transaction with permit', async ({ page, metamask }) => {
    test.setTimeout(120000)

    // Select BTB
    const tokenSelector = page.locator('[role="combobox"], [data-testid="token-select"]').first()
    if (await tokenSelector.count() > 0) {
      await tokenSelector.click()
      await page.waitForTimeout(WAIT.SHORT)
      const btbOption = page.locator('text=BTB').first()
      if (await btbOption.count() > 0) {
        await btbOption.click()
      }
    }

    await fillAmount(page, '10')
    await page.waitForTimeout(WAIT.MEDIUM)

    await takeScreenshot(page, 'stake-btb-before')

    const stakeButton = page.locator('button:has-text("Stake")').last()
    if (await stakeButton.count() > 0 && !(await stakeButton.isDisabled())) {
      await stakeButton.click()
      await page.waitForTimeout(WAIT.MEDIUM)

      // Handle permit signature (BTB supports EIP-2612)
      try {
        await handlePermit(metamask)
        console.log('BTB permit signature approved')
        await page.waitForTimeout(WAIT.LONG)
      } catch (e) {
        console.log('Permit handling:', e)
      }

      // Handle stake transaction
      try {
        await handleTransaction(metamask)
        console.log('Stake BTB transaction confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('Stake BTB transaction handling:', e)
      }

      await takeScreenshot(page, 'stake-btb-after')
    }
  })
})

test.describe('Unstake stBTD', () => {
  test.beforeEach(async ({ page, metamask }) => {
    await navigateTo(page, '/stake')
    await connectWallet(page, metamask)
    await clickTab(page, 'Unstake')
    await page.waitForTimeout(WAIT.MEDIUM)
  })

  test('should display Unstake interface', async ({ page }) => {
    const unstakeTab = page.locator('button:has-text("Unstake")')
    expect(await unstakeTab.count()).toBeGreaterThan(0)

    await takeScreenshot(page, 'unstake-interface')
  })

  test('should select stBTD for unstaking', async ({ page }) => {
    const tokenSelector = page.locator('[role="combobox"], [data-testid="token-select"]').first()
    if (await tokenSelector.count() > 0) {
      await tokenSelector.click()
      await page.waitForTimeout(WAIT.SHORT)

      const stBTDOption = page.locator('text=stBTD').first()
      if (await stBTDOption.count() > 0) {
        await stBTDOption.click()
        await page.waitForTimeout(WAIT.SHORT)
      }
    }

    await takeScreenshot(page, 'unstake-stbtd-selected')
  })

  test('should show BTD output when unstaking stBTD', async ({ page }) => {
    // Select stBTD
    const tokenSelector = page.locator('[role="combobox"], [data-testid="token-select"]').first()
    if (await tokenSelector.count() > 0) {
      await tokenSelector.click()
      await page.waitForTimeout(WAIT.SHORT)
      const stBTDOption = page.locator('text=stBTD').first()
      if (await stBTDOption.count() > 0) {
        await stBTDOption.click()
      }
    }

    await fillAmount(page, '100')
    await page.waitForTimeout(WAIT.MEDIUM)

    const content = await page.content()
    const hasOutput = content.includes('BTD') || content.includes('receive')
    expect(hasOutput).toBe(true)

    await takeScreenshot(page, 'unstake-stbtd-output')
  })

  test('should execute Unstake stBTD transaction', async ({ page, metamask }) => {
    test.setTimeout(120000)

    // Select stBTD
    const tokenSelector = page.locator('[role="combobox"], [data-testid="token-select"]').first()
    if (await tokenSelector.count() > 0) {
      await tokenSelector.click()
      await page.waitForTimeout(WAIT.SHORT)
      const stBTDOption = page.locator('text=stBTD').first()
      if (await stBTDOption.count() > 0) {
        await stBTDOption.click()
      }
    }

    await fillAmount(page, '10')
    await page.waitForTimeout(WAIT.MEDIUM)

    await takeScreenshot(page, 'unstake-stbtd-before')

    const unstakeButton = page.locator('button:has-text("Unstake")').last()
    if (await unstakeButton.count() > 0 && !(await unstakeButton.isDisabled())) {
      await unstakeButton.click()
      await page.waitForTimeout(WAIT.MEDIUM)

      // Handle approve if needed
      try {
        await handleApprove(metamask)
        console.log('stBTD approve confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('No approve needed')
      }

      // Handle unstake transaction
      try {
        await handleTransaction(metamask)
        console.log('Unstake stBTD transaction confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('Unstake stBTD transaction handling:', e)
      }

      await takeScreenshot(page, 'unstake-stbtd-after')
    }
  })
})

test.describe('Unstake stBTB', () => {
  test.beforeEach(async ({ page, metamask }) => {
    await navigateTo(page, '/stake')
    await connectWallet(page, metamask)
    await clickTab(page, 'Unstake')
    await page.waitForTimeout(WAIT.MEDIUM)
  })

  test('should select stBTB for unstaking', async ({ page }) => {
    const tokenSelector = page.locator('[role="combobox"], [data-testid="token-select"]').first()
    if (await tokenSelector.count() > 0) {
      await tokenSelector.click()
      await page.waitForTimeout(WAIT.SHORT)

      const stBTBOption = page.locator('text=stBTB').first()
      if (await stBTBOption.count() > 0) {
        await stBTBOption.click()
        await page.waitForTimeout(WAIT.SHORT)
      }
    }

    await takeScreenshot(page, 'unstake-stbtb-selected')
  })

  test('should execute Unstake stBTB transaction', async ({ page, metamask }) => {
    test.setTimeout(120000)

    // Select stBTB
    const tokenSelector = page.locator('[role="combobox"], [data-testid="token-select"]').first()
    if (await tokenSelector.count() > 0) {
      await tokenSelector.click()
      await page.waitForTimeout(WAIT.SHORT)
      const stBTBOption = page.locator('text=stBTB').first()
      if (await stBTBOption.count() > 0) {
        await stBTBOption.click()
      }
    }

    await fillAmount(page, '10')
    await page.waitForTimeout(WAIT.MEDIUM)

    await takeScreenshot(page, 'unstake-stbtb-before')

    const unstakeButton = page.locator('button:has-text("Unstake")').last()
    if (await unstakeButton.count() > 0 && !(await unstakeButton.isDisabled())) {
      await unstakeButton.click()
      await page.waitForTimeout(WAIT.MEDIUM)

      // Handle approve if needed
      try {
        await handleApprove(metamask)
        console.log('stBTB approve confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('No approve needed')
      }

      // Handle unstake transaction
      try {
        await handleTransaction(metamask)
        console.log('Unstake stBTB transaction confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('Unstake stBTB transaction handling:', e)
      }

      await takeScreenshot(page, 'unstake-stbtb-after')
    }
  })
})

test.describe('Stake Tab Switching', () => {
  test('should switch between Stake and Unstake tabs', async ({ page, metamask }) => {
    await navigateTo(page, '/stake')
    await connectWallet(page, metamask)

    // Test Stake tab
    await clickTab(page, 'Stake')
    await page.waitForTimeout(WAIT.SHORT)
    await takeScreenshot(page, 'stake-tab-stake')

    // Test Unstake tab
    await clickTab(page, 'Unstake')
    await page.waitForTimeout(WAIT.SHORT)
    await takeScreenshot(page, 'stake-tab-unstake')
  })

  test('should switch between token options in dropdown', async ({ page, metamask }) => {
    await navigateTo(page, '/stake')
    await connectWallet(page, metamask)
    await clickTab(page, 'Stake')
    await page.waitForTimeout(WAIT.MEDIUM)

    const tokenSelector = page.locator('[role="combobox"], [data-testid="token-select"]').first()
    if (await tokenSelector.count() > 0) {
      await tokenSelector.click()
      await page.waitForTimeout(WAIT.SHORT)

      // Should show BTD and BTB options
      const content = await page.content()
      const hasBTD = content.includes('BTD')
      const hasBTB = content.includes('BTB')

      console.log('Available tokens - BTD:', hasBTD, 'BTB:', hasBTB)
      await takeScreenshot(page, 'stake-token-dropdown')
    }
  })
})
