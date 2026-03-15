/**
 * Sepolia E2E Test Constants
 *
 * Configuration for Sepolia testnet E2E tests.
 * Private key and RPC URL are loaded from .env.local.
 */

import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const contractsData = require('../../src/config/contracts.json')

const { tokens, contracts, pairs } = contractsData

// Network
export const SEPOLIA_CHAIN_ID = 11155111
export const SEPOLIA_CHAIN_ID_HEX = '0xaa36a7'

// RPC - use publicnode as default, allow override via env
export const SEPOLIA_RPC_URL =
  process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com'

// Test account - deployer key from .env.local
export const TEST_PRIVATE_KEY = process.env.OKX_PRIVATE_KEY || ''
export const TEST_ADDRESS = '0x8f78be5c6b41c2d7634d25c7db22b26409671ca9'

// Contract addresses (from contracts.json)
export const ADDRESSES = {
  // Tokens
  WBTC: tokens.WBTC as `0x${string}`,
  USDC: tokens.USDC as `0x${string}`,
  USDT: tokens.USDT as `0x${string}`,
  WETH: tokens.WETH as `0x${string}`,
  BRS: tokens.BRS as `0x${string}`,
  BTD: tokens.BTD as `0x${string}`,
  BTB: tokens.BTB as `0x${string}`,
  stBTD: tokens.stBTD as `0x${string}`,
  stBTB: tokens.stBTB as `0x${string}`,

  // Core contracts
  ConfigCore: contracts.ConfigCore as `0x${string}`,
  Treasury: contracts.Treasury as `0x${string}`,
  Minter: contracts.Minter as `0x${string}`,
  InterestPool: contracts.InterestPool as `0x${string}`,
  FarmingPool: contracts.FarmingPool as `0x${string}`,
  Faucet: (contracts as { Faucet?: string }).Faucet as `0x${string}`,

  // Pairs
  WBTC_USDC: pairs.WBTC_USDC as `0x${string}`,
  BTD_USDC: pairs.BTD_USDC as `0x${string}`,
  BTB_BTD: pairs.BTB_BTD as `0x${string}`,
  BRS_BTD: pairs.BRS_BTD as `0x${string}`,
} as const

// Timeouts
export const TIMEOUT = {
  TX: 120_000,       // 120s for Sepolia tx confirmation
  READ: 30_000,      // 30s for read operations
  PAGE_LOAD: 30_000, // 30s for page load (remote site may be slower)
  SHORT: 2_000,
  MEDIUM: 5_000,
} as const
