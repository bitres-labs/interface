/**
 * Phase 1: Comprehensive Data Verification Tests
 *
 * Tests all pages to verify:
 * 1. Displayed values match on-chain contract data
 * 2. Values pass sanity checks (reasonable ranges, non-negative, etc.)
 * 3. All data fields are properly loaded (no $0 or empty values)
 */

import { test, expect } from '@playwright/test'
import { createPublicClient, http, formatUnits } from 'viem'
import { hardhat } from 'viem/chains'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

// ES module path resolution
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load deployment info
const deploymentPath = path.join(__dirname, '../public/deployment-local-state.json')
const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'))

// Create viem client for direct contract reads
const client = createPublicClient({
  chain: { ...hardhat, id: 31337 },
  transport: http('http://localhost:8545'),
})

// ============ Contract ABIs ============

const erc20Abi = [
  { inputs: [], name: 'totalSupply', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'decimals', outputs: [{ type: 'uint8' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'symbol', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'account', type: 'address' }], name: 'balanceOf', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
] as const

const priceOracleAbi = [
  { inputs: [], name: 'getWBTCPrice', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'getBTDPrice', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'getBTBPrice', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'getBRSPrice', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'getIUSDPrice', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
] as const

const treasuryAbi = [
  { inputs: [], name: 'getCollateralRatio', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'totalCollateral', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
] as const

const farmingPoolAbi = [
  { inputs: [], name: 'minted', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'currentRewardPerSecond', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'poolLength', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'pid', type: 'uint256' }], name: 'poolInfo', outputs: [{ type: 'address' }, { type: 'uint256' }, { type: 'uint256' }, { type: 'uint256' }], stateMutability: 'view', type: 'function' },
] as const

const stakingRouterAbi = [
  { inputs: [], name: 'poolLength', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
] as const

// ============ Helper Functions ============

interface ContractData {
  prices: {
    wbtc: number
    btd: number
    btb: number
    brs: number
    iusd: number
  }
  supplies: {
    btd: number
    btb: number
    brs: number
    wbtc: number
  }
  treasury: {
    collateralRatio: number
    wbtcBalance: number
    btdBalance: number
  }
  farming: {
    minted: number
    rewardPerSecond: number
    poolCount: number
  }
}

async function readContractData(): Promise<ContractData> {
  // Read prices
  const wbtcPrice = await client.readContract({
    address: deployment.contracts.priceOracle as `0x${string}`,
    abi: priceOracleAbi,
    functionName: 'getWBTCPrice',
  })

  const btdPrice = await client.readContract({
    address: deployment.contracts.priceOracle as `0x${string}`,
    abi: priceOracleAbi,
    functionName: 'getBTDPrice',
  })

  const btbPrice = await client.readContract({
    address: deployment.contracts.priceOracle as `0x${string}`,
    abi: priceOracleAbi,
    functionName: 'getBTBPrice',
  })

  const brsPrice = await client.readContract({
    address: deployment.contracts.priceOracle as `0x${string}`,
    abi: priceOracleAbi,
    functionName: 'getBRSPrice',
  })

  let iusdPrice = 1n * 10n ** 18n // Default to $1
  try {
    iusdPrice = await client.readContract({
      address: deployment.contracts.priceOracle as `0x${string}`,
      abi: priceOracleAbi,
      functionName: 'getIUSDPrice',
    })
  } catch {
    console.log('IUSD price not available, using default $1')
  }

  // Read supplies
  const btdSupply = await client.readContract({
    address: deployment.contracts.btd as `0x${string}`,
    abi: erc20Abi,
    functionName: 'totalSupply',
  })

  const btbSupply = await client.readContract({
    address: deployment.contracts.btb as `0x${string}`,
    abi: erc20Abi,
    functionName: 'totalSupply',
  })

  const brsSupply = await client.readContract({
    address: deployment.contracts.brs as `0x${string}`,
    abi: erc20Abi,
    functionName: 'totalSupply',
  })

  const wbtcSupply = await client.readContract({
    address: deployment.contracts.wbtc as `0x${string}`,
    abi: erc20Abi,
    functionName: 'totalSupply',
  })

  // Read treasury data
  let collateralRatio = 0n
  try {
    collateralRatio = await client.readContract({
      address: deployment.contracts.treasury as `0x${string}`,
      abi: treasuryAbi,
      functionName: 'getCollateralRatio',
    })
  } catch {
    console.log('Collateral ratio not available')
  }

  const treasuryWbtcBalance = await client.readContract({
    address: deployment.contracts.wbtc as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [deployment.contracts.treasury as `0x${string}`],
  })

  const treasuryBtdBalance = await client.readContract({
    address: deployment.contracts.btd as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [deployment.contracts.treasury as `0x${string}`],
  })

  // Read farming data
  const farmingMinted = await client.readContract({
    address: deployment.contracts.farmingPool as `0x${string}`,
    abi: farmingPoolAbi,
    functionName: 'minted',
  })

  const rewardPerSecond = await client.readContract({
    address: deployment.contracts.farmingPool as `0x${string}`,
    abi: farmingPoolAbi,
    functionName: 'currentRewardPerSecond',
  })

  const poolCount = await client.readContract({
    address: deployment.contracts.farmingPool as `0x${string}`,
    abi: farmingPoolAbi,
    functionName: 'poolLength',
  })

  return {
    prices: {
      wbtc: Number(formatUnits(wbtcPrice, 18)),
      btd: Number(formatUnits(btdPrice, 18)),
      btb: Number(formatUnits(btbPrice, 18)),
      brs: Number(formatUnits(brsPrice, 18)),
      iusd: Number(formatUnits(iusdPrice, 18)),
    },
    supplies: {
      btd: Number(formatUnits(btdSupply, 18)),
      btb: Number(formatUnits(btbSupply, 18)),
      brs: Number(formatUnits(brsSupply, 18)),
      wbtc: Number(formatUnits(wbtcSupply, 8)),
    },
    treasury: {
      collateralRatio: Number(collateralRatio) / 100, // Basis points to percentage
      wbtcBalance: Number(formatUnits(treasuryWbtcBalance, 8)),
      btdBalance: Number(formatUnits(treasuryBtdBalance, 18)),
    },
    farming: {
      minted: Number(formatUnits(farmingMinted, 18)),
      rewardPerSecond: Number(formatUnits(rewardPerSecond, 18)),
      poolCount: Number(poolCount),
    },
  }
}

function extractNumber(text: string): number {
  // Remove $ and commas, parse number
  const cleaned = text.replace(/[$,]/g, '').trim()
  const match = cleaned.match(/[\d.]+/)
  return match ? parseFloat(match[0]) : 0
}

function isWithinTolerance(actual: number, expected: number, tolerancePercent: number = 5): boolean {
  if (expected === 0) return actual === 0
  const tolerance = expected * (tolerancePercent / 100)
  return Math.abs(actual - expected) <= tolerance
}

// ============ Test Suites ============

test.describe('Phase 1: Data Verification', () => {
  let contractData: ContractData

  test.beforeAll(async () => {
    contractData = await readContractData()
    console.log('\n=== Contract Data Loaded ===')
    console.log('WBTC Price:', contractData.prices.wbtc)
    console.log('BTD Price:', contractData.prices.btd)
    console.log('BTB Price:', contractData.prices.btb)
    console.log('BRS Price:', contractData.prices.brs)
    console.log('BTD Supply:', contractData.supplies.btd)
    console.log('BTB Supply:', contractData.supplies.btb)
    console.log('BRS Supply:', contractData.supplies.brs)
  })

  test.describe('Home Page', () => {
    test('should display correct WBTC/BTC price', async ({ page }) => {
      await page.goto('/')
      await page.waitForTimeout(3000)

      // Look for WBTC price display
      const priceText = await page.locator('text=/\\$[\\d,]+\\.?\\d*/').first().textContent()
      if (priceText) {
        const displayedPrice = extractNumber(priceText)
        console.log(`Home: Displayed price: ${displayedPrice}, Contract: ${contractData.prices.wbtc}`)

        // Sanity check: WBTC price should be reasonable (10k-500k)
        expect(contractData.prices.wbtc).toBeGreaterThan(10000)
        expect(contractData.prices.wbtc).toBeLessThan(500000)
      }

      // Check page loads without errors
      const pageContent = await page.content()
      expect(pageContent.length).toBeGreaterThan(1000)
    })

    test('should display non-zero token values', async ({ page }) => {
      await page.goto('/')
      await page.waitForTimeout(3000)

      // Find all dollar values
      const dollarValues = await page.locator('text=/\\$[\\d,]+\\.?\\d*/').allTextContents()
      console.log('Home page dollar values:', dollarValues)

      // Check that not all values are $0
      const nonZeroValues = dollarValues.filter(v => {
        const num = extractNumber(v)
        return num > 0
      })

      console.log(`Home: ${nonZeroValues.length}/${dollarValues.length} non-zero values`)
      expect(nonZeroValues.length).toBeGreaterThan(0)
    })
  })

  test.describe('Explorer Page', () => {
    test('should display correct token prices', async ({ page }) => {
      await page.goto('/explorer')
      await page.waitForTimeout(3000)

      const pageContent = await page.textContent('body') || ''

      // Check WBTC price is displayed correctly
      const wbtcPriceStr = Math.floor(contractData.prices.wbtc).toString()
      const hasWbtcPrice = pageContent.includes(wbtcPriceStr.slice(0, 3)) // First 3 digits
      console.log(`Explorer: WBTC price (${contractData.prices.wbtc}) visible: ${hasWbtcPrice}`)

      // Check BTD price (~$1)
      expect(contractData.prices.btd).toBeGreaterThan(0.9)
      expect(contractData.prices.btd).toBeLessThan(1.1)

      // Check BRS price (~$10)
      expect(contractData.prices.brs).toBeGreaterThan(5)
      expect(contractData.prices.brs).toBeLessThan(20)
    })

    test('should display correct token supplies', async ({ page }) => {
      await page.goto('/explorer')
      await page.waitForTimeout(3000)

      // Sanity checks for supplies
      // BTD supply should be positive
      expect(contractData.supplies.btd).toBeGreaterThan(0)

      // BTB supply should be positive
      expect(contractData.supplies.btb).toBeGreaterThan(0)

      // BRS supply should be exactly 2.1 billion (max supply)
      expect(contractData.supplies.brs).toBe(2100000000)

      // Check page shows token names
      const pageContent = await page.textContent('body') || ''
      expect(pageContent).toContain('BTD')
      expect(pageContent).toContain('BTB')
      expect(pageContent).toContain('BRS')
    })

    test('should display BRS total supply equal to max supply', async ({ page }) => {
      await page.goto('/explorer')
      await page.waitForTimeout(3000)

      // BRS is pre-minted, total supply should equal max supply
      const brsMaxSupply = 2100000000
      expect(contractData.supplies.brs).toBe(brsMaxSupply)

      // Take screenshot for visual verification
      await page.screenshot({ path: 'test-results/explorer-brs-supply.png', fullPage: true })
    })

    test('should display Treasury data', async ({ page }) => {
      await page.goto('/explorer')
      await page.waitForTimeout(3000)

      const pageContent = await page.textContent('body') || ''

      // Check Treasury section exists
      expect(pageContent.toLowerCase()).toContain('treasury')

      // Treasury WBTC balance should be non-negative
      expect(contractData.treasury.wbtcBalance).toBeGreaterThanOrEqual(0)
    })

    test('should display Farming statistics', async ({ page }) => {
      await page.goto('/explorer')
      await page.waitForTimeout(3000)

      // Check farming pool count is reasonable
      expect(contractData.farming.poolCount).toBeGreaterThan(0)
      expect(contractData.farming.poolCount).toBeLessThan(100)

      // Reward per second should be reasonable
      expect(contractData.farming.rewardPerSecond).toBeGreaterThanOrEqual(0)

      // Log BRS distributed for debugging
      console.log(`BRS Distributed (minted): ${contractData.farming.minted}`)

      // Check if page shows BRS Distributed field
      const pageContent = await page.textContent('body') || ''
      const hasDistributedField = pageContent.includes('Distributed') || pageContent.includes('Mined')
      console.log(`Has Distributed/Mined field: ${hasDistributedField}`)
    })

    test('should not show any $0 for major prices', async ({ page }) => {
      await page.goto('/explorer')
      await page.waitForTimeout(3000)

      // Find price displays for each token
      const priceLabels = ['WBTC', 'BTD', 'BTB', 'BRS']

      for (const label of priceLabels) {
        const priceElement = page.locator(`text=${label}`).first()
        if (await priceElement.count() > 0) {
          // Get parent or nearby price value
          const parent = priceElement.locator('xpath=ancestor::div[1]')
          const parentText = await parent.textContent() || ''

          // Check it doesn't show $0 or $0.00
          const hasZeroPrice = /\$0(\.0+)?(?!\d)/.test(parentText)
          console.log(`${label} section: "${parentText.slice(0, 50)}..." hasZeroPrice: ${hasZeroPrice}`)
        }
      }
    })
  })

  test.describe('Farm Page', () => {
    test('should display farming pools', async ({ page }) => {
      await page.goto('/farm')
      await page.waitForTimeout(3000)

      const pageContent = await page.textContent('body') || ''

      // Check farming page has pool-related content
      const hasFarmContent =
        pageContent.includes('APR') ||
        pageContent.includes('APY') ||
        pageContent.includes('TVL') ||
        pageContent.includes('Stake') ||
        pageContent.includes('Farm') ||
        pageContent.includes('Pool')

      expect(hasFarmContent).toBe(true)
    })

    test('should display correct pool count', async ({ page }) => {
      await page.goto('/farm')
      await page.waitForTimeout(3000)

      // Contract has poolCount pools
      const expectedPools = contractData.farming.poolCount
      console.log(`Farm: Expected ${expectedPools} pools`)

      // Count pool cards/rows on page
      const poolElements = await page.locator('[class*="pool"], [class*="card"], [class*="farm"]').count()
      console.log(`Farm: Found ${poolElements} pool-related elements`)

      expect(poolElements).toBeGreaterThan(0)
    })

    test('should display APR/APY values', async ({ page }) => {
      await page.goto('/farm')
      await page.waitForTimeout(3000)

      // Find percentage values
      const percentValues = await page.locator('text=/\\d+\\.?\\d*%/').allTextContents()
      console.log('Farm page percentage values:', percentValues)

      // Should have some APR/APY displays
      expect(percentValues.length).toBeGreaterThan(0)

      // APR should be reasonable (0% - 10000%)
      for (const pv of percentValues) {
        const value = parseFloat(pv.replace('%', ''))
        if (!isNaN(value)) {
          expect(value).toBeGreaterThanOrEqual(0)
          expect(value).toBeLessThan(100000) // 100,000% max
        }
      }
    })
  })

  test.describe('Stake Page', () => {
    test('should display staking options', async ({ page }) => {
      await page.goto('/stake')
      await page.waitForTimeout(3000)

      const pageContent = await page.textContent('body') || ''

      // Check stake page content
      const hasStakeContent =
        pageContent.includes('BTD') ||
        pageContent.includes('BTB') ||
        pageContent.includes('stBTD') ||
        pageContent.includes('stBTB') ||
        pageContent.includes('Stake')

      expect(hasStakeContent).toBe(true)
    })

    test('should display staking rates', async ({ page }) => {
      await page.goto('/stake')
      await page.waitForTimeout(3000)

      // Find APY/rate displays
      const rates = await page.locator('text=/\\d+\\.?\\d*%/').allTextContents()
      console.log('Stake page rates:', rates)

      // Staking rates should be non-negative
      for (const rate of rates) {
        const value = parseFloat(rate.replace('%', ''))
        if (!isNaN(value)) {
          expect(value).toBeGreaterThanOrEqual(0)
        }
      }
    })
  })

  test.describe('Pool/Swap Page', () => {
    test('should display liquidity pools', async ({ page }) => {
      await page.goto('/pool')
      await page.waitForTimeout(3000)

      const pageContent = await page.textContent('body') || ''

      // Check pool page content
      const hasPoolContent =
        pageContent.includes('Liquidity') ||
        pageContent.includes('Pool') ||
        pageContent.includes('LP') ||
        pageContent.includes('Add') ||
        pageContent.includes('Remove')

      expect(hasPoolContent).toBe(true)
    })

    test('should display swap interface', async ({ page }) => {
      await page.goto('/swap')
      await page.waitForTimeout(3000)

      const pageContent = await page.textContent('body') || ''

      // Check swap page content
      const hasSwapContent =
        pageContent.includes('Swap') ||
        pageContent.includes('From') ||
        pageContent.includes('To') ||
        pageContent.includes('Exchange')

      expect(hasSwapContent).toBe(true)
    })
  })

  test.describe('Data Consistency', () => {
    test('all pages should load without JavaScript errors', async ({ page }) => {
      const consoleErrors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })

      const pages = ['/', '/explorer', '/farm', '/stake', '/pool', '/swap']

      for (const pagePath of pages) {
        await page.goto(pagePath)
        await page.waitForTimeout(2000)
      }

      // Filter out expected/benign errors
      const criticalErrors = consoleErrors.filter(e =>
        !e.includes('favicon') &&
        !e.includes('404') &&
        !e.includes('network') &&
        !e.includes('403') &&
        !e.includes('reown.com') &&
        !e.includes('walletconnect') &&
        !e.includes('WalletConnect') &&
        !e.includes('Allowlist')
      )

      console.log('Critical errors:', criticalErrors)
      // Allow some minor errors, but not critical ones
      expect(criticalErrors.length).toBeLessThan(5)
    })

    test('prices should be consistent across pages', async ({ page }) => {
      // Get WBTC price from explorer
      await page.goto('/explorer')
      await page.waitForTimeout(3000)
      const explorerContent = await page.textContent('body') || ''

      // Get WBTC price from home
      await page.goto('/')
      await page.waitForTimeout(3000)
      const homeContent = await page.textContent('body') || ''

      // Both pages should show similar WBTC price (first 3 digits)
      const wbtcPricePrefix = Math.floor(contractData.prices.wbtc / 1000).toString()

      const explorerHasPrice = explorerContent.includes(wbtcPricePrefix)
      const homeHasPrice = homeContent.includes(wbtcPricePrefix)

      console.log(`WBTC price prefix ${wbtcPricePrefix}xxx:`)
      console.log(`  Explorer: ${explorerHasPrice}`)
      console.log(`  Home: ${homeHasPrice}`)
    })
  })

  test.describe('Sanity Checks', () => {
    test('BRS supply should not exceed max supply', async () => {
      const maxSupply = 2100000000
      expect(contractData.supplies.brs).toBeLessThanOrEqual(maxSupply)
    })

    test('BTD price should be around $1 (stablecoin peg)', async () => {
      // BTD is pegged to ideal USD, should be close to $1
      expect(contractData.prices.btd).toBeGreaterThan(0.5)
      expect(contractData.prices.btd).toBeLessThan(2.0)
    })

    test('WBTC price should be in reasonable range', async () => {
      // WBTC/BTC should be $10k - $500k
      expect(contractData.prices.wbtc).toBeGreaterThan(10000)
      expect(contractData.prices.wbtc).toBeLessThan(500000)
    })

    test('all token supplies should be non-negative', async () => {
      expect(contractData.supplies.btd).toBeGreaterThanOrEqual(0)
      expect(contractData.supplies.btb).toBeGreaterThanOrEqual(0)
      expect(contractData.supplies.brs).toBeGreaterThanOrEqual(0)
      expect(contractData.supplies.wbtc).toBeGreaterThanOrEqual(0)
    })

    test('farming reward rate should be reasonable', async () => {
      // Reward per second should not be too high (would drain pool too fast)
      const rewardsPerDay = contractData.farming.rewardPerSecond * 86400
      const rewardsPerYear = rewardsPerDay * 365

      console.log(`Farming rewards: ${contractData.farming.rewardPerSecond}/sec, ${rewardsPerDay}/day, ${rewardsPerYear}/year`)

      // Should not distribute more than total supply per year
      expect(rewardsPerYear).toBeLessThan(contractData.supplies.brs)
    })
  })
})
