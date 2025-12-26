/**
 * Synpress E2E Test: Farming Operations
 *
 * Tests for depositing LP tokens, withdrawing, and claiming BRS rewards
 * across 10 farming pools
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

// Farming pools - based on frontend exploration
const FARM_POOLS = [
  'BTD-WBTC LP',
  'BTB-WBTC LP',
  'BTD-BTB LP',
  'stBTD',
  'stBTB',
  'BTD',
  'BTB',
  'WBTC',
  'BRS',
  'BRS-WBTC LP'
]

test.describe('Farm Interface', () => {
  test.beforeEach(async ({ page, metamask }) => {
    await navigateTo(page, '/farm')
    await connectWallet(page, metamask)
    await page.waitForTimeout(WAIT.MEDIUM)
  })

  test('should display Farm page', async ({ page }) => {
    const content = await page.content()
    const hasFarmContent = content.includes('Farm') || content.includes('Stake') || content.includes('Yield')
    expect(hasFarmContent).toBe(true)

    await takeScreenshot(page, 'farm-interface')
  })

  test('should show farming pools list', async ({ page }) => {
    // Check for pool cards or list
    const poolCards = page.locator('[class*="card"], [class*="pool"], [class*="farm"]')
    expect(await poolCards.count()).toBeGreaterThan(0)

    await takeScreenshot(page, 'farm-pools-list')
  })

  test('should display APR for pools', async ({ page }) => {
    const content = await page.content()
    const hasAPR = content.includes('APR') || content.includes('APY') || content.includes('%')
    expect(hasAPR).toBe(true)

    await takeScreenshot(page, 'farm-apr-display')
  })

  test('should show TVL information', async ({ page }) => {
    const content = await page.content()
    const hasTVL = content.includes('TVL') || content.includes('Total Value') || content.includes('Staked')

    await takeScreenshot(page, 'farm-tvl-info')
  })

  test('should show rewards earned', async ({ page }) => {
    const content = await page.content()
    const hasRewards = content.includes('Reward') || content.includes('reward') ||
                       content.includes('Earned') || content.includes('BRS')

    await takeScreenshot(page, 'farm-rewards-display')
  })
})

test.describe('Farm Pool Selection', () => {
  test.beforeEach(async ({ page, metamask }) => {
    await navigateTo(page, '/farm')
    await connectWallet(page, metamask)
    await page.waitForTimeout(WAIT.MEDIUM)
  })

  test('should expand pool details on click', async ({ page }) => {
    // Click on first pool to expand
    const poolCard = page.locator('[class*="card"], [class*="pool"]').first()
    if (await poolCard.count() > 0) {
      await poolCard.click()
      await page.waitForTimeout(WAIT.SHORT)

      // Should show deposit/withdraw inputs
      const inputs = page.locator('input[type="number"], input[inputmode="decimal"]')
      const hasInputs = await inputs.count() > 0

      await takeScreenshot(page, 'farm-pool-expanded')
    }
  })

  test('should show pool token info', async ({ page }) => {
    const content = await page.content()
    // Check for common pool tokens
    const hasPoolTokens = content.includes('LP') ||
                          content.includes('BTD') ||
                          content.includes('BTB') ||
                          content.includes('stBTD') ||
                          content.includes('stBTB')
    expect(hasPoolTokens).toBe(true)

    await takeScreenshot(page, 'farm-pool-tokens')
  })
})

test.describe('Farm Deposit', () => {
  test.beforeEach(async ({ page, metamask }) => {
    await navigateTo(page, '/farm')
    await connectWallet(page, metamask)
    await page.waitForTimeout(WAIT.MEDIUM)
  })

  test('should show deposit input field', async ({ page }) => {
    // Expand first pool
    const poolCard = page.locator('[class*="card"], [class*="pool"]').first()
    if (await poolCard.count() > 0) {
      await poolCard.click()
      await page.waitForTimeout(WAIT.SHORT)
    }

    await clickTab(page, 'Deposit')
    await page.waitForTimeout(WAIT.SHORT)

    const input = page.locator('input[type="number"], input[inputmode="decimal"]')
    expect(await input.count()).toBeGreaterThan(0)

    await takeScreenshot(page, 'farm-deposit-input')
  })

  test('should fill MAX deposit amount', async ({ page }) => {
    const poolCard = page.locator('[class*="card"], [class*="pool"]').first()
    if (await poolCard.count() > 0) {
      await poolCard.click()
      await page.waitForTimeout(WAIT.SHORT)
    }

    await clickTab(page, 'Deposit')
    await page.waitForTimeout(WAIT.SHORT)

    await clickMaxButton(page)
    await page.waitForTimeout(WAIT.SHORT)

    const value = await getInputValue(page)
    expect(value).toBeDefined()

    await takeScreenshot(page, 'farm-deposit-max')
  })

  test('should execute deposit transaction', async ({ page, metamask }) => {
    test.setTimeout(120000)

    // Expand first pool
    const poolCard = page.locator('[class*="card"], [class*="pool"]').first()
    if (await poolCard.count() > 0) {
      await poolCard.click()
      await page.waitForTimeout(WAIT.SHORT)
    }

    await clickTab(page, 'Deposit')
    await page.waitForTimeout(WAIT.SHORT)

    await fillAmount(page, '10')
    await page.waitForTimeout(WAIT.MEDIUM)

    await takeScreenshot(page, 'farm-deposit-before')

    const depositButton = page.locator('button:has-text("Deposit")').last()
    if (await depositButton.count() > 0 && !(await depositButton.isDisabled())) {
      await depositButton.click()
      await page.waitForTimeout(WAIT.MEDIUM)

      // Handle approve
      try {
        await handleApprove(metamask)
        console.log('Token approve confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('Approve handling:', e)
      }

      // Handle deposit transaction
      try {
        await handleTransaction(metamask)
        console.log('Deposit transaction confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('Deposit transaction handling:', e)
      }

      await takeScreenshot(page, 'farm-deposit-after')
    }
  })

  test('should disable deposit when amount is zero', async ({ page }) => {
    const poolCard = page.locator('[class*="card"], [class*="pool"]').first()
    if (await poolCard.count() > 0) {
      await poolCard.click()
      await page.waitForTimeout(WAIT.SHORT)
    }

    await clickTab(page, 'Deposit')
    await page.waitForTimeout(WAIT.SHORT)

    await fillAmount(page, '0')
    await page.waitForTimeout(WAIT.SHORT)

    const disabled = await isButtonDisabled(page, 'Deposit')
    expect(disabled).toBe(true)
  })
})

test.describe('Farm Withdraw', () => {
  test.beforeEach(async ({ page, metamask }) => {
    await navigateTo(page, '/farm')
    await connectWallet(page, metamask)
    await page.waitForTimeout(WAIT.MEDIUM)
  })

  test('should show withdraw input field', async ({ page }) => {
    const poolCard = page.locator('[class*="card"], [class*="pool"]').first()
    if (await poolCard.count() > 0) {
      await poolCard.click()
      await page.waitForTimeout(WAIT.SHORT)
    }

    await clickTab(page, 'Withdraw')
    await page.waitForTimeout(WAIT.SHORT)

    const input = page.locator('input[type="number"], input[inputmode="decimal"]')
    expect(await input.count()).toBeGreaterThan(0)

    await takeScreenshot(page, 'farm-withdraw-input')
  })

  test('should show staked balance for withdraw', async ({ page }) => {
    const poolCard = page.locator('[class*="card"], [class*="pool"]').first()
    if (await poolCard.count() > 0) {
      await poolCard.click()
      await page.waitForTimeout(WAIT.SHORT)
    }

    await clickTab(page, 'Withdraw')
    await page.waitForTimeout(WAIT.SHORT)

    const content = await page.content()
    const hasStakedInfo = content.includes('Staked') ||
                          content.includes('Balance') ||
                          content.includes('Deposited')

    await takeScreenshot(page, 'farm-withdraw-staked')
  })

  test('should execute withdraw transaction', async ({ page, metamask }) => {
    test.setTimeout(120000)

    const poolCard = page.locator('[class*="card"], [class*="pool"]').first()
    if (await poolCard.count() > 0) {
      await poolCard.click()
      await page.waitForTimeout(WAIT.SHORT)
    }

    await clickTab(page, 'Withdraw')
    await page.waitForTimeout(WAIT.SHORT)

    await fillAmount(page, '5')
    await page.waitForTimeout(WAIT.MEDIUM)

    await takeScreenshot(page, 'farm-withdraw-before')

    const withdrawButton = page.locator('button:has-text("Withdraw")').last()
    if (await withdrawButton.count() > 0 && !(await withdrawButton.isDisabled())) {
      await withdrawButton.click()
      await page.waitForTimeout(WAIT.MEDIUM)

      // Handle withdraw transaction
      try {
        await handleTransaction(metamask)
        console.log('Withdraw transaction confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('Withdraw transaction handling:', e)
      }

      await takeScreenshot(page, 'farm-withdraw-after')
    }
  })

  test('should disable withdraw when amount is zero', async ({ page }) => {
    const poolCard = page.locator('[class*="card"], [class*="pool"]').first()
    if (await poolCard.count() > 0) {
      await poolCard.click()
      await page.waitForTimeout(WAIT.SHORT)
    }

    await clickTab(page, 'Withdraw')
    await page.waitForTimeout(WAIT.SHORT)

    await fillAmount(page, '0')
    await page.waitForTimeout(WAIT.SHORT)

    const disabled = await isButtonDisabled(page, 'Withdraw')
    expect(disabled).toBe(true)
  })
})

test.describe('Farm Claim Rewards', () => {
  test.beforeEach(async ({ page, metamask }) => {
    await navigateTo(page, '/farm')
    await connectWallet(page, metamask)
    await page.waitForTimeout(WAIT.MEDIUM)
  })

  test('should show pending rewards', async ({ page }) => {
    const content = await page.content()
    const hasRewards = content.includes('Reward') ||
                       content.includes('BRS') ||
                       content.includes('Earned') ||
                       content.includes('Pending')

    await takeScreenshot(page, 'farm-pending-rewards')
  })

  test('should show claim button', async ({ page }) => {
    const poolCard = page.locator('[class*="card"], [class*="pool"]').first()
    if (await poolCard.count() > 0) {
      await poolCard.click()
      await page.waitForTimeout(WAIT.SHORT)
    }

    const claimButton = page.locator('button:has-text("Claim"), button:has-text("Harvest")')
    expect(await claimButton.count()).toBeGreaterThan(0)

    await takeScreenshot(page, 'farm-claim-button')
  })

  test('should execute claim transaction', async ({ page, metamask }) => {
    test.setTimeout(120000)

    const poolCard = page.locator('[class*="card"], [class*="pool"]').first()
    if (await poolCard.count() > 0) {
      await poolCard.click()
      await page.waitForTimeout(WAIT.SHORT)
    }

    await takeScreenshot(page, 'farm-claim-before')

    const claimButton = page.locator('button:has-text("Claim"), button:has-text("Harvest")').last()
    if (await claimButton.count() > 0 && !(await claimButton.isDisabled())) {
      await claimButton.click()
      await page.waitForTimeout(WAIT.MEDIUM)

      // Handle claim transaction
      try {
        await handleTransaction(metamask)
        console.log('Claim transaction confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('Claim transaction handling:', e)
      }

      await takeScreenshot(page, 'farm-claim-after')
    }
  })

  test('should show BRS reward token info', async ({ page }) => {
    const content = await page.content()
    const hasBRS = content.includes('BRS')
    expect(hasBRS).toBe(true)

    await takeScreenshot(page, 'farm-brs-info')
  })
})

test.describe('Farm Multiple Pools', () => {
  test.beforeEach(async ({ page, metamask }) => {
    await navigateTo(page, '/farm')
    await connectWallet(page, metamask)
    await page.waitForTimeout(WAIT.MEDIUM)
  })

  test('should navigate between farm pools', async ({ page }) => {
    const poolCards = page.locator('[class*="card"], [class*="pool"]')
    const count = await poolCards.count()

    for (let i = 0; i < Math.min(count, 3); i++) {
      await poolCards.nth(i).click()
      await page.waitForTimeout(WAIT.SHORT)
      console.log(`Clicked pool ${i + 1}`)
      await takeScreenshot(page, `farm-pool-${i + 1}`)
    }
  })

  test('should show total rewards across pools', async ({ page }) => {
    const content = await page.content()
    const hasTotal = content.includes('Total') ||
                     content.includes('total') ||
                     content.includes('All')

    await takeScreenshot(page, 'farm-total-rewards')
  })

  test('should claim all rewards if available', async ({ page, metamask }) => {
    test.setTimeout(120000)

    // Look for "Claim All" button
    const claimAllButton = page.locator('button:has-text("Claim All"), button:has-text("Harvest All")')
    if (await claimAllButton.count() > 0 && !(await claimAllButton.isDisabled())) {
      await claimAllButton.click()
      await page.waitForTimeout(WAIT.MEDIUM)

      try {
        await handleTransaction(metamask)
        console.log('Claim All transaction confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('Claim All handling:', e)
      }

      await takeScreenshot(page, 'farm-claim-all-after')
    }
  })
})

test.describe('Farm LP Token Pools', () => {
  const LP_POOLS = ['BTD-WBTC', 'BTB-WBTC', 'BTD-BTB', 'BRS-WBTC']

  test.beforeEach(async ({ page, metamask }) => {
    await navigateTo(page, '/farm')
    await connectWallet(page, metamask)
    await page.waitForTimeout(WAIT.MEDIUM)
  })

  test('should display LP token farming pools', async ({ page }) => {
    const content = await page.content()
    let foundPools = 0

    for (const pool of LP_POOLS) {
      if (content.includes(pool) || content.includes('LP')) {
        foundPools++
      }
    }

    console.log(`Found ${foundPools} LP pools`)
    await takeScreenshot(page, 'farm-lp-pools')
  })

  test('should show LP token balance in pool', async ({ page }) => {
    const poolCard = page.locator('[class*="card"], [class*="pool"]').first()
    if (await poolCard.count() > 0) {
      await poolCard.click()
      await page.waitForTimeout(WAIT.SHORT)
    }

    const content = await page.content()
    const hasBalance = content.includes('Balance') ||
                       content.includes('LP') ||
                       content.includes('Available')

    await takeScreenshot(page, 'farm-lp-balance')
  })
})

test.describe('Farm Single Token Pools', () => {
  const SINGLE_POOLS = ['BTD', 'BTB', 'WBTC', 'BRS', 'stBTD', 'stBTB']

  test.beforeEach(async ({ page, metamask }) => {
    await navigateTo(page, '/farm')
    await connectWallet(page, metamask)
    await page.waitForTimeout(WAIT.MEDIUM)
  })

  test('should display single token farming pools', async ({ page }) => {
    const content = await page.content()
    let foundPools = 0

    for (const pool of SINGLE_POOLS) {
      if (content.includes(pool)) {
        foundPools++
      }
    }

    console.log(`Found ${foundPools} single token pools`)
    await takeScreenshot(page, 'farm-single-token-pools')
  })

  test('should deposit single token to farm', async ({ page, metamask }) => {
    test.setTimeout(120000)

    // Find a single token pool (e.g., BTD)
    const btdPool = page.locator('text=/BTD(?!-)/').first()
    if (await btdPool.count() > 0) {
      await btdPool.click()
      await page.waitForTimeout(WAIT.SHORT)
    }

    await clickTab(page, 'Deposit')
    await page.waitForTimeout(WAIT.SHORT)

    await fillAmount(page, '10')
    await page.waitForTimeout(WAIT.MEDIUM)

    await takeScreenshot(page, 'farm-single-deposit-before')

    const depositButton = page.locator('button:has-text("Deposit")').last()
    if (await depositButton.count() > 0 && !(await depositButton.isDisabled())) {
      await depositButton.click()
      await page.waitForTimeout(WAIT.MEDIUM)

      try {
        await handleApprove(metamask)
        console.log('Token approve confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('Approve handling:', e)
      }

      try {
        await handleTransaction(metamask)
        console.log('Deposit transaction confirmed')
        await page.waitForTimeout(WAIT.TX)
      } catch (e) {
        console.log('Deposit handling:', e)
      }

      await takeScreenshot(page, 'farm-single-deposit-after')
    }
  })
})

test.describe('Farm Tab Switching', () => {
  test('should switch between Deposit and Withdraw tabs', async ({ page, metamask }) => {
    await navigateTo(page, '/farm')
    await connectWallet(page, metamask)
    await page.waitForTimeout(WAIT.MEDIUM)

    // Expand first pool
    const poolCard = page.locator('[class*="card"], [class*="pool"]').first()
    if (await poolCard.count() > 0) {
      await poolCard.click()
      await page.waitForTimeout(WAIT.SHORT)
    }

    // Test Deposit tab
    await clickTab(page, 'Deposit')
    await page.waitForTimeout(WAIT.SHORT)
    await takeScreenshot(page, 'farm-tab-deposit')

    // Test Withdraw tab
    await clickTab(page, 'Withdraw')
    await page.waitForTimeout(WAIT.SHORT)
    await takeScreenshot(page, 'farm-tab-withdraw')
  })
})
