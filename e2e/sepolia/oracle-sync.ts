/**
 * Oracle Price Sync for Sepolia E2E Tests
 *
 * Ensures the PriceOracle's Uniswap spot price is within maxDeviationBps
 * of the Chainlink feed before tests run. On Sepolia testnet, the
 * WBTC/USDC pool can drift from the Chainlink feed, causing
 * getWBTCPrice() to revert with "Uniswap/Chainlink price mismatch".
 *
 * Fix: execute a small swap to re-align the Uniswap pool price,
 * then update the TWAP oracle.
 */

import { createWalletClient, createPublicClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { SEPOLIA_RPC_URL, TEST_PRIVATE_KEY, ADDRESSES } from './constants'

// PriceOracle address
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const contractsData = require('../../src/config/contracts.json')
const PRICE_ORACLE = contractsData.contracts.PriceOracle as `0x${string}`

const oracleAbi = [
  {
    name: 'getWBTCPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'getChainlinkBTCUSD',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'updateTWAPAll',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'maxDeviationBps',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const

const pairAbi = [
  {
    name: 'getReserves',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint112' }, { type: 'uint112' }, { type: 'uint32' }],
  },
  {
    name: 'token0',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'swap',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ type: 'uint256' }, { type: 'uint256' }, { type: 'address' }, { type: 'bytes' }],
    outputs: [],
  },
] as const

const erc20Abi = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ type: 'address' }, { type: 'uint256' }],
    outputs: [{ type: 'bool' }],
  },
] as const

export async function syncOraclePrice(): Promise<void> {
  if (!TEST_PRIVATE_KEY) {
    console.log('[OracleSync] No private key — skipping')
    return
  }

  const account = privateKeyToAccount(TEST_PRIVATE_KEY as `0x${string}`)
  const pub = createPublicClient({ chain: sepolia, transport: http(SEPOLIA_RPC_URL) })
  const wallet = createWalletClient({ account, chain: sepolia, transport: http(SEPOLIA_RPC_URL) })

  // Check if oracle already works
  try {
    const price = await pub.readContract({
      address: PRICE_ORACLE,
      abi: oracleAbi,
      functionName: 'getWBTCPrice',
    })
    console.log(`[OracleSync] Oracle OK — WBTC = $${(Number(price) / 1e18).toFixed(2)}`)
    return
  } catch {
    console.log('[OracleSync] Oracle price mismatch detected — syncing...')
  }

  // Get Chainlink target price
  const chainlinkPrice = await pub.readContract({
    address: PRICE_ORACLE,
    abi: oracleAbi,
    functionName: 'getChainlinkBTCUSD',
  })
  const targetUSD = Number(chainlinkPrice) / 1e18
  console.log(`[OracleSync] Chainlink BTC/USD = $${targetUSD.toFixed(2)}`)

  // Get current Uniswap reserves
  const pool = ADDRESSES.WBTC_USDC
  const [r0, r1] = await pub.readContract({
    address: pool,
    abi: pairAbi,
    functionName: 'getReserves',
  })
  const token0 = await pub.readContract({ address: pool, abi: pairAbi, functionName: 'token0' })
  const wbtcIsToken0 = token0.toLowerCase() === ADDRESSES.WBTC.toLowerCase()

  const wbtcReserve = Number(wbtcIsToken0 ? r0 : r1)
  const usdcReserve = Number(wbtcIsToken0 ? r1 : r0)
  // Price = USDC(6dec) / WBTC(8dec) * 100
  const currentPrice = (usdcReserve / wbtcReserve) * 100
  console.log(`[OracleSync] Uniswap WBTC = $${currentPrice.toFixed(2)}`)

  const deviationBps = (Math.abs(currentPrice - targetUSD) / targetUSD) * 10000
  console.log(`[OracleSync] Deviation = ${deviationBps.toFixed(0)} bps`)

  if (deviationBps < 50) {
    // Within safe range, just update TWAP
    console.log('[OracleSync] Within range — updating TWAP only')
  } else {
    // Need to swap to align price
    // Using constant product: k = wbtcReserve * usdcReserve
    const k = wbtcReserve * usdcReserve
    // Target: newUsdc / newWbtc * 100 = targetUSD
    // newWbtc^2 = k * 100 / targetUSD
    const newWbtc = Math.sqrt((k * 100) / targetUSD)
    const newUsdc = k / newWbtc

    if (currentPrice < targetUSD) {
      // Need to push price UP: sell USDC, buy WBTC
      const usdcIn = BigInt(Math.ceil(newUsdc - usdcReserve))
      const wbtcOut = BigInt(Math.floor(wbtcReserve - newWbtc)) - 30n // safety margin for fees
      if (wbtcOut <= 0n) {
        console.log('[OracleSync] Calculated wbtcOut too small, skipping')
        return
      }
      console.log(`[OracleSync] Selling ${usdcIn} USDC for ${wbtcOut} WBTC`)

      // Transfer USDC to pool
      const h1 = await wallet.writeContract({
        address: ADDRESSES.USDC,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [pool, usdcIn],
      })
      await pub.waitForTransactionReceipt({ hash: h1 })

      // Swap: get WBTC out
      const args: [bigint, bigint, `0x${string}`, `0x${string}`] = wbtcIsToken0
        ? [wbtcOut, 0n, account.address, '0x']
        : [0n, wbtcOut, account.address, '0x']
      const h2 = await wallet.writeContract({
        address: pool,
        abi: pairAbi,
        functionName: 'swap',
        args,
      })
      await pub.waitForTransactionReceipt({ hash: h2 })
    } else {
      // Need to push price DOWN: sell WBTC, buy USDC
      const wbtcIn = BigInt(Math.ceil(newWbtc - wbtcReserve))
      const usdcOut = BigInt(Math.floor(usdcReserve - newUsdc)) - 30n
      if (usdcOut <= 0n) {
        console.log('[OracleSync] Calculated usdcOut too small, skipping')
        return
      }
      console.log(`[OracleSync] Selling ${wbtcIn} WBTC for ${usdcOut} USDC`)

      // Transfer WBTC to pool
      const h1 = await wallet.writeContract({
        address: ADDRESSES.WBTC,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [pool, wbtcIn],
      })
      await pub.waitForTransactionReceipt({ hash: h1 })

      // Swap: get USDC out
      const args: [bigint, bigint, `0x${string}`, `0x${string}`] = wbtcIsToken0
        ? [0n, usdcOut, account.address, '0x']
        : [usdcOut, 0n, account.address, '0x']
      const h2 = await wallet.writeContract({
        address: pool,
        abi: pairAbi,
        functionName: 'swap',
        args,
      })
      await pub.waitForTransactionReceipt({ hash: h2 })
    }
  }

  // Update TWAP after price alignment
  const h3 = await wallet.writeContract({
    address: PRICE_ORACLE,
    abi: oracleAbi,
    functionName: 'updateTWAPAll',
  })
  await pub.waitForTransactionReceipt({ hash: h3 })

  // Verify
  try {
    const price = await pub.readContract({
      address: PRICE_ORACLE,
      abi: oracleAbi,
      functionName: 'getWBTCPrice',
    })
    console.log(`[OracleSync] Oracle fixed — WBTC = $${(Number(price) / 1e18).toFixed(2)}`)
  } catch (e: any) {
    console.log(`[OracleSync] Oracle still failing after sync: ${e.message?.split('\n')[0]}`)
  }
}
