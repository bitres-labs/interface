/**
 * Sepolia Full E2E Test Suite
 *
 * Tests all main operations on Sepolia testnet with minimal amounts:
 * - Mint BTD (WBTC → BTD + BTB)
 * - Redeem BTD (BTD → WBTC)
 * - Redeem BTB (BTB → WBTC)
 * - Swap tokens
 * - Add/Remove liquidity
 * - Farm deposit/withdraw/claim
 * - Stake/Unstake BTD/BTB
 *
 * Prerequisites:
 *   - OKX_PRIVATE_KEY env var set with deployer private key
 *   - Deployer wallet has Sepolia ETH, WBTC, and protocol tokens
 *
 * Run:
 *   source ../bitres/.env && export OKX_PRIVATE_KEY="$SEPOLIA_PRIVATE_KEY"
 *   npx playwright test e2e/sepolia-full.spec.ts --headed --workers=1
 */

import { metaMaskFixtures } from './utils/metamask-fixtures-router'
import { expect } from '@playwright/test'
import BasicSetup from '../test/wallet-setup/okx.setup'

const test = metaMaskFixtures(BasicSetup, 0)

const BASE_URL = 'https://bitres.org'

// Minimal test amounts
const AMOUNTS = {
  WBTC_MINT: '0.00001',      // ~$1 worth for minting
  BTD_REDEEM: '0.5',         // Small BTD amount
  BTB_REDEEM: '0.1',         // Small BTB amount
  SWAP_AMOUNT: '0.1',        // Small swap amount
  LP_AMOUNT: '0.0001',       // Tiny LP amount
  STAKE_BTD: '0.1',          // Small stake amount
  STAKE_BTB: '0.1',          // Small stake amount
}

const WAIT = {
  SHORT: 1000,
  MEDIUM: 2000,
  LONG: 5000,
  TX: 15000,
  BLOCK: 20000,
}

// Helper to connect wallet
async function connectWallet(page: any, metamask: any) {
  const connectButton = page.locator('button:has-text("Connect Wallet")')
  if (await connectButton.count() > 0) {
    await connectButton.first().click()
    await page.waitForTimeout(WAIT.SHORT)

    const okxOption = page.locator('button:has-text("OKX")')
    if (await okxOption.count() > 0) {
      await okxOption.first().click()
      await page.waitForTimeout(WAIT.SHORT)
      await metamask.connectToDapp()
      await page.waitForTimeout(WAIT.LONG)
    }
  }

  // Approve network change if needed
  try {
    await metamask.approveNetworkChange()
    await page.waitForTimeout(WAIT.MEDIUM)
  } catch {
    // Already on correct network
  }
}

// Helper to wait for transaction
async function waitForTx(page: any, metamask: any, action: string) {
  console.log(`[${action}] Waiting for wallet confirmation...`)
  try {
    await metamask.confirmTransaction()
    console.log(`[${action}] Transaction confirmed, waiting for block...`)
    await page.waitForTimeout(WAIT.BLOCK)
  } catch (e) {
    console.log(`[${action}] Wallet interaction error:`, e)
  }
}

// Helper to take screenshot
async function screenshot(page: any, name: string) {
  await page.screenshot({ path: `test-results/sepolia-full-${name}.png` })
}

test.describe('Sepolia Full E2E Tests', () => {
  test.setTimeout(300000) // 5 minutes per test

  // ==================== MINT TESTS ====================
  test.describe('1. Mint Operations', () => {
    test('1.1 Mint BTD with WBTC', async ({ page, metamask }) => {
      await page.goto(BASE_URL)
      await page.waitForLoadState('domcontentloaded')
      await connectWallet(page, metamask)

      // Navigate to Mint tab
      await page.locator('button:has-text("Mint")').first().click()
      await page.waitForTimeout(WAIT.MEDIUM)

      // Enter WBTC amount
      const input = page.locator('input[type="number"], input[inputmode="decimal"]').first()
      await input.fill(AMOUNTS.WBTC_MINT)
      await page.waitForTimeout(WAIT.MEDIUM)

      await screenshot(page, 'mint-btd-input')

      // Check if approve is needed first
      const approveBtn = page.locator('button:has-text("Approve")')
      if (await approveBtn.count() > 0 && !(await approveBtn.isDisabled())) {
        console.log('[Mint BTD] Approving WBTC...')
        await approveBtn.click()
        await waitForTx(page, metamask, 'Approve WBTC')
        await page.waitForTimeout(WAIT.MEDIUM)
      }

      // Click Mint button (main action button, not tab)
      const mintBtn = page.locator('button.btn-primary:has-text("Mint BTD")')
      if (await mintBtn.count() > 0 && !(await mintBtn.first().isDisabled())) {
        console.log('[Mint BTD] Minting...')
        await mintBtn.click()
        await waitForTx(page, metamask, 'Mint BTD')
      }

      await screenshot(page, 'mint-btd-result')
      console.log('[Mint BTD] Complete')
    })

    test('1.2 Redeem BTD for WBTC', async ({ page, metamask }) => {
      await page.goto(BASE_URL)
      await page.waitForLoadState('domcontentloaded')
      await connectWallet(page, metamask)

      // Navigate to Redeem BTD tab
      await page.locator('button:has-text("Redeem BTD")').first().click()
      await page.waitForTimeout(WAIT.MEDIUM)

      // Enter BTD amount
      const input = page.locator('input[type="number"], input[inputmode="decimal"]').first()
      await input.fill(AMOUNTS.BTD_REDEEM)
      await page.waitForTimeout(WAIT.MEDIUM)

      await screenshot(page, 'redeem-btd-input')

      // Click Redeem button (action button, not tab)
      const redeemBtn = page.locator('button.btn-primary:has-text("Redeem")')
      if (await redeemBtn.count() > 0 && !(await redeemBtn.first().isDisabled())) {
        console.log('[Redeem BTD] Redeeming...')
        await redeemBtn.first().click()
        await waitForTx(page, metamask, 'Redeem BTD')
      }

      await screenshot(page, 'redeem-btd-result')
      console.log('[Redeem BTD] Complete')
    })

    test('1.3 Redeem BTB for WBTC', async ({ page, metamask }) => {
      await page.goto(BASE_URL)
      await page.waitForLoadState('domcontentloaded')
      await connectWallet(page, metamask)

      // Navigate to Redeem BTB tab
      await page.locator('button:has-text("Redeem BTB")').first().click()
      await page.waitForTimeout(WAIT.MEDIUM)

      // Enter BTB amount
      const input = page.locator('input[type="number"], input[inputmode="decimal"]').first()
      await input.fill(AMOUNTS.BTB_REDEEM)
      await page.waitForTimeout(WAIT.MEDIUM)

      await screenshot(page, 'redeem-btb-input')

      // Check CR status - BTB redemption requires CR > 100%
      const crInfo = await page.locator('text=/CR|Collateral Ratio/i').textContent().catch(() => '')
      console.log('[Redeem BTB] CR Info:', crInfo)

      // Click Redeem button (action button, not tab)
      const redeemBtn = page.locator('button.btn-primary:has-text("Redeem")')
      if (await redeemBtn.count() > 0 && !(await redeemBtn.first().isDisabled())) {
        console.log('[Redeem BTB] Redeeming...')
        await redeemBtn.first().click()
        await waitForTx(page, metamask, 'Redeem BTB')
      } else {
        console.log('[Redeem BTB] Button disabled - CR may be <= 100%')
      }

      await screenshot(page, 'redeem-btb-result')
      console.log('[Redeem BTB] Complete')
    })
  })

  // ==================== SWAP TESTS ====================
  test.describe('2. Swap Operations', () => {
    test('2.1 Swap BTD for USDC', async ({ page, metamask }) => {
      await page.goto(`${BASE_URL}/swap`)
      await page.waitForLoadState('domcontentloaded')
      await connectWallet(page, metamask)

      await page.waitForTimeout(WAIT.MEDIUM)

      // Select Swap tab
      await page.locator('button:has-text("Swap")').first().click()
      await page.waitForTimeout(WAIT.SHORT)

      // Enter amount
      const input = page.locator('input[type="number"], input[inputmode="decimal"]').first()
      await input.fill(AMOUNTS.SWAP_AMOUNT)
      await page.waitForTimeout(WAIT.MEDIUM)

      await screenshot(page, 'swap-input')

      // Approve if needed
      const approveBtn = page.locator('button:has-text("Approve")')
      if (await approveBtn.count() > 0 && !(await approveBtn.isDisabled())) {
        console.log('[Swap] Approving token...')
        await approveBtn.click()
        await waitForTx(page, metamask, 'Approve')
        await page.waitForTimeout(WAIT.MEDIUM)
      }

      // Click Swap button
      const swapBtn = page.locator('button:has-text("Swap")')
      if (await swapBtn.count() > 0 && !(await swapBtn.isDisabled())) {
        console.log('[Swap] Swapping...')
        await swapBtn.click()
        await waitForTx(page, metamask, 'Swap')
      }

      await screenshot(page, 'swap-result')
      console.log('[Swap] Complete')
    })

    test('2.2 Add Liquidity', async ({ page, metamask }) => {
      await page.goto(`${BASE_URL}/swap`)
      await page.waitForLoadState('domcontentloaded')
      await connectWallet(page, metamask)

      // Select Add Liquidity tab
      await page.locator('button:has-text("Add Liquidity")').first().click()
      await page.waitForTimeout(WAIT.MEDIUM)

      // Enter amounts
      const inputs = page.locator('input[type="number"], input[inputmode="decimal"]')
      await inputs.first().fill(AMOUNTS.LP_AMOUNT)
      await page.waitForTimeout(WAIT.MEDIUM)

      await screenshot(page, 'add-liquidity-input')

      // Approve tokens if needed
      const approveBtn = page.locator('button:has-text("Approve")')
      while (await approveBtn.count() > 0 && !(await approveBtn.isDisabled())) {
        console.log('[Add Liquidity] Approving token...')
        await approveBtn.first().click()
        await waitForTx(page, metamask, 'Approve')
        await page.waitForTimeout(WAIT.MEDIUM)
      }

      // Click Add button
      const addBtn = page.locator('button:has-text("Add Liquidity"), button:has-text("Supply")')
      if (await addBtn.count() > 0 && !(await addBtn.isDisabled())) {
        console.log('[Add Liquidity] Adding...')
        await addBtn.first().click()
        await waitForTx(page, metamask, 'Add Liquidity')
      }

      await screenshot(page, 'add-liquidity-result')
      console.log('[Add Liquidity] Complete')
    })

    test('2.3 Remove Liquidity', async ({ page, metamask }) => {
      await page.goto(`${BASE_URL}/swap`)
      await page.waitForLoadState('domcontentloaded')
      await connectWallet(page, metamask)

      // Select Remove Liquidity tab
      await page.locator('button:has-text("Remove Liquidity")').first().click()
      await page.waitForTimeout(WAIT.MEDIUM)

      // Select percentage (e.g., 25%)
      const percentBtn = page.locator('button:has-text("25%")')
      if (await percentBtn.count() > 0) {
        await percentBtn.click()
        await page.waitForTimeout(WAIT.SHORT)
      }

      await screenshot(page, 'remove-liquidity-input')

      // Approve LP token if needed
      const approveBtn = page.locator('button:has-text("Approve")')
      if (await approveBtn.count() > 0 && !(await approveBtn.isDisabled())) {
        console.log('[Remove Liquidity] Approving LP token...')
        await approveBtn.click()
        await waitForTx(page, metamask, 'Approve LP')
        await page.waitForTimeout(WAIT.MEDIUM)
      }

      // Click Remove button (action button)
      const removeBtn = page.locator('button.btn-primary:has-text("Remove Liquidity")')
      if (await removeBtn.count() > 0 && !(await removeBtn.first().isDisabled())) {
        console.log('[Remove Liquidity] Removing...')
        await removeBtn.first().click()
        await waitForTx(page, metamask, 'Remove Liquidity')
      }

      await screenshot(page, 'remove-liquidity-result')
      console.log('[Remove Liquidity] Complete')
    })
  })

  // ==================== FARM TESTS ====================
  test.describe('3. Farm Operations', () => {
    test('3.1 Deposit LP to Farm', async ({ page, metamask }) => {
      await page.goto(`${BASE_URL}/farm`)
      await page.waitForLoadState('domcontentloaded')
      await connectWallet(page, metamask)

      await page.waitForTimeout(WAIT.MEDIUM)

      // Click on first farm pool to expand
      const poolCard = page.locator('[class*="pool"], [class*="farm"]').first()
      if (await poolCard.count() > 0) {
        await poolCard.click()
        await page.waitForTimeout(WAIT.SHORT)
      }

      await screenshot(page, 'farm-pool-expanded')

      // Find deposit input and button
      const depositInput = page.locator('input[placeholder*="amount" i], input[type="number"]').first()
      if (await depositInput.count() > 0) {
        await depositInput.fill(AMOUNTS.LP_AMOUNT)
        await page.waitForTimeout(WAIT.SHORT)
      }

      // Approve if needed
      const approveBtn = page.locator('button:has-text("Approve")')
      if (await approveBtn.count() > 0 && !(await approveBtn.isDisabled())) {
        console.log('[Farm Deposit] Approving LP token...')
        await approveBtn.click()
        await waitForTx(page, metamask, 'Approve LP')
        await page.waitForTimeout(WAIT.MEDIUM)
      }

      // Click Deposit button
      const depositBtn = page.locator('button:has-text("Deposit"), button:has-text("Stake")')
      if (await depositBtn.count() > 0 && !(await depositBtn.isDisabled())) {
        console.log('[Farm Deposit] Depositing...')
        await depositBtn.first().click()
        await waitForTx(page, metamask, 'Farm Deposit')
      }

      await screenshot(page, 'farm-deposit-result')
      console.log('[Farm Deposit] Complete')
    })

    test('3.2 Claim Farm Rewards', async ({ page, metamask }) => {
      await page.goto(`${BASE_URL}/farm`)
      await page.waitForLoadState('domcontentloaded')
      await connectWallet(page, metamask)

      await page.waitForTimeout(WAIT.MEDIUM)

      // Click Claim button if available
      const claimBtn = page.locator('button:has-text("Claim"), button:has-text("Harvest")')
      if (await claimBtn.count() > 0 && !(await claimBtn.first().isDisabled())) {
        console.log('[Farm Claim] Claiming rewards...')
        await claimBtn.first().click()
        await waitForTx(page, metamask, 'Claim Rewards')
      } else {
        console.log('[Farm Claim] No rewards to claim')
      }

      await screenshot(page, 'farm-claim-result')
      console.log('[Farm Claim] Complete')
    })

    test('3.3 Withdraw from Farm', async ({ page, metamask }) => {
      await page.goto(`${BASE_URL}/farm`)
      await page.waitForLoadState('domcontentloaded')
      await connectWallet(page, metamask)

      await page.waitForTimeout(WAIT.MEDIUM)

      // Click on first farm pool to expand
      const poolCard = page.locator('[class*="pool"], [class*="farm"]').first()
      if (await poolCard.count() > 0) {
        await poolCard.click()
        await page.waitForTimeout(WAIT.SHORT)
      }

      // Switch to withdraw tab if exists
      const withdrawTab = page.locator('button:has-text("Withdraw")')
      if (await withdrawTab.count() > 0) {
        await withdrawTab.first().click()
        await page.waitForTimeout(WAIT.SHORT)
      }

      // Enter amount or use Max
      const maxBtn = page.locator('button:has-text("Max")')
      if (await maxBtn.count() > 0) {
        await maxBtn.first().click()
        await page.waitForTimeout(WAIT.SHORT)
      }

      await screenshot(page, 'farm-withdraw-input')

      // Click Withdraw button
      const withdrawBtn = page.locator('button:has-text("Withdraw"), button:has-text("Unstake")')
      if (await withdrawBtn.count() > 0 && !(await withdrawBtn.first().isDisabled())) {
        console.log('[Farm Withdraw] Withdrawing...')
        await withdrawBtn.first().click()
        await waitForTx(page, metamask, 'Farm Withdraw')
      }

      await screenshot(page, 'farm-withdraw-result')
      console.log('[Farm Withdraw] Complete')
    })
  })

  // ==================== STAKE TESTS ====================
  test.describe('4. Stake Operations', () => {
    test('4.1 Stake BTD', async ({ page, metamask }) => {
      await page.goto(`${BASE_URL}/stake`)
      await page.waitForLoadState('domcontentloaded')
      await connectWallet(page, metamask)

      await page.waitForTimeout(WAIT.MEDIUM)

      // Select BTD token tab if available (not the main stake button)
      const btdTab = page.locator('[role="tab"]:has-text("BTD"), button.tab:has-text("BTD")')
      if (await btdTab.count() > 0) {
        await btdTab.first().click()
        await page.waitForTimeout(WAIT.SHORT)
      }

      // Enter amount
      const input = page.locator('input[type="number"], input[inputmode="decimal"]').first()
      await input.fill(AMOUNTS.STAKE_BTD)
      await page.waitForTimeout(WAIT.SHORT)

      await screenshot(page, 'stake-btd-input')

      // Approve if needed
      const approveBtn = page.locator('button:has-text("Approve")')
      if (await approveBtn.count() > 0 && !(await approveBtn.isDisabled())) {
        console.log('[Stake BTD] Approving...')
        await approveBtn.click()
        await waitForTx(page, metamask, 'Approve BTD')
        await page.waitForTimeout(WAIT.MEDIUM)
      }

      // Click Stake button (action button)
      const stakeBtn = page.locator('button.btn-primary:has-text("Stake")')
      if (await stakeBtn.count() > 0 && !(await stakeBtn.first().isDisabled())) {
        console.log('[Stake BTD] Staking...')
        await stakeBtn.first().click()
        await waitForTx(page, metamask, 'Stake BTD')
      } else {
        console.log('[Stake BTD] Button disabled - may need BTD tokens')
      }

      await screenshot(page, 'stake-btd-result')
      console.log('[Stake BTD] Complete')
    })

    test('4.2 Stake BTB', async ({ page, metamask }) => {
      await page.goto(`${BASE_URL}/stake`)
      await page.waitForLoadState('domcontentloaded')
      await connectWallet(page, metamask)

      await page.waitForTimeout(WAIT.MEDIUM)

      // Select BTB token tab
      const btbTab = page.locator('[role="tab"]:has-text("BTB"), button.tab:has-text("BTB")')
      if (await btbTab.count() > 0) {
        await btbTab.first().click()
        await page.waitForTimeout(WAIT.SHORT)
      }

      // Enter amount
      const input = page.locator('input[type="number"], input[inputmode="decimal"]').first()
      await input.fill(AMOUNTS.STAKE_BTB)
      await page.waitForTimeout(WAIT.SHORT)

      await screenshot(page, 'stake-btb-input')

      // Approve if needed
      const approveBtn = page.locator('button:has-text("Approve")')
      if (await approveBtn.count() > 0 && !(await approveBtn.isDisabled())) {
        console.log('[Stake BTB] Approving...')
        await approveBtn.click()
        await waitForTx(page, metamask, 'Approve BTB')
        await page.waitForTimeout(WAIT.MEDIUM)
      }

      // Click Stake button (action button)
      const stakeBtn = page.locator('button.btn-primary:has-text("Stake")')
      if (await stakeBtn.count() > 0 && !(await stakeBtn.first().isDisabled())) {
        console.log('[Stake BTB] Staking...')
        await stakeBtn.first().click()
        await waitForTx(page, metamask, 'Stake BTB')
      } else {
        console.log('[Stake BTB] Button disabled - may need BTB tokens')
      }

      await screenshot(page, 'stake-btb-result')
      console.log('[Stake BTB] Complete')
    })

    test('4.3 Unstake stBTD', async ({ page, metamask }) => {
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

      // Select stBTD
      const stbtdOption = page.locator('button:has-text("stBTD"), [data-token="stBTD"]')
      if (await stbtdOption.count() > 0) {
        await stbtdOption.first().click()
        await page.waitForTimeout(WAIT.SHORT)
      }

      // Use Max button
      const maxBtn = page.locator('button:has-text("Max")')
      if (await maxBtn.count() > 0) {
        await maxBtn.first().click()
        await page.waitForTimeout(WAIT.SHORT)
      }

      await screenshot(page, 'unstake-stbtd-input')

      // Click Unstake button
      const unstakeBtn = page.locator('button:has-text("Unstake"), button:has-text("Withdraw")')
      if (await unstakeBtn.count() > 0 && !(await unstakeBtn.first().isDisabled())) {
        console.log('[Unstake stBTD] Unstaking...')
        await unstakeBtn.first().click()
        await waitForTx(page, metamask, 'Unstake stBTD')
      }

      await screenshot(page, 'unstake-stbtd-result')
      console.log('[Unstake stBTD] Complete')
    })

    test('4.4 Unstake stBTB', async ({ page, metamask }) => {
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

      // Select stBTB
      const stbtbOption = page.locator('button:has-text("stBTB"), [data-token="stBTB"]')
      if (await stbtbOption.count() > 0) {
        await stbtbOption.first().click()
        await page.waitForTimeout(WAIT.SHORT)
      }

      // Use Max button
      const maxBtn = page.locator('button:has-text("Max")')
      if (await maxBtn.count() > 0) {
        await maxBtn.first().click()
        await page.waitForTimeout(WAIT.SHORT)
      }

      await screenshot(page, 'unstake-stbtb-input')

      // Click Unstake button
      const unstakeBtn = page.locator('button:has-text("Unstake"), button:has-text("Withdraw")')
      if (await unstakeBtn.count() > 0 && !(await unstakeBtn.first().isDisabled())) {
        console.log('[Unstake stBTB] Unstaking...')
        await unstakeBtn.first().click()
        await waitForTx(page, metamask, 'Unstake stBTB')
      }

      await screenshot(page, 'unstake-stbtb-result')
      console.log('[Unstake stBTB] Complete')
    })
  })
})
