// BRS System Contract Addresses
// Copy this file to contracts.ts and update addresses after deployment
//
// For local development:
//   1. Run: cd ../contracts && ./scripts/main/start-local.sh
//   2. The script will auto-update contracts.ts with deployed addresses
//
// For mainnet/testnet:
//   Update addresses manually after deployment

export const CONTRACTS = {
  // Mock Tokens (local only)
  WBTC: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  USDC: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  USDT: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  WETH: '0x0000000000000000000000000000000000000000' as `0x${string}`,

  // Core Tokens
  BRS: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  BTD: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  BTB: '0x0000000000000000000000000000000000000000' as `0x${string}`,

  // Staking Tokens (ERC4626)
  stBTD: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  stBTB: '0x0000000000000000000000000000000000000000' as `0x${string}`,

  // Oracles
  BTCPriceFeed: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  ChainlinkBTCUSD: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  ChainlinkWBTCBTC: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  MockPyth: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  MockRedstone: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  IdealUSDManager: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  PriceOracle: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  TWAPOracle: '0x0000000000000000000000000000000000000000' as `0x${string}`,

  // Uniswap V2 Pairs
  BTBBTDPair: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  BRSBTDPair: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  BTDUSDCPair: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  WBTCUSDCPair: '0x0000000000000000000000000000000000000000' as `0x${string}`,

  // Core Contracts
  ConfigCore: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  ConfigGov: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  Config: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  Treasury: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  Minter: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  InterestPool: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  FarmingPool: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  StakingRouter: '0x0000000000000000000000000000000000000000' as `0x${string}`,
}

// Network Configuration
// Update for your target network
const WINDOWS_IP = '172.29.182.131' // WSL IP for Windows access
const RPC_URL =
  typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? `http://${WINDOWS_IP}:8545`
    : 'http://localhost:8545'

export const NETWORK_CONFIG = {
  chainId: 31337, // Hardhat: 31337, Sepolia: 11155111, Mainnet: 1
  chainName: 'Hardhat Local',
  rpcUrl: RPC_URL,
  windowsIP: WINDOWS_IP,
  blockExplorer: '',
}

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
 * Dynamically update local contract addresses from deployment-local-state.json
 * Only executes in browser environment, silently ignores failures
 */
export async function hydrateContractsFromDeployment(): Promise<void> {
  // SSR or test environments may not have fetch, return early
  if (typeof fetch === 'undefined') return

  try {
    const ts = Date.now()
    const response = await fetch(`/deployment-local-state.json?ts=${ts}`, { cache: 'no-cache' })
    if (!response.ok) return

    const data = await response.json()
    if (!data || typeof data !== 'object' || typeof data.contracts !== 'object') return

    const { contracts } = data as { contracts: Record<string, unknown> }
    Object.entries(contracts).forEach(([key, value]) => {
      if (typeof value !== 'string') return
      // Contract name matching is case-insensitive
      const normalizedKey = key.toUpperCase()
      Object.keys(CONTRACTS).forEach(existingKey => {
        if (existingKey.toUpperCase() === normalizedKey) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - Update constant reference at runtime
          CONTRACTS[existingKey] = value as `0x${string}`
        }
      })
    })
  } catch {
    // Silently ignore errors, keep default addresses
  }
}

export default CONTRACTS
