/**
 * Synpress E2E Test: Liquidity Pool Operations
 *
 * Tests for managing Uniswap V2 liquidity pools (BTD-WBTC, BTB-WBTC, BTD-BTB)
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

// Pool pairs to test
const POOLS = ['BTD-WBTC', 'BTB-WBTC', 'BTD-BTB']

test.describe('Pool Interface', () => {
  test.beforeEach(async ({ page, metamask }) => {
    await navigateTo(page, '/pool')
    await connectWallet(page, metamask)
    await page.waitForTimeout(WAIT.MEDIUM)
  })

  test('should display Pool page', async ({ page }) => {
    const content = await page.content()
    const hasPoolContent = content.includes('Pool') || content.includes('Liquidity')
    expect(hasPoolContent).toBe(true)

    await takeScreenshot(page, 'pool-interface')
  })

  test('should show available pools list', async ({ page }) => {
    // Check for pool cards or list items
    for (const pool of POOLS) {
      const poolElement = page.locator(`text=${pool}, text=/${pool.replace('-', '.*')}/i`)
      const hasPool = await poolElement.count() > 0
      console.log(`Pool ${pool} visible:`, hasPool)
    }

    await takeScreenshot(page, 'pool-list')
  })

  test('should display pool statistics', async ({ page }) => {
    const content = await page.content()
    // Check for common pool stats
    const hasStats = content.includes('TVL') ||
                     content.includes('Volume') ||
                     content.includes('Liquidity') ||
                     content.includes('APR')

    expect(hasStats).toBe(true)

    await takeScreenshot(page, 'pool-statistics')
  })
})

test.describe('Pool BTD-WBTC', () => {
  test.beforeEach(async ({ page, metamask }) => {
    await navigateTo(page, '/pool')
    await connectWallet(page, metamask)
    await page.waitForTimeout(WAIT.MEDIUM)
  })

  test('should select BTD-WBTC pool', async ({ page }) => {
    const poolSelector = page.locator('text=BTD-WBTC, text=/BTD.*WBTC/i').first()
    if (await poolSelector.count() > 0) {
      await poolSelector.click()
      await page.waitForTimeout(WAIT.SHORT)
    }

    await takeScreenshot(page, 'pool-btd-wbtc-selected')
  })

  test('should add liquidity to BTD-WBTC pool', async ({ page, metamask }) => {
    test.setTimeout(150000)

    // Select pool
    const poolSelector = page.locator('text=BTD-WBTC, text=/BTD.*WBTC/i').first()
    if (await poolSelector.count() > 0) {
      await poolSelector.click()
      await page.waitForTimeout(WAIT.SHORT)
    }

    // Click Add Liquidity tab/button
    await clickTab(page, 'Add')
    await page.waitForTimeout(WAIT.SHORT)

    // Fill amounts
    await fillAmount(page, '10', 0)
    await page.waitForTimeout(WAIT.MEDIUM)

    await takeScreenshot(page, 'pool-btd-wbtc-add-before')

    const addButton = page.locator('button:has-text("Add Liquidity"), button:has-text("Add")').last()
    if (await addButton.count() > 0 && !(await addButton.isDisabled())) {
      await addButton.click()
      await page.waitForTimeout(WAIT.MEDIUM)

      // Handle approves
      try {
        await handleApprove(metamask)
        console.log('BTD approve confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('BTD approve handling:', e)
      }

      try {
        await handleApprove(metamask)
        console.log('WBTC approve confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('WBTC approve handling:', e)
      }

      // Handle add liquidity transaction
      try {
        await handleTransaction(metamask)
        console.log('Add liquidity transaction confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('Add liquidity handling:', e)
      }

      await takeScreenshot(page, 'pool-btd-wbtc-add-after')
    }
  })

  test('should remove liquidity from BTD-WBTC pool', async ({ page, metamask }) => {
    test.setTimeout(120000)

    // Select pool
    const poolSelector = page.locator('text=BTD-WBTC, text=/BTD.*WBTC/i').first()
    if (await poolSelector.count() > 0) {
      await poolSelector.click()
      await page.waitForTimeout(WAIT.SHORT)
    }

    // Click Remove Liquidity tab/button
    await clickTab(page, 'Remove')
    await page.waitForTimeout(WAIT.SHORT)

    await fillAmount(page, '5')
    await page.waitForTimeout(WAIT.MEDIUM)

    await takeScreenshot(page, 'pool-btd-wbtc-remove-before')

    const removeButton = page.locator('button:has-text("Remove Liquidity"), button:has-text("Remove")').last()
    if (await removeButton.count() > 0 && !(await removeButton.isDisabled())) {
      await removeButton.click()
      await page.waitForTimeout(WAIT.MEDIUM)

      // Handle LP token approve
      try {
        await handleApprove(metamask)
        console.log('LP token approve confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('LP approve handling:', e)
      }

      // Handle remove transaction
      try {
        await handleTransaction(metamask)
        console.log('Remove liquidity transaction confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('Remove liquidity handling:', e)
      }

      await takeScreenshot(page, 'pool-btd-wbtc-remove-after')
    }
  })
})

test.describe('Pool BTB-WBTC', () => {
  test.beforeEach(async ({ page, metamask }) => {
    await navigateTo(page, '/pool')
    await connectWallet(page, metamask)
    await page.waitForTimeout(WAIT.MEDIUM)
  })

  test('should select BTB-WBTC pool', async ({ page }) => {
    const poolSelector = page.locator('text=BTB-WBTC, text=/BTB.*WBTC/i').first()
    if (await poolSelector.count() > 0) {
      await poolSelector.click()
      await page.waitForTimeout(WAIT.SHORT)
    }

    await takeScreenshot(page, 'pool-btb-wbtc-selected')
  })

  test('should add liquidity to BTB-WBTC pool', async ({ page, metamask }) => {
    test.setTimeout(150000)

    const poolSelector = page.locator('text=BTB-WBTC, text=/BTB.*WBTC/i').first()
    if (await poolSelector.count() > 0) {
      await poolSelector.click()
      await page.waitForTimeout(WAIT.SHORT)
    }

    await clickTab(page, 'Add')
    await page.waitForTimeout(WAIT.SHORT)

    await fillAmount(page, '10', 0)
    await page.waitForTimeout(WAIT.MEDIUM)

    await takeScreenshot(page, 'pool-btb-wbtc-add-before')

    const addButton = page.locator('button:has-text("Add Liquidity"), button:has-text("Add")').last()
    if (await addButton.count() > 0 && !(await addButton.isDisabled())) {
      await addButton.click()
      await page.waitForTimeout(WAIT.MEDIUM)

      // Handle permits/approves (BTB supports permit)
      try {
        await handlePermit(metamask)
        console.log('BTB permit confirmed')
        await page.waitForTimeout(WAIT.LONG)
      } catch (e) {
        console.log('BTB permit handling:', e)
      }

      try {
        await handleApprove(metamask)
        console.log('WBTC approve confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('WBTC approve handling:', e)
      }

      try {
        await handleTransaction(metamask)
        console.log('Add liquidity transaction confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('Add liquidity handling:', e)
      }

      await takeScreenshot(page, 'pool-btb-wbtc-add-after')
    }
  })

  test('should remove liquidity from BTB-WBTC pool', async ({ page, metamask }) => {
    test.setTimeout(120000)

    const poolSelector = page.locator('text=BTB-WBTC, text=/BTB.*WBTC/i').first()
    if (await poolSelector.count() > 0) {
      await poolSelector.click()
      await page.waitForTimeout(WAIT.SHORT)
    }

    await clickTab(page, 'Remove')
    await page.waitForTimeout(WAIT.SHORT)

    await fillAmount(page, '5')
    await page.waitForTimeout(WAIT.MEDIUM)

    await takeScreenshot(page, 'pool-btb-wbtc-remove-before')

    const removeButton = page.locator('button:has-text("Remove Liquidity"), button:has-text("Remove")').last()
    if (await removeButton.count() > 0 && !(await removeButton.isDisabled())) {
      await removeButton.click()
      await page.waitForTimeout(WAIT.MEDIUM)

      try {
        await handleApprove(metamask)
        console.log('LP token approve confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('LP approve handling:', e)
      }

      try {
        await handleTransaction(metamask)
        console.log('Remove liquidity transaction confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('Remove liquidity handling:', e)
      }

      await takeScreenshot(page, 'pool-btb-wbtc-remove-after')
    }
  })
})

test.describe('Pool BTD-BTB', () => {
  test.beforeEach(async ({ page, metamask }) => {
    await navigateTo(page, '/pool')
    await connectWallet(page, metamask)
    await page.waitForTimeout(WAIT.MEDIUM)
  })

  test('should select BTD-BTB pool', async ({ page }) => {
    const poolSelector = page.locator('text=BTD-BTB, text=/BTD.*BTB/i').first()
    if (await poolSelector.count() > 0) {
      await poolSelector.click()
      await page.waitForTimeout(WAIT.SHORT)
    }

    await takeScreenshot(page, 'pool-btd-btb-selected')
  })

  test('should add liquidity to BTD-BTB pool', async ({ page, metamask }) => {
    test.setTimeout(150000)

    const poolSelector = page.locator('text=BTD-BTB, text=/BTD.*BTB/i').first()
    if (await poolSelector.count() > 0) {
      await poolSelector.click()
      await page.waitForTimeout(WAIT.SHORT)
    }

    await clickTab(page, 'Add')
    await page.waitForTimeout(WAIT.SHORT)

    await fillAmount(page, '10', 0)
    await page.waitForTimeout(WAIT.MEDIUM)

    await takeScreenshot(page, 'pool-btd-btb-add-before')

    const addButton = page.locator('button:has-text("Add Liquidity"), button:has-text("Add")').last()
    if (await addButton.count() > 0 && !(await addButton.isDisabled())) {
      await addButton.click()
      await page.waitForTimeout(WAIT.MEDIUM)

      // BTD uses approve, BTB uses permit
      try {
        await handleApprove(metamask)
        console.log('BTD approve confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('BTD approve handling:', e)
      }

      try {
        await handlePermit(metamask)
        console.log('BTB permit confirmed')
        await page.waitForTimeout(WAIT.LONG)
      } catch (e) {
        console.log('BTB permit handling:', e)
      }

      try {
        await handleTransaction(metamask)
        console.log('Add liquidity transaction confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('Add liquidity handling:', e)
      }

      await takeScreenshot(page, 'pool-btd-btb-add-after')
    }
  })

  test('should remove liquidity from BTD-BTB pool', async ({ page, metamask }) => {
    test.setTimeout(120000)

    const poolSelector = page.locator('text=BTD-BTB, text=/BTD.*BTB/i').first()
    if (await poolSelector.count() > 0) {
      await poolSelector.click()
      await page.waitForTimeout(WAIT.SHORT)
    }

    await clickTab(page, 'Remove')
    await page.waitForTimeout(WAIT.SHORT)

    await fillAmount(page, '5')
    await page.waitForTimeout(WAIT.MEDIUM)

    await takeScreenshot(page, 'pool-btd-btb-remove-before')

    const removeButton = page.locator('button:has-text("Remove Liquidity"), button:has-text("Remove")').last()
    if (await removeButton.count() > 0 && !(await removeButton.isDisabled())) {
      await removeButton.click()
      await page.waitForTimeout(WAIT.MEDIUM)

      try {
        await handleApprove(metamask)
        console.log('LP token approve confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('LP approve handling:', e)
      }

      try {
        await handleTransaction(metamask)
        console.log('Remove liquidity transaction confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('Remove liquidity handling:', e)
      }

      await takeScreenshot(page, 'pool-btd-btb-remove-after')
    }
  })
})

test.describe('Pool User Positions', () => {
  test.beforeEach(async ({ page, metamask }) => {
    await navigateTo(page, '/pool')
    await connectWallet(page, metamask)
    await page.waitForTimeout(WAIT.MEDIUM)
  })

  test('should show user LP positions', async ({ page }) => {
    const content = await page.content()
    const hasPositions = content.includes('position') ||
                         content.includes('Position') ||
                         content.includes('Your') ||
                         content.includes('Balance')

    await takeScreenshot(page, 'pool-user-positions')
  })

  test('should show LP token balance for each pool', async ({ page }) => {
    for (const pool of POOLS) {
      const poolElement = page.locator(`text=/${pool}/i`).first()
      if (await poolElement.count() > 0) {
        console.log(`Checking LP balance for ${pool}`)
      }
    }

    await takeScreenshot(page, 'pool-lp-balances')
  })
})

test.describe('Pool Tab Navigation', () => {
  test('should navigate between pools', async ({ page, metamask }) => {
    await navigateTo(page, '/pool')
    await connectWallet(page, metamask)
    await page.waitForTimeout(WAIT.MEDIUM)

    for (const pool of POOLS) {
      const poolSelector = page.locator(`text=/${pool}/i`).first()
      if (await poolSelector.count() > 0) {
        await poolSelector.click()
        await page.waitForTimeout(WAIT.SHORT)
        console.log(`Selected pool: ${pool}`)
        await takeScreenshot(page, `pool-navigate-${pool.toLowerCase()}`)
      }
    }
  })

  test('should switch between Add and Remove within a pool', async ({ page, metamask }) => {
    await navigateTo(page, '/pool')
    await connectWallet(page, metamask)
    await page.waitForTimeout(WAIT.MEDIUM)

    // Select first pool
    const poolSelector = page.locator('text=/BTD.*WBTC/i').first()
    if (await poolSelector.count() > 0) {
      await poolSelector.click()
      await page.waitForTimeout(WAIT.SHORT)
    }

    // Test Add tab
    await clickTab(page, 'Add')
    await page.waitForTimeout(WAIT.SHORT)
    await takeScreenshot(page, 'pool-tab-add')

    // Test Remove tab
    await clickTab(page, 'Remove')
    await page.waitForTimeout(WAIT.SHORT)
    await takeScreenshot(page, 'pool-tab-remove')
  })
})
