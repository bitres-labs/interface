/**
 * Sepolia Integrated E2E Test Suite
 *
 * Complete end-to-end test that builds up state through actual operations.
 * Tests are ordered to create prerequisites for subsequent tests.
 *
 * Test Flow:
 * 1. Mint: WBTC → BTD (creates BTD balance)
 * 2. Swap: BTD → USDC (tests swap, creates USDC)
 * 3. Add Liquidity: BTD + USDC → LP (creates LP tokens)
 * 4. Farm: Deposit LP → Earn BRS (tests farming)
 * 5. Stake: BTD → stBTD (tests staking)
 * 6. Unstake: stBTD → BTD (tests unstaking)
 * 7. Farm Withdraw: LP back (has LP to withdraw)
 * 8. Remove Liquidity: LP → BTD + USDC
 * 9. Redeem BTD: BTD → WBTC (test based on current CR)
 *
 * Redeem BTD scenarios:
 * - CR ≥ 100%: Full WBTC
 * - CR < 100%: Partial WBTC + BTB compensation
 * - CR < 100% & BTB < 0.5: WBTC + BTB + BRS compensation
 *
 * Prerequisites:
 *   - OKX_PRIVATE_KEY with deployer wallet (has WBTC)
 */

import { metaMaskFixtures } from './utils/metamask-fixtures-router'
import { expect } from '@playwright/test'
import BasicSetup from '../test/wallet-setup/okx.setup'

const test = metaMaskFixtures(BasicSetup, 0)

const BASE_URL = 'https://bitres.org'

// Test amounts - minimal but sufficient
const AMOUNTS = {
  WBTC_MINT: '0.0001',       // ~$9 worth, enough for all operations
  BTD_SWAP: '5',             // Swap 5 BTD for USDC
  BTD_LIQUIDITY: '3',        // Add 3 BTD to liquidity
  BTD_STAKE: '1',            // Stake 1 BTD
  BTB_STAKE: '0.1',          // Stake 0.1 BTB (if available)
  BTD_REDEEM: '1',           // Redeem 1 BTD
}

const WAIT = {
  SHORT: 1000,
  MEDIUM: 2000,
  LONG: 5000,
  TX: 20000,
}

// Helper functions
async function connectWallet(page: any, metamask: any) {
  // Check if already connected
  const walletBtn = page.locator('button:has-text("Connect Wallet")')
  if (await walletBtn.count() === 0) {
    console.log('[Wallet] Already connected')
    return
  }

  await walletBtn.first().click()
  await page.waitForTimeout(WAIT.SHORT)

  const okxOption = page.locator('button:has-text("OKX")')
  if (await okxOption.count() > 0) {
    await okxOption.first().click()
    await page.waitForTimeout(WAIT.SHORT)
    try {
      await metamask.connectToDapp()
    } catch {
      console.log('[Wallet] Already connected to dapp')
    }
    await page.waitForTimeout(WAIT.LONG)
  }

  // Handle network switch
  try {
    await metamask.approveNetworkChange()
    await page.waitForTimeout(WAIT.MEDIUM)
  } catch {
    // Already on correct network
  }
}

async function waitForTx(page: any, metamask: any, action: string): Promise<boolean> {
  console.log(`[${action}] Waiting for wallet confirmation...`)
  try {
    await metamask.confirmTransaction()
    console.log(`[${action}] Transaction confirmed, waiting for block...`)
    await page.waitForTimeout(WAIT.TX)
    return true
  } catch (e) {
    console.log(`[${action}] Transaction error:`, e)
    return false
  }
}

async function screenshot(page: any, name: string) {
  await page.screenshot({ path: `test-results/integrated-${name}.png` })
}

// Check balance display
async function getDisplayedBalance(page: any, token: string): Promise<string> {
  const balanceText = await page.locator(`text=/${token}.*Balance/i`).textContent().catch(() => '')
  const match = balanceText.match(/[\d.]+/)
  return match ? match[0] : '0'
}

test.describe.serial('Sepolia Integrated E2E Tests', () => {
  test.setTimeout(180000) // 3 minutes per test

  // ==================== 1. MINT BTD ====================
  test('1. Mint BTD from WBTC', async ({ page, metamask }) => {
    console.log('\n========== TEST 1: MINT BTD ==========')
    await page.goto(BASE_URL)
    await page.waitForLoadState('domcontentloaded')
    await connectWallet(page, metamask)

    // Ensure we're on Mint tab
    const mintTab = page.locator('button:has-text("Mint BTD")').first()
    await mintTab.click()
    await page.waitForTimeout(WAIT.MEDIUM)

    // Enter WBTC amount
    const input = page.locator('input[type="number"], input[inputmode="decimal"]').first()
    await input.fill(AMOUNTS.WBTC_MINT)
    await page.waitForTimeout(WAIT.MEDIUM)

    await screenshot(page, '01-mint-input')

    // Handle approval if needed
    const approveBtn = page.locator('button:has-text("Approve WBTC")')
    if (await approveBtn.count() > 0 && !(await approveBtn.isDisabled())) {
      console.log('[Mint] Approving WBTC...')
      await approveBtn.click()
      await waitForTx(page, metamask, 'Approve WBTC')
    }

    // Click Mint button
    const mintBtn = page.locator('button.btn-primary:has-text("Mint BTD")')
    if (await mintBtn.count() > 0) {
      const isDisabled = await mintBtn.isDisabled()
      if (!isDisabled) {
        console.log('[Mint] Minting BTD...')
        await mintBtn.click()
        await waitForTx(page, metamask, 'Mint BTD')
      } else {
        console.log('[Mint] Button disabled, checking reason...')
        const btnText = await mintBtn.textContent()
        console.log('[Mint] Button text:', btnText)
      }
    }

    await screenshot(page, '01-mint-result')
    console.log('[Mint] Complete')
  })

  // ==================== 2. SWAP BTD → USDC ====================
  test('2. Swap BTD for USDC', async ({ page, metamask }) => {
    console.log('\n========== TEST 2: SWAP ==========')
    await page.goto(`${BASE_URL}/swap`)
    await page.waitForLoadState('domcontentloaded')
    await connectWallet(page, metamask)

    await page.waitForTimeout(WAIT.MEDIUM)

    // Click Swap tab
    const swapTab = page.locator('button:has-text("Swap")').first()
    await swapTab.click()
    await page.waitForTimeout(WAIT.SHORT)

    // Enter amount
    const input = page.locator('input[type="number"], input[inputmode="decimal"]').first()
    await input.fill(AMOUNTS.BTD_SWAP)
    await page.waitForTimeout(WAIT.MEDIUM)

    await screenshot(page, '02-swap-input')

    // Approve if needed
    const approveBtn = page.locator('button:has-text("Approve")')
    if (await approveBtn.count() > 0 && !(await approveBtn.first().isDisabled())) {
      console.log('[Swap] Approving token...')
      await approveBtn.first().click()
      await waitForTx(page, metamask, 'Approve')
    }

    // Click Swap button
    const swapBtn = page.locator('button.btn-primary:has-text("Swap")')
    if (await swapBtn.count() > 0 && !(await swapBtn.first().isDisabled())) {
      console.log('[Swap] Swapping...')
      await swapBtn.first().click()
      await waitForTx(page, metamask, 'Swap')
    }

    await screenshot(page, '02-swap-result')
    console.log('[Swap] Complete')
  })

  // ==================== 3. ADD LIQUIDITY ====================
  test('3. Add Liquidity (BTD + USDC)', async ({ page, metamask }) => {
    console.log('\n========== TEST 3: ADD LIQUIDITY ==========')
    await page.goto(`${BASE_URL}/swap`)
    await page.waitForLoadState('domcontentloaded')
    await connectWallet(page, metamask)

    // Click Add Liquidity tab
    const addTab = page.locator('button:has-text("Add Liquidity")').first()
    await addTab.click()
    await page.waitForTimeout(WAIT.MEDIUM)

    // Enter first token amount
    const inputs = page.locator('input[type="number"], input[inputmode="decimal"]')
    await inputs.first().fill(AMOUNTS.BTD_LIQUIDITY)
    await page.waitForTimeout(WAIT.MEDIUM)

    await screenshot(page, '03-add-liquidity-input')

    // Approve tokens (may need multiple approvals)
    for (let i = 0; i < 2; i++) {
      const approveBtn = page.locator('button:has-text("Approve"):not([disabled])')
      if (await approveBtn.count() > 0) {
        console.log(`[Add Liquidity] Approving token ${i + 1}...`)
        await approveBtn.first().click()
        await waitForTx(page, metamask, `Approve ${i + 1}`)
        await page.waitForTimeout(WAIT.MEDIUM)
      }
    }

    // Click Add Liquidity button
    const addBtn = page.locator('button.btn-primary:has-text("Add Liquidity"), button.btn-primary:has-text("Supply")')
    if (await addBtn.count() > 0 && !(await addBtn.first().isDisabled())) {
      console.log('[Add Liquidity] Adding liquidity...')
      await addBtn.first().click()
      await waitForTx(page, metamask, 'Add Liquidity')
    }

    await screenshot(page, '03-add-liquidity-result')
    console.log('[Add Liquidity] Complete')
  })

  // ==================== 4. FARM DEPOSIT ====================
  test('4. Deposit LP to Farm', async ({ page, metamask }) => {
    console.log('\n========== TEST 4: FARM DEPOSIT ==========')
    await page.goto(`${BASE_URL}/farm`)
    await page.waitForLoadState('domcontentloaded')
    await connectWallet(page, metamask)

    await page.waitForTimeout(WAIT.MEDIUM)

    // Expand first pool (BTD/USDC)
    const poolCards = page.locator('[class*="pool"], [class*="card"]')
    if (await poolCards.count() > 0) {
      await poolCards.first().click()
      await page.waitForTimeout(WAIT.SHORT)
    }

    await screenshot(page, '04-farm-expanded')

    // Use Max button to deposit all LP
    const maxBtn = page.locator('button:has-text("Max")')
    if (await maxBtn.count() > 0) {
      await maxBtn.first().click()
      await page.waitForTimeout(WAIT.SHORT)
    }

    // Approve LP if needed
    const approveBtn = page.locator('button:has-text("Approve"):not([disabled])')
    if (await approveBtn.count() > 0) {
      console.log('[Farm] Approving LP token...')
      await approveBtn.first().click()
      await waitForTx(page, metamask, 'Approve LP')
    }

    // Click Deposit button
    const depositBtn = page.locator('button:has-text("Deposit"), button:has-text("Stake")')
    if (await depositBtn.count() > 0 && !(await depositBtn.first().isDisabled())) {
      console.log('[Farm] Depositing to farm...')
      await depositBtn.first().click()
      await waitForTx(page, metamask, 'Farm Deposit')
    }

    await screenshot(page, '04-farm-deposit-result')
    console.log('[Farm Deposit] Complete')
  })

  // ==================== 5. STAKE BTD ====================
  test('5. Stake BTD', async ({ page, metamask }) => {
    console.log('\n========== TEST 5: STAKE BTD ==========')
    await page.goto(`${BASE_URL}/stake`)
    await page.waitForLoadState('domcontentloaded')
    await connectWallet(page, metamask)

    await page.waitForTimeout(WAIT.MEDIUM)

    // Enter stake amount
    const input = page.locator('input[type="number"], input[inputmode="decimal"]').first()
    await input.fill(AMOUNTS.BTD_STAKE)
    await page.waitForTimeout(WAIT.SHORT)

    await screenshot(page, '05-stake-btd-input')

    // Approve if needed
    const approveBtn = page.locator('button:has-text("Approve"):not([disabled])')
    if (await approveBtn.count() > 0) {
      console.log('[Stake BTD] Approving BTD...')
      await approveBtn.first().click()
      await waitForTx(page, metamask, 'Approve BTD')
    }

    // Click Stake button
    const stakeBtn = page.locator('button.btn-primary:has-text("Stake BTD"), button.btn-primary:has-text("Stake")')
    if (await stakeBtn.count() > 0 && !(await stakeBtn.first().isDisabled())) {
      console.log('[Stake BTD] Staking...')
      await stakeBtn.first().click()
      await waitForTx(page, metamask, 'Stake BTD')
    } else {
      console.log('[Stake BTD] Button disabled - may need BTD')
    }

    await screenshot(page, '05-stake-btd-result')
    console.log('[Stake BTD] Complete')
  })

  // ==================== 6. UNSTAKE stBTD ====================
  test('6. Unstake stBTD', async ({ page, metamask }) => {
    console.log('\n========== TEST 6: UNSTAKE stBTD ==========')
    await page.goto(`${BASE_URL}/stake`)
    await page.waitForLoadState('domcontentloaded')
    await connectWallet(page, metamask)

    await page.waitForTimeout(WAIT.MEDIUM)

    // Switch to Unstake tab
    const unstakeTab = page.locator('button:has-text("Unstake")')
    if (await unstakeTab.count() > 0) {
      await unstakeTab.first().click()
      await page.waitForTimeout(WAIT.SHORT)
    }

    // Use Max button
    const maxBtn = page.locator('button:has-text("Max")')
    if (await maxBtn.count() > 0) {
      await maxBtn.first().click()
      await page.waitForTimeout(WAIT.SHORT)
    }

    await screenshot(page, '06-unstake-input')

    // Click Unstake button
    const unstakeBtn = page.locator('button.btn-primary:has-text("Unstake"), button.btn-primary:has-text("Withdraw")')
    if (await unstakeBtn.count() > 0 && !(await unstakeBtn.first().isDisabled())) {
      console.log('[Unstake] Unstaking stBTD...')
      await unstakeBtn.first().click()
      await waitForTx(page, metamask, 'Unstake stBTD')
    }

    await screenshot(page, '06-unstake-result')
    console.log('[Unstake stBTD] Complete')
  })

  // ==================== 7. FARM CLAIM & WITHDRAW ====================
  test('7. Claim Farm Rewards & Withdraw', async ({ page, metamask }) => {
    console.log('\n========== TEST 7: FARM CLAIM & WITHDRAW ==========')
    await page.goto(`${BASE_URL}/farm`)
    await page.waitForLoadState('domcontentloaded')
    await connectWallet(page, metamask)

    await page.waitForTimeout(WAIT.MEDIUM)

    // Claim rewards if available
    const claimBtn = page.locator('button:has-text("Claim"), button:has-text("Harvest")')
    if (await claimBtn.count() > 0 && !(await claimBtn.first().isDisabled())) {
      console.log('[Farm] Claiming rewards...')
      await claimBtn.first().click()
      await waitForTx(page, metamask, 'Claim')
    } else {
      console.log('[Farm] No rewards to claim')
    }

    // Expand pool and switch to withdraw
    const poolCards = page.locator('[class*="pool"], [class*="card"]')
    if (await poolCards.count() > 0) {
      await poolCards.first().click()
      await page.waitForTimeout(WAIT.SHORT)
    }

    const withdrawTab = page.locator('button:has-text("Withdraw")')
    if (await withdrawTab.count() > 0) {
      await withdrawTab.first().click()
      await page.waitForTimeout(WAIT.SHORT)
    }

    // Max withdraw
    const maxBtn = page.locator('button:has-text("Max")')
    if (await maxBtn.count() > 0) {
      await maxBtn.first().click()
      await page.waitForTimeout(WAIT.SHORT)
    }

    await screenshot(page, '07-farm-withdraw-input')

    // Click Withdraw button
    const withdrawBtn = page.locator('button:has-text("Withdraw"), button:has-text("Unstake")')
    if (await withdrawBtn.count() > 0 && !(await withdrawBtn.first().isDisabled())) {
      console.log('[Farm] Withdrawing from farm...')
      await withdrawBtn.first().click()
      await waitForTx(page, metamask, 'Farm Withdraw')
    }

    await screenshot(page, '07-farm-withdraw-result')
    console.log('[Farm Withdraw] Complete')
  })

  // ==================== 8. REMOVE LIQUIDITY ====================
  test('8. Remove Liquidity', async ({ page, metamask }) => {
    console.log('\n========== TEST 8: REMOVE LIQUIDITY ==========')
    await page.goto(`${BASE_URL}/swap`)
    await page.waitForLoadState('domcontentloaded')
    await connectWallet(page, metamask)

    // Click Remove Liquidity tab
    const removeTab = page.locator('button:has-text("Remove Liquidity")').first()
    await removeTab.click()
    await page.waitForTimeout(WAIT.MEDIUM)

    // Select 100% or Max
    const maxBtn = page.locator('button:has-text("100%"), button:has-text("Max")')
    if (await maxBtn.count() > 0) {
      await maxBtn.first().click()
      await page.waitForTimeout(WAIT.SHORT)
    }

    await screenshot(page, '08-remove-liquidity-input')

    // Approve LP if needed
    const approveBtn = page.locator('button:has-text("Approve"):not([disabled])')
    if (await approveBtn.count() > 0) {
      console.log('[Remove Liquidity] Approving LP...')
      await approveBtn.first().click()
      await waitForTx(page, metamask, 'Approve LP')
    }

    // Click Remove button
    const removeBtn = page.locator('button.btn-primary:has-text("Remove")')
    if (await removeBtn.count() > 0 && !(await removeBtn.first().isDisabled())) {
      console.log('[Remove Liquidity] Removing...')
      await removeBtn.first().click()
      await waitForTx(page, metamask, 'Remove Liquidity')
    }

    await screenshot(page, '08-remove-liquidity-result')
    console.log('[Remove Liquidity] Complete')
  })

  // ==================== 9. REDEEM BTD ====================
  test('9. Redeem BTD (CR-dependent outcome)', async ({ page, metamask }) => {
    console.log('\n========== TEST 9: REDEEM BTD ==========')
    await page.goto(BASE_URL)
    await page.waitForLoadState('domcontentloaded')
    await connectWallet(page, metamask)

    // Click Redeem BTD tab
    const redeemTab = page.locator('button:has-text("Redeem BTD")').first()
    await redeemTab.click()
    await page.waitForTimeout(WAIT.MEDIUM)

    // Get current CR
    const crText = await page.locator('text=/Collateral Ratio|CR/i').textContent().catch(() => '')
    console.log('[Redeem BTD] Current CR:', crText)

    // Enter BTD amount
    const input = page.locator('input[type="number"], input[inputmode="decimal"]').first()
    await input.fill(AMOUNTS.BTD_REDEEM)
    await page.waitForTimeout(WAIT.MEDIUM)

    // Check what we'll receive
    const outputSection = page.locator('text=/To.*estimated/i').locator('..')
    const outputText = await outputSection.textContent().catch(() => '')
    console.log('[Redeem BTD] Expected output:', outputText)

    // Check for BTB/BRS compensation (CR < 100%)
    const btbComp = await page.locator('text=/BTB Compensation/i').textContent().catch(() => '')
    const brsComp = await page.locator('text=/BRS Compensation/i').textContent().catch(() => '')
    if (btbComp) console.log('[Redeem BTD] BTB Compensation:', btbComp)
    if (brsComp) console.log('[Redeem BTD] BRS Compensation:', brsComp)

    await screenshot(page, '09-redeem-btd-input')

    // Click Redeem button
    const redeemBtn = page.locator('button.btn-primary:has-text("Redeem BTD")')
    if (await redeemBtn.count() > 0 && !(await redeemBtn.first().isDisabled())) {
      console.log('[Redeem BTD] Redeeming...')
      await redeemBtn.first().click()
      await waitForTx(page, metamask, 'Redeem BTD')
    } else {
      const btnText = await page.locator('button.btn-primary').first().textContent()
      console.log('[Redeem BTD] Button state:', btnText)
    }

    await screenshot(page, '09-redeem-btd-result')
    console.log('[Redeem BTD] Complete')
  })

  // ==================== 10. REDEEM BTB (if CR >= 100%) ====================
  test('10. Redeem BTB (requires CR >= 100%)', async ({ page, metamask }) => {
    console.log('\n========== TEST 10: REDEEM BTB ==========')
    await page.goto(BASE_URL)
    await page.waitForLoadState('domcontentloaded')
    await connectWallet(page, metamask)

    // Click Redeem BTB tab
    const redeemTab = page.locator('button:has-text("Redeem BTB")').first()
    await redeemTab.click()
    await page.waitForTimeout(WAIT.MEDIUM)

    // Get CR status
    const crText = await page.locator('text=/Collateral Ratio|CR/i').textContent().catch(() => '')
    console.log('[Redeem BTB] Current CR:', crText)

    // Check if BTB balance exists
    const balanceText = await page.locator('text=/BTB.*Balance/i').textContent().catch(() => '')
    console.log('[Redeem BTB] BTB Balance:', balanceText)

    // Use Max button
    const maxBtn = page.locator('button:has-text("Max")')
    if (await maxBtn.count() > 0) {
      await maxBtn.first().click()
      await page.waitForTimeout(WAIT.SHORT)
    }

    await screenshot(page, '10-redeem-btb-input')

    // Click Redeem button (may be disabled if CR < 100%)
    const redeemBtn = page.locator('button.btn-primary:has-text("Convert BTB"), button.btn-primary:has-text("Redeem")')
    if (await redeemBtn.count() > 0) {
      const isDisabled = await redeemBtn.first().isDisabled()
      const btnText = await redeemBtn.first().textContent()
      console.log('[Redeem BTB] Button:', btnText, 'Disabled:', isDisabled)

      if (!isDisabled) {
        console.log('[Redeem BTB] Converting BTB to BTD...')
        await redeemBtn.first().click()
        await waitForTx(page, metamask, 'Redeem BTB')
      } else {
        console.log('[Redeem BTB] Cannot redeem - CR < 100% or no BTB balance')
      }
    }

    await screenshot(page, '10-redeem-btb-result')
    console.log('[Redeem BTB] Complete')
  })
})
