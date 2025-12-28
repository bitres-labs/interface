// Bitres Contract Addresses - Multi-Network Support
// Supports: Hardhat Local (31337) and Sepolia Testnet (11155111)

import { CONTRACTS_SEPOLIA, NETWORK_CONFIG_SEPOLIA } from './contracts-sepolia'

// ============================================================================
// Hardhat Local Network (Chain ID: 31337)
// ============================================================================
const CONTRACTS_LOCAL = {
  // Mock Tokens
  WBTC: '0x0B306BF915C4d645ff596e518fAf3F9669b97016' as `0x${string}`,
  USDC: '0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82' as `0x${string}`,
  USDT: '0x9A676e781A523b5d0C0e43731313A708CB607508' as `0x${string}`,
  WETH: '0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1' as `0x${string}`,

  // Core Tokens
  BRS: '0x5FbDB2315678afecb367f032d93F642f64180aa3' as `0x${string}`,
  BTD: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0' as `0x${string}`,
  BTB: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as `0x${string}`,

  // Staking Tokens (ERC4626)
  stBTD: '0x4A679253410272dd5232B3Ff7cF5dbB88f295319' as `0x${string}`,
  stBTB: '0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f' as `0x${string}`,

  // Oracles - Chainlink Price Feeds (local uses mocks, zero address = use fallback)
  BTCPriceFeed: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9' as `0x${string}`,
  ChainlinkBTCUSD: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9' as `0x${string}`,
  ChainlinkWBTCBTC: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9' as `0x${string}`,
  ChainlinkETHUSD: '0x0000000000000000000000000000000000000000' as `0x${string}`,  // Local: fallback $3000
  ChainlinkUSDCUSD: '0x0000000000000000000000000000000000000000' as `0x${string}`, // Local: fallback $1
  ChainlinkUSDTUSD: '0x0000000000000000000000000000000000000000' as `0x${string}`, // Local: fallback $1
  MockPyth: '0x0165878A594ca255338adfa4d48449f69242Eb8F' as `0x${string}`,
  MockRedstone: '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853' as `0x${string}`,
  IdealUSDManager: '0x7a2088a1bFc9d81c55368AE168C2C02570cB814F' as `0x${string}`,
  PriceOracle: '0x67d269191c92Caf3cD7723F116c85e6E9bf55933' as `0x${string}`,
  TWAPOracle: '0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0' as `0x${string}`,

  // Uniswap V2 Pairs
  BTBBTDPair: '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318' as `0x${string}`,
  BRSBTDPair: '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6' as `0x${string}`,
  BTDUSDCPair: '0x610178dA211FEF7D417bC0e6FeD39F05609AD788' as `0x${string}`,
  WBTCUSDCPair: '0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e' as `0x${string}`,

  // Core Contracts
  ConfigCore: '0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE' as `0x${string}`,
  ConfigGov: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707' as `0x${string}`,
  Config: '0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE' as `0x${string}`,
  Treasury: '0xE6E340D132b5f46d1e472DebcD681B2aBc16e57E' as `0x${string}`,
  Minter: '0xc5a5C42992dECbae36851359345FE25997F5C42d' as `0x${string}`,
  InterestPool: '0x09635F643e140090A9A8Dcd712eD6285858ceBef' as `0x${string}`,
  FarmingPool: '0x851356ae760d987E095750cCeb3bC6014560891C' as `0x${string}`,
  StakingRouter: '0xf5059a5D33d5853360D16C683c16e67980206f36' as `0x${string}`,
}

const WINDOWS_IP = '172.29.182.131'
const NETWORK_CONFIG_LOCAL = {
  chainId: 31337,
  chainName: 'Hardhat Local',
  rpcUrl:
    typeof window !== 'undefined' && window.location.hostname !== 'localhost'
      ? `http://${WINDOWS_IP}:8545`
      : 'http://localhost:8545',
  windowsIP: WINDOWS_IP,
  blockExplorer: '',
}

// ============================================================================
// Network Detection and Export
// ============================================================================

// Check if running in production (Vite build mode)
// import.meta.env.PROD is true during `vite build`, false during `vite dev`
const isProductionBuild = import.meta.env.PROD

// Runtime check for localhost (only matters in dev mode)
const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname.includes('localhost') ||
  window.location.hostname.includes('127.0.0.1')
)

// Use Sepolia in production build, or Local in dev/localhost
const useSepoliaNetwork = isProductionBuild && !isLocalhost

// Use Sepolia by default in production
export const CONTRACTS = useSepoliaNetwork
  ? { ...CONTRACTS_SEPOLIA, BTCPriceFeed: CONTRACTS_SEPOLIA.ChainlinkBTCUSD }
  : CONTRACTS_LOCAL
export const NETWORK_CONFIG = useSepoliaNetwork ? NETWORK_CONFIG_SEPOLIA : NETWORK_CONFIG_LOCAL

// Export both for manual switching
export { CONTRACTS_LOCAL, NETWORK_CONFIG_LOCAL }
export { CONTRACTS_SEPOLIA, NETWORK_CONFIG_SEPOLIA }

export const TOKEN_DECIMALS = {
  WBTC: 8,
  USDC: 6,
  USDT: 6,
  WETH: 18,
  BTD: 18,
  BTB: 18,
  BRS: 18,
  stBTD: 18,
  stBTB: 18,
} as const

/**
 * Get contracts for a specific chain ID
 */
export function getContractsForChain(chainId: number) {
  switch (chainId) {
    case 11155111:
      return { ...CONTRACTS_SEPOLIA, BTCPriceFeed: CONTRACTS_SEPOLIA.ChainlinkBTCUSD }
    case 31337:
    default:
      return CONTRACTS_LOCAL
  }
}

/**
 * Get network config for a specific chain ID
 */
export function getNetworkConfigForChain(chainId: number) {
  switch (chainId) {
    case 11155111:
      return NETWORK_CONFIG_SEPOLIA
    case 31337:
    default:
      return NETWORK_CONFIG_LOCAL
  }
}

/**
 * Dynamically update local contract addresses from deployment-local-state.json
 * Only executes in browser environment for local development
 */
export async function hydrateContractsFromDeployment(): Promise<void> {
  if (typeof fetch === 'undefined') return
  if (isProductionBuild) return // Skip for production (Sepolia)

  try {
    const ts = Date.now()
    const response = await fetch(`/deployment-local-state.json?ts=${ts}`, { cache: 'no-cache' })
    if (!response.ok) return

    const data = await response.json()
    if (!data || typeof data !== 'object' || typeof data.contracts !== 'object') return

    const { contracts } = data as { contracts: Record<string, unknown> }
    Object.entries(contracts).forEach(([key, value]) => {
      if (typeof value !== 'string') return
      const normalizedKey = key.toUpperCase()
      Object.keys(CONTRACTS).forEach(existingKey => {
        if (existingKey.toUpperCase() === normalizedKey) {
          // @ts-ignore
          CONTRACTS[existingKey] = value as `0x${string}`
        }
      })
    })
  } catch {
    // Silently ignore errors
  }
}

export default CONTRACTS
