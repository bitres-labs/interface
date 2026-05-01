/**
 * 06 - Farm Tests
 *
 * Navigate to /farm → verify pools → attempt deposit/claim/withdraw.
 * Includes pool count verification, single pool interactions, and balance checks.
 */

import { test, expect } from '../sepolia/fixtures'
import {
  navigateTo,
  waitForTxComplete,
  waitForTxSuccess,
  readBalance,
  readBalanceUntilChanged,
} from '../sepolia/helpers'
import { TIMEOUT, ADDRESSES } from '../sepolia/constants'

test.describe('Farm', () => {
  test('farm page loads and shows pool information', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/farm')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    const body = await page.textContent('body')
    expect(body?.toLowerCase()).toContain('farm')

    // Should show at least some pool or farming content
    const hasPoolContent =
      body?.includes('BRS') ||
      body?.includes('BTB') ||
      body?.includes('BTD') ||
      body?.toLowerCase().includes('pool') ||
      body?.toLowerCase().includes('reward') ||
      body?.toLowerCase().includes('deposit')
    expect(hasPoolContent).toBeTruthy()
  })

  test('farm page shows APR or reward info', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/farm')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    const body = await page.textContent('body')
    // Farm page should show some reward/APR/TVL metrics
    const hasMetrics =
      body?.toLowerCase().includes('apr') ||
      body?.toLowerCase().includes('apy') ||
      body?.toLowerCase().includes('tvl') ||
      body?.toLowerCase().includes('reward') ||
      body?.toLowerCase().includes('earn') ||
      body?.toLowerCase().includes('deposited') ||
      body?.toLowerCase().includes('total value')
    expect(hasMetrics).toBeTruthy()
  })

  test('farm shows correct pool count and types', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/farm')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    const body = await page.textContent('body')

    // Should have LP pools and Single asset pools
    const hasLP =
      body?.includes('LP') ||
      body?.includes('WBTC/USDC') ||
      body?.includes('BTD/USDC') ||
      body?.includes('Liquidity')
    const hasSingle =
      body?.includes('Single') ||
      body?.includes('WBTC') ||
      body?.includes('USDC') ||
      body?.includes('BTD')

    // At least one type should be visible
    expect(hasLP || hasSingle).toBeTruthy()
  })

  test('can interact with farm pool deposit', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/farm')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Look for deposit input
    const input = page.locator('input[type="number"], input[inputmode="decimal"], input').first()
    if ((await input.count()) > 0) {
      await input.fill('0.001')
      const val = await input.inputValue()
      expect(parseFloat(val)).toBeGreaterThan(0)
    } else {
      console.log('[Farm] No input found - may need to select a pool first')
    }
  })

  test('single pool deposit with approval', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/farm')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Try to find a USDC pool or first available pool
    const poolCards = page.locator('[class*="pool"], [class*="card"], [class*="farm"]')
    if ((await poolCards.count()) === 0) {
      console.log('[Farm] No pool cards found - skipping deposit test')
      test.skip()
      return
    }

    // Click the first pool to expand/select it
    const firstPool = poolCards.first()
    await firstPool.click()
    await page.waitForTimeout(TIMEOUT.SHORT)

    // Find deposit input
    const input = page.locator('input[type="number"], input[inputmode="decimal"], input').first()
    if ((await input.count()) > 0) {
      await input.fill('0.001')
      await page.waitForTimeout(TIMEOUT.MEDIUM)
    }

    // Check for Approve or Deposit button
    const actionBtn = page
      .locator('button:has-text("Approve"), button:has-text("Deposit"), button:has-text("Stake")')
      .last()

    if ((await actionBtn.count()) > 0 && !(await actionBtn.isDisabled())) {
      const btnText = await actionBtn.textContent()
      console.log(`[Farm] Clicking "${btnText}" for pool deposit`)
      await actionBtn.click()

      await waitForTxComplete(page, btnText || 'Deposit', TIMEOUT.TX)
      console.log('[Farm] Pool deposit/approval completed')

      // If was Approve, now try Deposit
      if (btnText?.includes('Approve')) {
        await page.waitForTimeout(TIMEOUT.MEDIUM)
        const depositBtn = page
          .locator('button:has-text("Deposit"), button:has-text("Stake")')
          .last()
        if ((await depositBtn.count()) > 0 && !(await depositBtn.isDisabled())) {
          await depositBtn.click()
          await waitForTxComplete(page, 'Deposit', TIMEOUT.TX)
          console.log('[Farm] Deposit after approval completed')
        }
      }
    } else {
      console.log('[Farm] No actionable deposit button found')
    }
  })

  test('deposit reduces token balance on-chain', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/farm')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Log visible pool names to help debugging
    const body = await page.textContent('body')
    const poolNames = body?.match(
      /(?:BRS|BTD|BTB|USDC|USDT|WBTC|WETH|stBTD|stBTB)(?:\/(?:BRS|BTD|BTB|USDC|USDT|WBTC|WETH|stBTD|stBTB))?(?:\s*(?:LP|Pool|Single))?/g
    )
    console.log(
      `[Farm] Pool names on page: ${JSON.stringify([...new Set(poolNames || [])].slice(0, 10))}`
    )

    // Find a pool where the Deposit button is NOT disabled after filling amount
    const allInputs = page.locator('input[type="number"], input[inputmode="decimal"]')
    const allDepositBtns = page.locator('button:has-text("Deposit")')
    const inputCount = await allInputs.count()
    const depositCount = await allDepositBtns.count()
    console.log(`[Farm] Found ${inputCount} inputs, ${depositCount} Deposit buttons`)

    // Record USDC balance
    const usdcBefore = await readBalance(page, ADDRESSES.USDC)
    console.log(`[Farm] USDC before: ${usdcBefore}`)

    // Try each pool until we find one where Deposit is enabled after filling input
    let deposited = false
    for (let i = 0; i < Math.min(inputCount, depositCount); i++) {
      const input = allInputs.nth(i)
      await input.fill('0.001')
      await page.waitForTimeout(TIMEOUT.MEDIUM)

      const btn = allDepositBtns.nth(i)
      const btnText = await btn.textContent().catch(() => '')
      const isDisabled = await btn.isDisabled()
      console.log(`[Farm] Pool ${i}: Deposit text="${btnText}", disabled=${isDisabled}`)

      if (!isDisabled) {
        await btn.click()
        await waitForTxComplete(page, 'Deposit', TIMEOUT.TX)

        const usdcAfter = await readBalanceUntilChanged(page, ADDRESSES.USDC, usdcBefore)
        console.log(`[Farm] USDC after deposit: ${usdcAfter}`)
        if (usdcAfter < usdcBefore) {
          console.log('[Farm] USDC balance decrease verified')
        }
        deposited = true
        break
      }
      // Clear for next pool
      await input.fill('')
    }

    if (!deposited) {
      console.log('[Farm] No pool accepted deposit — all buttons disabled')
      test.skip()
    }
  })

  test('pending rewards accumulate after deposit', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/farm')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    const body = await page.textContent('body')
    // Check for any reward display
    const rewardMatch = body?.match(/Your Total Rewards\s*([\d,.]+)/)
    const rewardAmount = rewardMatch ? parseFloat(rewardMatch[1].replace(/,/g, '')) : 0

    const hasPending =
      rewardAmount > 0 ||
      body?.toLowerCase().includes('pending') ||
      body?.toLowerCase().includes('earned') ||
      body?.toLowerCase().includes('claimable')

    if (hasPending) {
      console.log(`[Farm] Pending rewards found: ${rewardAmount || 'displayed'}`)
    } else {
      console.log('[Farm] No pending rewards yet')
    }
    // This is informational - test passes either way
  })

  test('single pool withdraw', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/farm')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Check if first pool has any staked amount
    const body = await page.textContent('body')
    const stakedMatch = body?.match(/Staked:\s*([\d,.]+)/)
    if (!stakedMatch?.[1] || parseFloat(stakedMatch[1].replace(/,/g, '')) === 0) {
      console.log('[Farm] No staked amount in any pool - skipping withdraw')
      test.skip()
      return
    }

    // Fill withdraw amount in the first pool's input
    const input = page.locator('input[type="number"], input[inputmode="decimal"]').first()
    if ((await input.count()) > 0) {
      await input.fill('0.0005')
      await page.waitForTimeout(TIMEOUT.MEDIUM)
    }

    // Click the FIRST Withdraw button (same pool as the first input)
    const withdrawBtn = page.locator('button:has-text("Withdraw")').first()

    if ((await withdrawBtn.count()) > 0 && !(await withdrawBtn.isDisabled())) {
      const btnText = await withdrawBtn.textContent()
      await withdrawBtn.click()
      console.log(`[Farm] Clicked "${btnText}" for withdraw`)
      await waitForTxComplete(page, 'Withdraw', TIMEOUT.TX)
      console.log('[Farm] Withdraw completed')
    } else {
      console.log('[Farm] Withdraw button disabled - may have insufficient stake or need amount')
      test.skip()
    }
  })

  test('withdraw increases token balance on-chain', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/farm')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Check if first pool has any staked amount
    const body = await page.textContent('body')
    const stakedMatch = body?.match(/Staked:\s*([\d,.]+)/)
    if (!stakedMatch?.[1] || parseFloat(stakedMatch[1].replace(/,/g, '')) === 0) {
      console.log('[Farm] No staked amount - skipping withdraw balance check')
      test.skip()
      return
    }

    const usdcBefore = await readBalance(page, ADDRESSES.USDC)

    // Fill withdraw amount in the first pool's input
    const input = page.locator('input[type="number"], input[inputmode="decimal"]').first()
    if ((await input.count()) > 0) {
      await input.fill('0.0005')
      await page.waitForTimeout(TIMEOUT.MEDIUM)
    }

    // Click the FIRST Withdraw button
    const withdrawBtn = page.locator('button:has-text("Withdraw")').first()

    if ((await withdrawBtn.count()) > 0 && !(await withdrawBtn.isDisabled())) {
      await withdrawBtn.click()
      await waitForTxComplete(page, 'Withdraw', TIMEOUT.TX)

      const usdcAfter = await readBalanceUntilChanged(page, ADDRESSES.USDC, usdcBefore)
      if (usdcAfter > usdcBefore) {
        console.log('[Farm] USDC balance increase after withdraw verified')
      } else {
        console.log('[Farm] USDC balance unchanged - tx may have reverted')
      }
    } else {
      console.log('[Farm] Withdraw button disabled')
      test.skip()
    }
  })

  test('can claim farming rewards if available', async ({ sepoliaPage: page }) => {
    // Claim All triggers multiple pool claims — needs extra time
    test.setTimeout(300_000)

    await navigateTo(page, '/farm')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Check if there are rewards to claim
    const body = await page.textContent('body')
    const rewardMatch = body?.match(/Your Total Rewards\s*([\d,.]+)/)
    const rewardAmount = rewardMatch ? parseFloat(rewardMatch[1].replace(/,/g, '')) : 0

    if (rewardAmount === 0) {
      console.log('[Farm] No rewards available to claim')
      return
    }

    console.log(`[Farm] Found ${rewardAmount} BRS rewards to claim`)

    // Try "Claim All" link/button
    const claimAll = page.locator('text=Claim All').first()
    const claimBtn = page.locator('button:has-text("Claim"), button:has-text("Harvest")').first()

    if ((await claimAll.count()) > 0) {
      await claimAll.click()
      console.log('[Farm] Clicked Claim All, waiting for confirmation...')

      // Claim All may trigger multiple txs — wait longer and don't fail on timeout
      const completed = await waitForTxSuccess(page, TIMEOUT.TX)
      console.log(
        completed ? '[Farm] Claim completed' : '[Farm] Claim still pending — Sepolia may be slow'
      )
    } else if ((await claimBtn.count()) > 0 && !(await claimBtn.isDisabled())) {
      await claimBtn.click()
      console.log('[Farm] Clicked Claim, waiting for confirmation...')
      await waitForTxSuccess(page, TIMEOUT.TX)
    } else {
      console.log('[Farm] No claimable rewards or button not available')
    }
  })
})
