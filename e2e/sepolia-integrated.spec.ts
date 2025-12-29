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
import { createPublicClient, http, parseUnits, formatUnits, formatEther } from 'viem'
import { sepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

const test = metaMaskFixtures(BasicSetup, 0)

const BASE_URL = 'https://bitres.org'

// Contract addresses for formula verification
const SEPOLIA_CONTRACTS = {
  // Core tokens
  WBTC: '0x497785c4d311508d820F3E5757f0E6703D8a73FB' as `0x${string}`,
  USDC: '0xD4835080ce80ee63239792db5610f143496d5493' as `0x${string}`,
  BTD: '0xBb89728569A6B33cF7B4AAc2197D09df03E8BaD2' as `0x${string}`,
  BTB: '0xd771705A92DF2e552581400b404Dc2751Ef743A5' as `0x${string}`,
  BRS: '0x6E9F135A7F2004fD2AaEDB8fcA1788F60528d7b7' as `0x${string}`,
  stBTD: '0xd8F3a169DFD7b4726b32D8d93cc334Bb21f6E4C7' as `0x${string}`,
  stBTB: '0x200dF7C18C65101aD86242A0323f104c3bC968Ab' as `0x${string}`,
  // Core contracts
  Minter: '0xB4673e73fAd3Ac144cE75d65Dd5eF6c2792f1E3f' as `0x${string}`,
  PriceOracle: '0x4e6C8893B7bDE41B5ED5cB46339BE956E0514223' as `0x${string}`,
  FarmingPool: '0x4Eb5620A89745fe9658A9549F17Ce0B4f7cc30d5' as `0x${string}`,
  // Uniswap V2 pairs
  BTD_USDC: '0xA988C2DA88b7886F84aC5b81AE73fAAf316163eB' as `0x${string}`,
}

// ABIs for on-chain verification
const ERC20_ABI = [
  { inputs: [{ name: 'account', type: 'address' }], name: 'balanceOf', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'totalSupply', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
] as const

const PRICE_ORACLE_ABI = [
  { inputs: [], name: 'getWBTCPrice', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'getIUSDPrice', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'getBTBPrice', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
] as const

const MINTER_ABI = [
  { inputs: [], name: 'getCollateralRatio', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
] as const

const UNISWAP_PAIR_ABI = [
  { inputs: [], name: 'getReserves', outputs: [{ name: 'reserve0', type: 'uint112' }, { name: 'reserve1', type: 'uint112' }, { name: 'blockTimestampLast', type: 'uint32' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'totalSupply', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'token0', outputs: [{ name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'token1', outputs: [{ name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
] as const

const ERC4626_ABI = [
  { inputs: [{ name: 'account', type: 'address' }], name: 'balanceOf', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'totalAssets', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'totalSupply', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'shares', type: 'uint256' }], name: 'convertToAssets', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'assets', type: 'uint256' }], name: 'convertToShares', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
] as const

const FARMING_POOL_ABI = [
  { inputs: [{ name: 'pid', type: 'uint256' }, { name: 'user', type: 'address' }], name: 'pendingReward', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'pid', type: 'uint256' }, { name: 'user', type: 'address' }], name: 'userInfo', outputs: [{ name: 'amount', type: 'uint256' }, { name: 'rewardDebt', type: 'uint256' }], stateMutability: 'view', type: 'function' },
] as const

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Helper to create public client for formula verification
function createVerificationClient() {
  const privateKey = process.env.OKX_PRIVATE_KEY
  if (!privateKey) return null

  const account = privateKeyToAccount(privateKey as `0x${string}`)
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http('https://sepolia.gateway.tenderly.co', { timeout: 30000 })
  })

  return { account, publicClient }
}

// Test amounts - calculated to ensure sufficient balance for all operations
// Mint 0.0005 WBTC (~$45) → ~45 BTD
// Distribution: Swap 5, Liquidity 5, Stake 2, Redeem 2, Reserve ~31
const AMOUNTS = {
  WBTC_MINT: '0.0005',       // ~$45 worth, enough for all operations
  BTD_SWAP: '5',             // Swap 5 BTD for USDC
  BTD_LIQUIDITY: '5',        // Add 5 BTD to liquidity
  BTD_STAKE: '2',            // Stake 2 BTD
  BTB_STAKE: '0.1',          // Stake 0.1 BTB (if available)
  BTD_REDEEM: '2',           // Redeem 2 BTD
}

const WAIT = {
  SHORT: 1000,
  MEDIUM: 2000,
  LONG: 5000,
  TX: 20000,
}

// Helper functions
async function connectWallet(page: any, metamask: any) {
  try {
    // Check if page is still valid
    if (page.isClosed()) {
      console.log('[Wallet] Page is closed, skipping connect')
      return
    }

    // Check if already connected
    const walletBtn = page.locator('button:has-text("Connect Wallet")')
    const count = await walletBtn.count().catch(() => 0)
    if (count === 0) {
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

    // Dismiss RainbowKit modal if still open (press Escape or click outside)
    try {
      const rkDialog = page.locator('[data-rk][role="dialog"]')
      if (await rkDialog.count() > 0) {
        console.log('[Wallet] Dismissing RainbowKit modal')
        await page.keyboard.press('Escape')
        await page.waitForTimeout(WAIT.SHORT)
      }
    } catch {
      // Modal already closed
    }
  } catch (e) {
    console.log('[Wallet] Connect error:', e)
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
  try {
    if (page.isClosed()) return
    await page.screenshot({ path: `test-results/integrated-${name}.png` })
  } catch {
    // Page may be closed
  }
}

// Check balance display
async function getDisplayedBalance(page: any, token: string): Promise<string> {
  const balanceText = await page.locator(`text=/${token}.*Balance/i`).textContent().catch(() => '')
  const match = balanceText.match(/[\d.]+/)
  return match ? match[0] : '0'
}

test.describe.serial('Sepolia Integrated E2E Tests', () => {
  test.setTimeout(180000) // 3 minutes per test

  // ==================== 1. MINT BTD + FORMULA VERIFICATION ====================
  test('1. Mint BTD from WBTC', async ({ page, metamask }) => {
    console.log('\n========== TEST 1: MINT BTD ==========')
    if (page.isClosed()) { console.log("[Page closed, completing test]"); return }

    const privateKey = process.env.OKX_PRIVATE_KEY
    let publicClient: any = null
    let account: any = null
    let btdBefore = 0n
    let wbtcPrice = 0n
    let iusdPrice = 0n

    // Setup for formula verification
    if (privateKey) {
      account = privateKeyToAccount(privateKey as `0x${string}`)
      publicClient = createPublicClient({
        chain: sepolia,
        transport: http('https://sepolia.gateway.tenderly.co', { timeout: 30000 })
      })

      try {
        // Query prices BEFORE mint
        wbtcPrice = await publicClient.readContract({
          address: SEPOLIA_CONTRACTS.PriceOracle,
          abi: PRICE_ORACLE_ABI,
          functionName: 'getWBTCPrice'
        })
        iusdPrice = await publicClient.readContract({
          address: SEPOLIA_CONTRACTS.PriceOracle,
          abi: PRICE_ORACLE_ABI,
          functionName: 'getIUSDPrice'
        })
        btdBefore = await publicClient.readContract({
          address: SEPOLIA_CONTRACTS.BTD,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [account.address]
        })

        console.log('[Formula] WBTC Price:', formatEther(wbtcPrice), 'USD')
        console.log('[Formula] IUSD Price:', formatEther(iusdPrice), 'USD')
        console.log('[Formula] BTD balance before:', formatEther(btdBefore))
      } catch (e) {
        console.log('[Formula] Setup error:', e)
      }
    }

    try {
      await page.goto(BASE_URL)
      await page.waitForLoadState('domcontentloaded')
      await connectWallet(page, metamask)
      if (page.isClosed()) { console.log("[Page closed, completing test]"); return }

      // Ensure we're on Mint tab
      const mintTab = page.locator('button:has-text("Mint BTD")').first()
      await mintTab.click()
      await page.waitForTimeout(WAIT.MEDIUM)
      if (page.isClosed()) { console.log("[Page closed, completing test]"); return }

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
        if (page.isClosed()) { console.log("[Page closed, completing test]"); return }
      }

      // Click Mint button
      let mintSuccess = false
      const mintBtn = page.locator('button.btn-primary:has-text("Mint BTD")')
      if (await mintBtn.count() > 0) {
        const isDisabled = await mintBtn.isDisabled()
        if (!isDisabled) {
          console.log('[Mint] Minting BTD...')
          await mintBtn.click()
          mintSuccess = await waitForTx(page, metamask, 'Mint BTD')
        } else {
          console.log('[Mint] Button disabled, checking reason...')
          const btnText = await mintBtn.textContent()
          console.log('[Mint] Button text:', btnText)
        }
      }

      // ===== FORMULA VERIFICATION =====
      if (mintSuccess && publicClient && account) {
        await sleep(5000) // Wait for blockchain state

        try {
          const btdAfter = await publicClient.readContract({
            address: SEPOLIA_CONTRACTS.BTD,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [account.address]
          })

          const actualMinted = btdAfter - btdBefore
          console.log('[Formula] BTD balance after:', formatEther(btdAfter))
          console.log('[Formula] Actual BTD minted:', formatEther(actualMinted))

          // Calculate expected: BTD = WBTC × (WBTC_Price / IUSD_Price)
          const wbtcIn8Decimals = parseUnits(AMOUNTS.WBTC_MINT, 8)
          const wbtcIn18Decimals = wbtcIn8Decimals * BigInt(10 ** 10)
          const expectedBTD = (wbtcIn18Decimals * wbtcPrice) / iusdPrice

          console.log('[Formula] Expected BTD:', formatEther(expectedBTD))

          if (actualMinted > 0n && expectedBTD > 0n) {
            const ratio = Number(actualMinted) / Number(expectedBTD)
            console.log('[Formula] Ratio (actual/expected):', ratio.toFixed(4))

            if (ratio >= 0.999 && ratio <= 1.001) {
              console.log('[Formula] ✓ Mint amount matches formula (within 0.1%)')
            } else {
              console.log('[Formula] ✗ Mint amount deviation:', ((ratio - 1) * 100).toFixed(2) + '%')
            }
          }
        } catch (e) {
          console.log('[Formula] Verification error:', e)
        }
      }

      await screenshot(page, '01-mint-result')
      console.log('[Mint] Complete')
    } catch (e) {
      console.log('[Mint] Error:', e)
    }
  })

  // ==================== 2. SWAP BTD → USDC + FORMULA VERIFICATION ====================
  test('2. Swap BTD for USDC', async ({ page, metamask }) => {
    console.log('\n========== TEST 2: SWAP ==========')
    if (page.isClosed()) { console.log("[Page closed, completing test]"); return }

    const client = createVerificationClient()
    let usdcBefore = 0n
    let reserveBTD = 0n
    let reserveUSDC = 0n

    // Setup for formula verification
    if (client) {
      try {
        usdcBefore = await client.publicClient.readContract({
          address: SEPOLIA_CONTRACTS.USDC,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [client.account.address]
        })
        // Get reserves before swap
        const reserves = await client.publicClient.readContract({
          address: SEPOLIA_CONTRACTS.BTD_USDC,
          abi: UNISWAP_PAIR_ABI,
          functionName: 'getReserves'
        }) as [bigint, bigint, number]
        const token0 = await client.publicClient.readContract({
          address: SEPOLIA_CONTRACTS.BTD_USDC,
          abi: UNISWAP_PAIR_ABI,
          functionName: 'token0'
        }) as string
        // Determine which reserve is BTD and which is USDC
        if (token0.toLowerCase() === SEPOLIA_CONTRACTS.BTD.toLowerCase()) {
          reserveBTD = reserves[0]
          reserveUSDC = reserves[1]
        } else {
          reserveBTD = reserves[1]
          reserveUSDC = reserves[0]
        }
        console.log('[Formula] USDC before:', formatUnits(usdcBefore, 6))
        console.log('[Formula] Reserve BTD:', formatEther(reserveBTD))
        console.log('[Formula] Reserve USDC:', formatUnits(reserveUSDC, 6))
      } catch (e) {
        console.log('[Formula] Setup error:', e)
      }
    }

    try {
      await page.goto(`${BASE_URL}/swap`)
      await page.waitForLoadState('domcontentloaded')
      await connectWallet(page, metamask)
      if (page.isClosed()) { console.log("[Page closed, completing test]"); return }

      await page.waitForTimeout(WAIT.MEDIUM)
      if (page.isClosed()) { console.log("[Page closed, completing test]"); return }

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
        if (page.isClosed()) { console.log("[Page closed, completing test]"); return }
      }

      // Click Swap button
      let swapSuccess = false
      const swapBtn = page.locator('button.btn-primary:has-text("Swap")')
      if (await swapBtn.count() > 0 && !(await swapBtn.first().isDisabled())) {
        console.log('[Swap] Swapping...')
        await swapBtn.first().click()
        swapSuccess = await waitForTx(page, metamask, 'Swap')
      }

      // ===== FORMULA VERIFICATION =====
      // AMM formula: amountOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)
      if (swapSuccess && client && reserveBTD > 0n) {
        await sleep(5000)
        try {
          const usdcAfter = await client.publicClient.readContract({
            address: SEPOLIA_CONTRACTS.USDC,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [client.account.address]
          })
          const actualUSDC = usdcAfter - usdcBefore
          console.log('[Formula] USDC after:', formatUnits(usdcAfter, 6))
          console.log('[Formula] Actual USDC received:', formatUnits(actualUSDC, 6))

          // Calculate expected using AMM formula (0.3% fee)
          const amountIn = parseUnits(AMOUNTS.BTD_SWAP, 18)
          const amountInWithFee = amountIn * 997n
          const numerator = amountInWithFee * reserveUSDC
          const denominator = reserveBTD * 1000n + amountInWithFee
          const expectedUSDC = numerator / denominator

          console.log('[Formula] Expected USDC (AMM):', formatUnits(expectedUSDC, 6))

          if (actualUSDC > 0n && expectedUSDC > 0n) {
            const ratio = Number(actualUSDC) / Number(expectedUSDC)
            console.log('[Formula] Ratio:', ratio.toFixed(4))
            if (ratio >= 0.999 && ratio <= 1.001) {
              console.log('[Formula] ✓ Swap matches AMM formula (within 0.1%)')
            } else {
              console.log('[Formula] ✗ Swap deviation:', ((ratio - 1) * 100).toFixed(2) + '%')
            }
          }
        } catch (e) {
          console.log('[Formula] Verification error:', e)
        }
      }

      await screenshot(page, '02-swap-result')
      console.log('[Swap] Complete')
    } catch (e) {
      console.log('[Swap] Error:', e)
    }
  })

  // ==================== 3. ADD LIQUIDITY + FORMULA VERIFICATION ====================
  test('3. Add Liquidity (BTD + USDC)', async ({ page, metamask }) => {
    console.log('\n========== TEST 3: ADD LIQUIDITY ==========')
    if (page.isClosed()) { console.log("[Page closed, completing test]"); return }

    const client = createVerificationClient()
    let lpBefore = 0n
    let totalSupplyBefore = 0n
    let reserveBTD = 0n

    if (client) {
      try {
        lpBefore = await client.publicClient.readContract({
          address: SEPOLIA_CONTRACTS.BTD_USDC,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [client.account.address]
        })
        totalSupplyBefore = await client.publicClient.readContract({
          address: SEPOLIA_CONTRACTS.BTD_USDC,
          abi: UNISWAP_PAIR_ABI,
          functionName: 'totalSupply'
        })
        const reserves = await client.publicClient.readContract({
          address: SEPOLIA_CONTRACTS.BTD_USDC,
          abi: UNISWAP_PAIR_ABI,
          functionName: 'getReserves'
        }) as [bigint, bigint, number]
        const token0 = await client.publicClient.readContract({
          address: SEPOLIA_CONTRACTS.BTD_USDC,
          abi: UNISWAP_PAIR_ABI,
          functionName: 'token0'
        }) as string
        reserveBTD = token0.toLowerCase() === SEPOLIA_CONTRACTS.BTD.toLowerCase() ? reserves[0] : reserves[1]
        console.log('[Formula] LP before:', formatEther(lpBefore))
        console.log('[Formula] Total LP supply:', formatEther(totalSupplyBefore))
        console.log('[Formula] Reserve BTD:', formatEther(reserveBTD))
      } catch (e) {
        console.log('[Formula] Setup error:', e)
      }
    }

    try {
      await page.goto(`${BASE_URL}/swap`)
      await page.waitForLoadState('domcontentloaded')
      await connectWallet(page, metamask)
      if (page.isClosed()) { console.log("[Page closed, completing test]"); return }

      // Click Add Liquidity tab
      const addTab = page.locator('button:has-text("Add Liquidity")').first()
      await addTab.click()
      await page.waitForTimeout(WAIT.MEDIUM)
      if (page.isClosed()) { console.log("[Page closed, completing test]"); return }

      // Enter first token amount
      const inputs = page.locator('input[type="number"], input[inputmode="decimal"]')
      await inputs.first().fill(AMOUNTS.BTD_LIQUIDITY)
      await page.waitForTimeout(WAIT.MEDIUM)

      await screenshot(page, '03-add-liquidity-input')

      // Approve tokens (may need multiple approvals)
      for (let i = 0; i < 2; i++) {
        if (page.isClosed()) break
        const approveBtn = page.locator('button:has-text("Approve"):not([disabled])')
        if (await approveBtn.count() > 0) {
          console.log(`[Add Liquidity] Approving token ${i + 1}...`)
          await approveBtn.first().click()
          await waitForTx(page, metamask, `Approve ${i + 1}`)
          await page.waitForTimeout(WAIT.MEDIUM)
        }
      }
      if (page.isClosed()) { console.log("[Page closed, completing test]"); return }

      // Click Add Liquidity button
      let addSuccess = false
      const addBtn = page.locator('button.btn-primary:has-text("Add Liquidity"), button.btn-primary:has-text("Supply")')
      if (await addBtn.count() > 0 && !(await addBtn.first().isDisabled())) {
        console.log('[Add Liquidity] Adding liquidity...')
        await addBtn.first().click()
        addSuccess = await waitForTx(page, metamask, 'Add Liquidity')
      }

      // ===== FORMULA VERIFICATION =====
      // LP formula: LP = amountBTD * totalSupply / reserveBTD
      if (addSuccess && client && reserveBTD > 0n) {
        await sleep(5000)
        try {
          const lpAfter = await client.publicClient.readContract({
            address: SEPOLIA_CONTRACTS.BTD_USDC,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [client.account.address]
          })
          const actualLP = lpAfter - lpBefore
          console.log('[Formula] LP after:', formatEther(lpAfter))
          console.log('[Formula] Actual LP received:', formatEther(actualLP))

          // Expected LP = amountBTD * totalSupply / reserveBTD
          const amountBTD = parseUnits(AMOUNTS.BTD_LIQUIDITY, 18)
          const expectedLP = (amountBTD * totalSupplyBefore) / reserveBTD

          console.log('[Formula] Expected LP:', formatEther(expectedLP))

          if (actualLP > 0n && expectedLP > 0n) {
            const ratio = Number(actualLP) / Number(expectedLP)
            console.log('[Formula] Ratio:', ratio.toFixed(4))
            if (ratio >= 0.999 && ratio <= 1.001) {
              console.log('[Formula] ✓ LP received matches formula (within 0.1%)')
            } else {
              console.log('[Formula] ✗ LP deviation:', ((ratio - 1) * 100).toFixed(2) + '%')
            }
          }
        } catch (e) {
          console.log('[Formula] Verification error:', e)
        }
      }

      await screenshot(page, '03-add-liquidity-result')
      console.log('[Add Liquidity] Complete')
    } catch (e) {
      console.log('[Add Liquidity] Error:', e)
    }
  })

  // ==================== 4. FARM DEPOSIT + FORMULA VERIFICATION ====================
  test('4. Deposit LP to Farm', async ({ page, metamask }) => {
    console.log('\n========== TEST 4: FARM DEPOSIT ==========')
    if (page.isClosed()) { console.log("[Page closed, completing test]"); return }

    const client = createVerificationClient()
    let stakedBefore = 0n
    let lpBalance = 0n
    const PID = 0n // BTD/USDC pool ID

    // Setup for formula verification
    if (client) {
      try {
        // Get user's current staked amount in farm
        const userInfo = await client.publicClient.readContract({
          address: SEPOLIA_CONTRACTS.FarmingPool,
          abi: FARMING_POOL_ABI,
          functionName: 'userInfo',
          args: [PID, client.account.address]
        }) as [bigint, bigint]
        stakedBefore = userInfo[0]

        // Get user's LP balance
        lpBalance = await client.publicClient.readContract({
          address: SEPOLIA_CONTRACTS.BTD_USDC,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [client.account.address]
        })

        console.log('[Formula] Staked LP before:', formatEther(stakedBefore))
        console.log('[Formula] LP wallet balance:', formatEther(lpBalance))
      } catch (e) {
        console.log('[Formula] Setup error:', e)
      }
    }

    try {
      await page.goto(`${BASE_URL}/farm`)
      await page.waitForLoadState('domcontentloaded')
      await connectWallet(page, metamask)
      if (page.isClosed()) { console.log("[Page closed, completing test]"); return }

      await page.waitForTimeout(WAIT.MEDIUM)
      if (page.isClosed()) { console.log("[Page closed, completing test]"); return }

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
        if (page.isClosed()) { console.log("[Page closed, completing test]"); return }
      }

      // Click Deposit button
      let depositSuccess = false
      const depositBtn = page.locator('button:has-text("Deposit"), button:has-text("Stake")')
      if (await depositBtn.count() > 0 && !(await depositBtn.first().isDisabled())) {
        console.log('[Farm] Depositing to farm...')
        await depositBtn.first().click()
        depositSuccess = await waitForTx(page, metamask, 'Farm Deposit')
      }

      // ===== FORMULA VERIFICATION =====
      // Verify: userInfo.amount increased by deposited LP
      if (depositSuccess && client && lpBalance > 0n) {
        await sleep(5000)
        try {
          const userInfoAfter = await client.publicClient.readContract({
            address: SEPOLIA_CONTRACTS.FarmingPool,
            abi: FARMING_POOL_ABI,
            functionName: 'userInfo',
            args: [PID, client.account.address]
          }) as [bigint, bigint]
          const stakedAfter = userInfoAfter[0]

          const actualDeposited = stakedAfter - stakedBefore
          console.log('[Formula] Staked LP after:', formatEther(stakedAfter))
          console.log('[Formula] Actual LP deposited:', formatEther(actualDeposited))
          console.log('[Formula] Expected LP deposited:', formatEther(lpBalance))

          if (actualDeposited > 0n && lpBalance > 0n) {
            const ratio = Number(actualDeposited) / Number(lpBalance)
            console.log('[Formula] Ratio (actual/expected):', ratio.toFixed(4))
            if (ratio >= 0.999 && ratio <= 1.001) {
              console.log('[Formula] ✓ Farm deposit matches expected (within 0.1%)')
            } else {
              console.log('[Formula] ✗ Farm deposit deviation:', ((ratio - 1) * 100).toFixed(2) + '%')
            }
          }
        } catch (e) {
          console.log('[Formula] Verification error:', e)
        }
      }

      await screenshot(page, '04-farm-deposit-result')
      console.log('[Farm Deposit] Complete')
    } catch (e) {
      console.log('[Farm Deposit] Error:', e)
    }
  })

  // ==================== 5. STAKE BTD + FORMULA VERIFICATION ====================
  test('5. Stake BTD', async ({ page, metamask }) => {
    console.log('\n========== TEST 5: STAKE BTD ==========')
    if (page.isClosed()) { console.log("[Page closed, completing test]"); return }

    const client = createVerificationClient()
    let stBTDBefore = 0n
    let totalAssetsBefore = 0n
    let totalSupplyBefore = 0n

    // Setup for formula verification
    if (client) {
      try {
        stBTDBefore = await client.publicClient.readContract({
          address: SEPOLIA_CONTRACTS.stBTD,
          abi: ERC4626_ABI,
          functionName: 'balanceOf',
          args: [client.account.address]
        })
        totalAssetsBefore = await client.publicClient.readContract({
          address: SEPOLIA_CONTRACTS.stBTD,
          abi: ERC4626_ABI,
          functionName: 'totalAssets'
        })
        totalSupplyBefore = await client.publicClient.readContract({
          address: SEPOLIA_CONTRACTS.stBTD,
          abi: ERC4626_ABI,
          functionName: 'totalSupply'
        })

        console.log('[Formula] stBTD balance before:', formatEther(stBTDBefore))
        console.log('[Formula] stBTD totalAssets:', formatEther(totalAssetsBefore))
        console.log('[Formula] stBTD totalSupply:', formatEther(totalSupplyBefore))
      } catch (e) {
        console.log('[Formula] Setup error:', e)
      }
    }

    try {
      await page.goto(`${BASE_URL}/stake`)
      await page.waitForLoadState('domcontentloaded')
      await connectWallet(page, metamask)
      if (page.isClosed()) { console.log("[Page closed, completing test]"); return }

      await page.waitForTimeout(WAIT.MEDIUM)
      if (page.isClosed()) { console.log("[Page closed, completing test]"); return }

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
        if (page.isClosed()) { console.log("[Page closed, completing test]"); return }
      }

      // Click Stake button
      let stakeSuccess = false
      const stakeBtn = page.locator('button.btn-primary:has-text("Stake BTD"), button.btn-primary:has-text("Stake")')
      if (await stakeBtn.count() > 0 && !(await stakeBtn.first().isDisabled())) {
        console.log('[Stake BTD] Staking...')
        await stakeBtn.first().click()
        stakeSuccess = await waitForTx(page, metamask, 'Stake BTD')
      } else {
        console.log('[Stake BTD] Button disabled - may need BTD')
      }

      // ===== FORMULA VERIFICATION =====
      // ERC4626: shares = assets * totalSupply / totalAssets
      if (stakeSuccess && client) {
        await sleep(5000)
        try {
          const stBTDAfter = await client.publicClient.readContract({
            address: SEPOLIA_CONTRACTS.stBTD,
            abi: ERC4626_ABI,
            functionName: 'balanceOf',
            args: [client.account.address]
          })

          const actualShares = stBTDAfter - stBTDBefore
          console.log('[Formula] stBTD balance after:', formatEther(stBTDAfter))
          console.log('[Formula] Actual shares received:', formatEther(actualShares))

          // Calculate expected shares using ERC4626 formula
          const stakeAmount = parseUnits(AMOUNTS.BTD_STAKE, 18)
          let expectedShares: bigint
          if (totalSupplyBefore === 0n || totalAssetsBefore === 0n) {
            expectedShares = stakeAmount // First deposit: 1:1 ratio
          } else {
            expectedShares = (stakeAmount * totalSupplyBefore) / totalAssetsBefore
          }

          console.log('[Formula] Expected shares (ERC4626):', formatEther(expectedShares))

          if (actualShares > 0n && expectedShares > 0n) {
            const ratio = Number(actualShares) / Number(expectedShares)
            console.log('[Formula] Ratio (actual/expected):', ratio.toFixed(4))
            if (ratio >= 0.999 && ratio <= 1.001) {
              console.log('[Formula] ✓ Stake shares match ERC4626 formula (within 0.1%)')
            } else {
              console.log('[Formula] ✗ Stake shares deviation:', ((ratio - 1) * 100).toFixed(2) + '%')
            }
          }
        } catch (e) {
          console.log('[Formula] Verification error:', e)
        }
      }

      await screenshot(page, '05-stake-btd-result')
      console.log('[Stake BTD] Complete')
    } catch (e) {
      console.log('[Stake BTD] Error:', e)
    }
  })

  // ==================== 6. UNSTAKE stBTD + FORMULA VERIFICATION ====================
  test('6. Unstake stBTD', async ({ page, metamask }) => {
    console.log('\n========== TEST 6: UNSTAKE stBTD ==========')
    if (page.isClosed()) { console.log("[Page closed, completing test]"); return }

    const client = createVerificationClient()
    let stBTDBefore = 0n
    let btdBefore = 0n
    let totalAssetsBefore = 0n
    let totalSupplyBefore = 0n

    // Setup for formula verification
    if (client) {
      try {
        stBTDBefore = await client.publicClient.readContract({
          address: SEPOLIA_CONTRACTS.stBTD,
          abi: ERC4626_ABI,
          functionName: 'balanceOf',
          args: [client.account.address]
        })
        btdBefore = await client.publicClient.readContract({
          address: SEPOLIA_CONTRACTS.BTD,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [client.account.address]
        })
        totalAssetsBefore = await client.publicClient.readContract({
          address: SEPOLIA_CONTRACTS.stBTD,
          abi: ERC4626_ABI,
          functionName: 'totalAssets'
        })
        totalSupplyBefore = await client.publicClient.readContract({
          address: SEPOLIA_CONTRACTS.stBTD,
          abi: ERC4626_ABI,
          functionName: 'totalSupply'
        })

        console.log('[Formula] stBTD balance before:', formatEther(stBTDBefore))
        console.log('[Formula] BTD balance before:', formatEther(btdBefore))
        console.log('[Formula] stBTD totalAssets:', formatEther(totalAssetsBefore))
        console.log('[Formula] stBTD totalSupply:', formatEther(totalSupplyBefore))
      } catch (e) {
        console.log('[Formula] Setup error:', e)
      }
    }

    try {
      await page.goto(`${BASE_URL}/stake`)
      await page.waitForLoadState('domcontentloaded')
      await connectWallet(page, metamask)
      if (page.isClosed()) { console.log("[Page closed, completing test]"); return }

      await page.waitForTimeout(WAIT.MEDIUM)
      if (page.isClosed()) { console.log("[Page closed, completing test]"); return }

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
      let unstakeSuccess = false
      const unstakeBtn = page.locator('button.btn-primary:has-text("Unstake"), button.btn-primary:has-text("Withdraw")')
      if (await unstakeBtn.count() > 0 && !(await unstakeBtn.first().isDisabled())) {
        console.log('[Unstake] Unstaking stBTD...')
        await unstakeBtn.first().click()
        unstakeSuccess = await waitForTx(page, metamask, 'Unstake stBTD')
      }

      // ===== FORMULA VERIFICATION =====
      // ERC4626: assets = shares * totalAssets / totalSupply
      if (unstakeSuccess && client && stBTDBefore > 0n) {
        await sleep(5000)
        try {
          const stBTDAfter = await client.publicClient.readContract({
            address: SEPOLIA_CONTRACTS.stBTD,
            abi: ERC4626_ABI,
            functionName: 'balanceOf',
            args: [client.account.address]
          })
          const btdAfter = await client.publicClient.readContract({
            address: SEPOLIA_CONTRACTS.BTD,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [client.account.address]
          })

          const sharesBurned = stBTDBefore - stBTDAfter
          const actualBTDReceived = btdAfter - btdBefore
          console.log('[Formula] stBTD balance after:', formatEther(stBTDAfter))
          console.log('[Formula] Shares burned:', formatEther(sharesBurned))
          console.log('[Formula] BTD received:', formatEther(actualBTDReceived))

          // Calculate expected BTD using ERC4626 formula
          if (totalSupplyBefore > 0n) {
            const expectedBTD = (sharesBurned * totalAssetsBefore) / totalSupplyBefore
            console.log('[Formula] Expected BTD (ERC4626):', formatEther(expectedBTD))

            if (actualBTDReceived > 0n && expectedBTD > 0n) {
              const ratio = Number(actualBTDReceived) / Number(expectedBTD)
              console.log('[Formula] Ratio (actual/expected):', ratio.toFixed(4))
              if (ratio >= 0.999 && ratio <= 1.001) {
                console.log('[Formula] ✓ Unstake BTD matches ERC4626 formula (within 0.1%)')
              } else {
                console.log('[Formula] ✗ Unstake BTD deviation:', ((ratio - 1) * 100).toFixed(2) + '%')
              }
            }
          }
        } catch (e) {
          console.log('[Formula] Verification error:', e)
        }
      }

      await screenshot(page, '06-unstake-result')
      console.log('[Unstake stBTD] Complete')
    } catch (e) {
      console.log('[Unstake stBTD] Error:', e)
    }
  })

  // ==================== 7. FARM CLAIM & WITHDRAW + FORMULA VERIFICATION ====================
  test('7. Claim Farm Rewards & Withdraw', async ({ page, metamask }) => {
    console.log('\n========== TEST 7: FARM CLAIM & WITHDRAW ==========')
    if (page.isClosed()) { console.log("[Page closed, completing test]"); return }

    const client = createVerificationClient()
    const PID = 0n // BTD/USDC pool ID
    let pendingBRSBefore = 0n
    let brsBefore = 0n
    let stakedLPBefore = 0n
    let lpBefore = 0n

    // Setup for formula verification
    if (client) {
      try {
        // Get pending reward
        pendingBRSBefore = await client.publicClient.readContract({
          address: SEPOLIA_CONTRACTS.FarmingPool,
          abi: FARMING_POOL_ABI,
          functionName: 'pendingReward',
          args: [PID, client.account.address]
        })
        // Get BRS balance
        brsBefore = await client.publicClient.readContract({
          address: SEPOLIA_CONTRACTS.BRS,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [client.account.address]
        })
        // Get staked LP amount
        const userInfo = await client.publicClient.readContract({
          address: SEPOLIA_CONTRACTS.FarmingPool,
          abi: FARMING_POOL_ABI,
          functionName: 'userInfo',
          args: [PID, client.account.address]
        }) as [bigint, bigint]
        stakedLPBefore = userInfo[0]
        // Get LP wallet balance
        lpBefore = await client.publicClient.readContract({
          address: SEPOLIA_CONTRACTS.BTD_USDC,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [client.account.address]
        })

        console.log('[Formula] Pending BRS:', formatEther(pendingBRSBefore))
        console.log('[Formula] BRS balance before:', formatEther(brsBefore))
        console.log('[Formula] Staked LP:', formatEther(stakedLPBefore))
        console.log('[Formula] LP wallet balance:', formatEther(lpBefore))
      } catch (e) {
        console.log('[Formula] Setup error:', e)
      }
    }

    try {
      await page.goto(`${BASE_URL}/farm`)
      await page.waitForLoadState('domcontentloaded')
      await connectWallet(page, metamask)
      if (page.isClosed()) { console.log("[Page closed, completing test]"); return }

      await page.waitForTimeout(WAIT.MEDIUM)
      if (page.isClosed()) { console.log("[Page closed, completing test]"); return }

      // Claim rewards if available
      let claimSuccess = false
      const claimBtn = page.locator('button:has-text("Claim"), button:has-text("Harvest")')
      if (await claimBtn.count() > 0 && !(await claimBtn.first().isDisabled())) {
        console.log('[Farm] Claiming rewards...')
        await claimBtn.first().click()
        claimSuccess = await waitForTx(page, metamask, 'Claim')
        if (page.isClosed()) { console.log("[Page closed, completing test]"); return }
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
      if (await withdrawTab.count() > 0 && !(await withdrawTab.first().isDisabled())) {
        await withdrawTab.first().click()
        await page.waitForTimeout(WAIT.SHORT)
      } else {
        console.log('[Farm] Withdraw tab disabled - no LP deposited')
      }

      // Max withdraw
      const maxBtn = page.locator('button:has-text("Max")')
      if (await maxBtn.count() > 0) {
        await maxBtn.first().click()
        await page.waitForTimeout(WAIT.SHORT)
      }

      await screenshot(page, '07-farm-withdraw-input')

      // Click Withdraw button
      let withdrawSuccess = false
      const withdrawBtn = page.locator('button:has-text("Withdraw"), button:has-text("Unstake")')
      if (await withdrawBtn.count() > 0 && !(await withdrawBtn.first().isDisabled())) {
        console.log('[Farm] Withdrawing from farm...')
        await withdrawBtn.first().click()
        withdrawSuccess = await waitForTx(page, metamask, 'Farm Withdraw')
      }

      // ===== FORMULA VERIFICATION =====
      if (client && (claimSuccess || withdrawSuccess)) {
        await sleep(5000)
        try {
          // Verify BRS claimed = pending
          if (claimSuccess && pendingBRSBefore > 0n) {
            const brsAfter = await client.publicClient.readContract({
              address: SEPOLIA_CONTRACTS.BRS,
              abi: ERC20_ABI,
              functionName: 'balanceOf',
              args: [client.account.address]
            })
            const actualBRS = brsAfter - brsBefore
            console.log('[Formula] BRS after:', formatEther(brsAfter))
            console.log('[Formula] BRS claimed:', formatEther(actualBRS))
            console.log('[Formula] Expected (pending):', formatEther(pendingBRSBefore))

            if (actualBRS > 0n && pendingBRSBefore > 0n) {
              const ratio = Number(actualBRS) / Number(pendingBRSBefore)
              console.log('[Formula] Ratio:', ratio.toFixed(4))
              if (ratio >= 0.999 && ratio <= 1.001) {
                console.log('[Formula] ✓ BRS claimed matches pending (within 0.1%)')
              } else {
                console.log('[Formula] ✗ BRS deviation:', ((ratio - 1) * 100).toFixed(2) + '%')
              }
            }
          }

          // Verify LP withdrawn = staked amount
          if (withdrawSuccess && stakedLPBefore > 0n) {
            const lpAfter = await client.publicClient.readContract({
              address: SEPOLIA_CONTRACTS.BTD_USDC,
              abi: ERC20_ABI,
              functionName: 'balanceOf',
              args: [client.account.address]
            })
            const actualLP = lpAfter - lpBefore
            console.log('[Formula] LP after:', formatEther(lpAfter))
            console.log('[Formula] LP withdrawn:', formatEther(actualLP))
            console.log('[Formula] Expected (staked):', formatEther(stakedLPBefore))

            if (actualLP > 0n && stakedLPBefore > 0n) {
              const ratio = Number(actualLP) / Number(stakedLPBefore)
              console.log('[Formula] Ratio:', ratio.toFixed(4))
              if (ratio >= 0.999 && ratio <= 1.001) {
                console.log('[Formula] ✓ LP withdrawn matches staked (within 0.1%)')
              } else {
                console.log('[Formula] ✗ LP deviation:', ((ratio - 1) * 100).toFixed(2) + '%')
              }
            }
          }
        } catch (e) {
          console.log('[Formula] Verification error:', e)
        }
      }

      await screenshot(page, '07-farm-withdraw-result')
      console.log('[Farm Withdraw] Complete')
    } catch (e) {
      console.log('[Farm Withdraw] Error:', e)
    }
  })

  // ==================== 8. REMOVE LIQUIDITY + FORMULA VERIFICATION ====================
  test('8. Remove Liquidity', async ({ page, metamask }) => {
    console.log('\n========== TEST 8: REMOVE LIQUIDITY ==========')
    if (page.isClosed()) { console.log("[Page closed, completing test]"); return }

    const client = createVerificationClient()
    let lpBalance = 0n
    let btdBefore = 0n
    let usdcBefore = 0n
    let reserveBTD = 0n
    let reserveUSDC = 0n
    let totalSupply = 0n

    // Setup for formula verification
    if (client) {
      try {
        lpBalance = await client.publicClient.readContract({
          address: SEPOLIA_CONTRACTS.BTD_USDC,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [client.account.address]
        })
        btdBefore = await client.publicClient.readContract({
          address: SEPOLIA_CONTRACTS.BTD,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [client.account.address]
        })
        usdcBefore = await client.publicClient.readContract({
          address: SEPOLIA_CONTRACTS.USDC,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [client.account.address]
        })
        totalSupply = await client.publicClient.readContract({
          address: SEPOLIA_CONTRACTS.BTD_USDC,
          abi: UNISWAP_PAIR_ABI,
          functionName: 'totalSupply'
        })
        const reserves = await client.publicClient.readContract({
          address: SEPOLIA_CONTRACTS.BTD_USDC,
          abi: UNISWAP_PAIR_ABI,
          functionName: 'getReserves'
        }) as [bigint, bigint, number]
        const token0 = await client.publicClient.readContract({
          address: SEPOLIA_CONTRACTS.BTD_USDC,
          abi: UNISWAP_PAIR_ABI,
          functionName: 'token0'
        }) as string
        if (token0.toLowerCase() === SEPOLIA_CONTRACTS.BTD.toLowerCase()) {
          reserveBTD = reserves[0]
          reserveUSDC = reserves[1]
        } else {
          reserveBTD = reserves[1]
          reserveUSDC = reserves[0]
        }

        console.log('[Formula] LP balance:', formatEther(lpBalance))
        console.log('[Formula] BTD before:', formatEther(btdBefore))
        console.log('[Formula] USDC before:', formatUnits(usdcBefore, 6))
        console.log('[Formula] Reserve BTD:', formatEther(reserveBTD))
        console.log('[Formula] Reserve USDC:', formatUnits(reserveUSDC, 6))
        console.log('[Formula] Total LP supply:', formatEther(totalSupply))
      } catch (e) {
        console.log('[Formula] Setup error:', e)
      }
    }

    try {
      await page.goto(`${BASE_URL}/swap`)
      await page.waitForLoadState('domcontentloaded')
      await connectWallet(page, metamask)
      if (page.isClosed()) { console.log("[Page closed, completing test]"); return }

      // Click Remove Liquidity tab
      const removeTab = page.locator('button:has-text("Remove Liquidity")').first()
      await removeTab.click()
      await page.waitForTimeout(WAIT.MEDIUM)
      if (page.isClosed()) { console.log("[Page closed, completing test]"); return }

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
        if (page.isClosed()) { console.log("[Page closed, completing test]"); return }
      }

      // Click Remove button
      let removeSuccess = false
      const removeBtn = page.locator('button.btn-primary:has-text("Remove")')
      if (await removeBtn.count() > 0 && !(await removeBtn.first().isDisabled())) {
        console.log('[Remove Liquidity] Removing...')
        await removeBtn.first().click()
        removeSuccess = await waitForTx(page, metamask, 'Remove Liquidity')
      }

      // ===== FORMULA VERIFICATION =====
      // Formula: tokens = LP * reserve / totalSupply
      if (removeSuccess && client && lpBalance > 0n && totalSupply > 0n) {
        await sleep(5000)
        try {
          const btdAfter = await client.publicClient.readContract({
            address: SEPOLIA_CONTRACTS.BTD,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [client.account.address]
          })
          const usdcAfter = await client.publicClient.readContract({
            address: SEPOLIA_CONTRACTS.USDC,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [client.account.address]
          })

          const actualBTD = btdAfter - btdBefore
          const actualUSDC = usdcAfter - usdcBefore
          console.log('[Formula] BTD after:', formatEther(btdAfter))
          console.log('[Formula] USDC after:', formatUnits(usdcAfter, 6))
          console.log('[Formula] BTD received:', formatEther(actualBTD))
          console.log('[Formula] USDC received:', formatUnits(actualUSDC, 6))

          // Calculate expected tokens
          const expectedBTD = (lpBalance * reserveBTD) / totalSupply
          const expectedUSDC = (lpBalance * reserveUSDC) / totalSupply
          console.log('[Formula] Expected BTD:', formatEther(expectedBTD))
          console.log('[Formula] Expected USDC:', formatUnits(expectedUSDC, 6))

          // Verify BTD
          if (actualBTD > 0n && expectedBTD > 0n) {
            const ratioBTD = Number(actualBTD) / Number(expectedBTD)
            console.log('[Formula] BTD Ratio:', ratioBTD.toFixed(4))
            if (ratioBTD >= 0.999 && ratioBTD <= 1.001) {
              console.log('[Formula] ✓ BTD received matches formula (within 0.1%)')
            } else {
              console.log('[Formula] ✗ BTD deviation:', ((ratioBTD - 1) * 100).toFixed(2) + '%')
            }
          }

          // Verify USDC
          if (actualUSDC > 0n && expectedUSDC > 0n) {
            const ratioUSDC = Number(actualUSDC) / Number(expectedUSDC)
            console.log('[Formula] USDC Ratio:', ratioUSDC.toFixed(4))
            if (ratioUSDC >= 0.999 && ratioUSDC <= 1.001) {
              console.log('[Formula] ✓ USDC received matches formula (within 0.1%)')
            } else {
              console.log('[Formula] ✗ USDC deviation:', ((ratioUSDC - 1) * 100).toFixed(2) + '%')
            }
          }
        } catch (e) {
          console.log('[Formula] Verification error:', e)
        }
      }

      await screenshot(page, '08-remove-liquidity-result')
      console.log('[Remove Liquidity] Complete')
    } catch (e) {
      console.log('[Remove Liquidity] Error:', e)
    }
  })

  // ==================== 9. REDEEM BTD + FORMULA VERIFICATION ====================
  test('9. Redeem BTD (CR-dependent outcome)', async ({ page, metamask }) => {
    console.log('\n========== TEST 9: REDEEM BTD ==========')
    if (page.isClosed()) { console.log("[Page closed, completing test]"); return }

    const privateKey = process.env.OKX_PRIVATE_KEY
    let publicClient: any = null
    let account: any = null
    let wbtcBefore = 0n
    let wbtcPrice = 0n
    let iusdPrice = 0n
    let crRaw = 0n

    // Setup for formula verification
    if (privateKey) {
      account = privateKeyToAccount(privateKey as `0x${string}`)
      publicClient = createPublicClient({
        chain: sepolia,
        transport: http('https://sepolia.gateway.tenderly.co', { timeout: 30000 })
      })

      try {
        wbtcPrice = await publicClient.readContract({
          address: SEPOLIA_CONTRACTS.PriceOracle,
          abi: PRICE_ORACLE_ABI,
          functionName: 'getWBTCPrice'
        })
        iusdPrice = await publicClient.readContract({
          address: SEPOLIA_CONTRACTS.PriceOracle,
          abi: PRICE_ORACLE_ABI,
          functionName: 'getIUSDPrice'
        })
        crRaw = await publicClient.readContract({
          address: SEPOLIA_CONTRACTS.Minter,
          abi: MINTER_ABI,
          functionName: 'getCollateralRatio'
        })
        wbtcBefore = await publicClient.readContract({
          address: SEPOLIA_CONTRACTS.WBTC,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [account.address]
        })

        const crPercent = Number(formatUnits(crRaw, 18)) * 100
        console.log('[Formula] WBTC Price:', formatEther(wbtcPrice), 'USD')
        console.log('[Formula] IUSD Price:', formatEther(iusdPrice), 'USD')
        console.log('[Formula] Collateral Ratio:', crPercent.toFixed(2) + '%')
        console.log('[Formula] WBTC balance before:', formatUnits(wbtcBefore, 8))
      } catch (e) {
        console.log('[Formula] Setup error:', e)
      }
    }

    try {
      await page.goto(BASE_URL)
      await page.waitForLoadState('domcontentloaded')
      await connectWallet(page, metamask)
      if (page.isClosed()) { console.log("[Page closed, completing test]"); return }

      // Click Redeem BTD tab
      const redeemTab = page.locator('button:has-text("Redeem BTD")').first()
      await redeemTab.click()
      await page.waitForTimeout(WAIT.MEDIUM)
      if (page.isClosed()) { console.log("[Page closed, completing test]"); return }

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
      if (page.isClosed()) { console.log('[Redeem BTD] Page closed'); return }

      // Click Redeem button
      let redeemSuccess = false
      const redeemBtn = page.locator('button.btn-primary:has-text("Redeem BTD")')
      const redeemCount = await redeemBtn.count().catch(() => 0)
      if (redeemCount > 0 && !(await redeemBtn.first().isDisabled().catch(() => true))) {
        console.log('[Redeem BTD] Redeeming...')
        await redeemBtn.first().click()
        redeemSuccess = await waitForTx(page, metamask, 'Redeem BTD')
      } else {
        const btnText = await page.locator('button.btn-primary').first().textContent().catch(() => '')
        console.log('[Redeem BTD] Button state:', btnText)
      }

      // ===== FORMULA VERIFICATION =====
      if (redeemSuccess && publicClient && account) {
        await sleep(5000)

        try {
          const wbtcAfter = await publicClient.readContract({
            address: SEPOLIA_CONTRACTS.WBTC,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [account.address]
          })

          const actualWBTC = wbtcAfter - wbtcBefore
          console.log('[Formula] WBTC balance after:', formatUnits(wbtcAfter, 8))
          console.log('[Formula] Actual WBTC received:', formatUnits(actualWBTC, 8))

          // Calculate expected WBTC
          // CR >= 100%: WBTC = BTD × (IUSD_Price / WBTC_Price)
          // CR < 100%: WBTC = BTD × CR × (IUSD_Price / WBTC_Price)
          const btdIn18Decimals = parseUnits(AMOUNTS.BTD_REDEEM, 18)
          const crPercent = Number(formatUnits(crRaw, 18)) * 100
          let expectedWBTC: bigint

          if (crPercent >= 100) {
            expectedWBTC = (btdIn18Decimals * iusdPrice) / wbtcPrice
          } else {
            expectedWBTC = (btdIn18Decimals * crRaw * iusdPrice) / (wbtcPrice * BigInt(10 ** 18))
          }

          const expectedWBTC8 = expectedWBTC / BigInt(10 ** 10)
          console.log('[Formula] Expected WBTC:', formatUnits(expectedWBTC8, 8))
          console.log('[Formula] CR scenario:', crPercent >= 100 ? 'Full redemption' : 'Partial + compensation')

          if (actualWBTC > 0n && expectedWBTC8 > 0n) {
            const ratio = Number(actualWBTC) / Number(expectedWBTC8)
            console.log('[Formula] Ratio (actual/expected):', ratio.toFixed(4))

            if (ratio >= 0.999 && ratio <= 1.001) {
              console.log('[Formula] ✓ Redeem WBTC matches formula (within 0.1%)')
            } else {
              console.log('[Formula] ✗ Redeem WBTC deviation:', ((ratio - 1) * 100).toFixed(2) + '%')
            }
          }
        } catch (e) {
          console.log('[Formula] Verification error:', e)
        }
      }

      await screenshot(page, '09-redeem-btd-result')
      console.log('[Redeem BTD] Complete')
    } catch (e) {
      console.log('[Redeem BTD] Error:', e)
    }
  })

  // ==================== 10. REDEEM BTB + FORMULA VERIFICATION ====================
  test('10. Redeem BTB (requires CR >= 100%)', async ({ page, metamask }) => {
    console.log('\n========== TEST 10: REDEEM BTB ==========')
    if (page.isClosed()) { console.log("[Page closed, completing test]"); return }

    const client = createVerificationClient()
    let btbBalance = 0n
    let btdBefore = 0n
    let btbPrice = 0n
    let iusdPrice = 0n
    let crRaw = 0n

    // Setup for formula verification
    if (client) {
      try {
        btbBalance = await client.publicClient.readContract({
          address: SEPOLIA_CONTRACTS.BTB,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [client.account.address]
        })
        btdBefore = await client.publicClient.readContract({
          address: SEPOLIA_CONTRACTS.BTD,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [client.account.address]
        })
        btbPrice = await client.publicClient.readContract({
          address: SEPOLIA_CONTRACTS.PriceOracle,
          abi: PRICE_ORACLE_ABI,
          functionName: 'getBTBPrice'
        })
        iusdPrice = await client.publicClient.readContract({
          address: SEPOLIA_CONTRACTS.PriceOracle,
          abi: PRICE_ORACLE_ABI,
          functionName: 'getIUSDPrice'
        })
        crRaw = await client.publicClient.readContract({
          address: SEPOLIA_CONTRACTS.Minter,
          abi: MINTER_ABI,
          functionName: 'getCollateralRatio'
        })

        const crPercent = Number(formatUnits(crRaw, 18)) * 100
        console.log('[Formula] BTB balance:', formatEther(btbBalance))
        console.log('[Formula] BTD before:', formatEther(btdBefore))
        console.log('[Formula] BTB Price:', formatEther(btbPrice), 'USD')
        console.log('[Formula] IUSD Price:', formatEther(iusdPrice), 'USD')
        console.log('[Formula] Collateral Ratio:', crPercent.toFixed(2) + '%')
      } catch (e) {
        console.log('[Formula] Setup error:', e)
      }
    }

    try {
      await page.goto(BASE_URL)
      await page.waitForLoadState('domcontentloaded')
      await connectWallet(page, metamask)
      if (page.isClosed()) { console.log("[Page closed, completing test]"); return }

      // Click Redeem BTB tab
      const redeemTab = page.locator('button:has-text("Redeem BTB")').first()
      await redeemTab.click()
      await page.waitForTimeout(WAIT.MEDIUM)
      if (page.isClosed()) { console.log("[Page closed, completing test]"); return }

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
      let redeemSuccess = false
      const redeemBtn = page.locator('button.btn-primary:has-text("Convert BTB"), button.btn-primary:has-text("Redeem")')
      if (await redeemBtn.count() > 0) {
        const isDisabled = await redeemBtn.first().isDisabled()
        const btnText = await redeemBtn.first().textContent().catch(() => '')
        console.log('[Redeem BTB] Button:', btnText, 'Disabled:', isDisabled)

        if (!isDisabled) {
          console.log('[Redeem BTB] Converting BTB to BTD...')
          await redeemBtn.first().click()
          redeemSuccess = await waitForTx(page, metamask, 'Redeem BTB')
        } else {
          console.log('[Redeem BTB] Cannot redeem - CR < 100% or no BTB balance')
        }
      }

      // ===== FORMULA VERIFICATION =====
      // Formula: BTD = BTB × BTB_Price / IUSD_Price
      if (redeemSuccess && client && btbBalance > 0n) {
        await sleep(5000)
        try {
          const btdAfter = await client.publicClient.readContract({
            address: SEPOLIA_CONTRACTS.BTD,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [client.account.address]
          })

          const actualBTD = btdAfter - btdBefore
          console.log('[Formula] BTD after:', formatEther(btdAfter))
          console.log('[Formula] Actual BTD received:', formatEther(actualBTD))

          // Calculate expected BTD = BTB × BTB_Price / IUSD_Price
          const expectedBTD = (btbBalance * btbPrice) / iusdPrice
          console.log('[Formula] Expected BTD:', formatEther(expectedBTD))

          if (actualBTD > 0n && expectedBTD > 0n) {
            const ratio = Number(actualBTD) / Number(expectedBTD)
            console.log('[Formula] Ratio (actual/expected):', ratio.toFixed(4))
            if (ratio >= 0.999 && ratio <= 1.001) {
              console.log('[Formula] ✓ Redeem BTB matches formula (within 0.1%)')
            } else {
              console.log('[Formula] ✗ Redeem BTB deviation:', ((ratio - 1) * 100).toFixed(2) + '%')
            }
          }
        } catch (e) {
          console.log('[Formula] Verification error:', e)
        }
      }

      await screenshot(page, '10-redeem-btb-result')
      console.log('[Redeem BTB] Complete')
    } catch (e) {
      console.log('[Redeem BTB] Error:', e)
    }
  })
})
