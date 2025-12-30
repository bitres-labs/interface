import { useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { CONTRACTS, TOKEN_DECIMALS } from '@/config/contracts'
import {
  Config_ABI as ConfigABI,
  Treasury_ABI as TreasuryABI,
  FarmingPool_ABI as FarmingPoolABI,
  InterestPool_ABI as InterestPoolABI,
  Minter_ABI as MinterABI,
  PriceOracle_ABI as PriceOracleABI,
  BTD_ABI as BTDABI,
} from '@/abis'
import { REFETCH_CONFIG_BY_TYPE } from '@/config/refetch'
import { useFarmingPositions } from './useFarmingPositions'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as `0x${string}`

// ============================================================================
// PRICE HOOKS
// ============================================================================

// Price data uses fast refetch (4 seconds)
const PRICE_QUERY_OPTIONS = {
  ...REFETCH_CONFIG_BY_TYPE.price,
  retry: 0,
  refetchOnWindowFocus: false,
}

// Read BTC price from PriceOracle
export function useBTCPrice() {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.PriceOracle,
    abi: PriceOracleABI,
    functionName: 'getWBTCPrice',
    query: PRICE_QUERY_OPTIONS,
  })

  return {
    btcPrice: data ? Number(formatUnits(data as bigint, 18)) : 0,
    isLoading,
    error,
  }
}

// Read WBTC price from PriceOracle
export function useWBTCPrice() {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.PriceOracle,
    abi: PriceOracleABI,
    functionName: 'getWBTCPrice',
    query: PRICE_QUERY_OPTIONS,
  })

  return {
    wbtcPrice: data ? Number(formatUnits(data as bigint, 18)) : 0,
    isLoading,
    error,
  }
}

// Read BTD price from PriceOracle
export function useBTDPrice() {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.PriceOracle,
    abi: PriceOracleABI,
    functionName: 'getBTDPrice',
    query: PRICE_QUERY_OPTIONS,
  })

  return {
    btdPrice: data ? Number(formatUnits(data as bigint, 18)) : 0,
    isLoading,
    error,
  }
}

// Read BTB price from PriceOracle
export function useBTBPrice() {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.PriceOracle,
    abi: PriceOracleABI,
    functionName: 'getBTBPrice',
    query: PRICE_QUERY_OPTIONS,
  })

  return {
    btbPrice: data ? Number(formatUnits(data as bigint, 18)) : 0,
    isLoading,
    error,
  }
}

// Read BRS price from PriceOracle
export function useBRSPrice() {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.PriceOracle,
    abi: PriceOracleABI,
    functionName: 'getBRSPrice',
    query: PRICE_QUERY_OPTIONS,
  })

  return {
    brsPrice: data ? Number(formatUnits(data as bigint, 18)) : 0,
    isLoading,
    error,
  }
}

// Chainlink AggregatorV3 ABI (minimal for latestRoundData)
const CHAINLINK_AGGREGATOR_ABI = [
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { name: 'roundId', type: 'uint80' },
      { name: 'answer', type: 'int256' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
      { name: 'answeredInRound', type: 'uint80' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

// Read ETH price from Chainlink ETH/USD feed
export function useETHPrice() {
  const chainlinkAddress = (CONTRACTS as Record<string, `0x${string}`>).ChainlinkETHUSD

  const { data, isLoading, error } = useReadContract({
    address: chainlinkAddress,
    abi: CHAINLINK_AGGREGATOR_ABI,
    functionName: 'latestRoundData',
    query: {
      ...PRICE_QUERY_OPTIONS,
      enabled: !!chainlinkAddress,
    },
  })

  // Chainlink ETH/USD has 8 decimals
  const ethPrice = data ? Number(data[1]) / 1e8 : 0

  return {
    ethPrice,
    isLoading,
    error,
  }
}

// Read IUSD price from PriceOracle
export function useIUSDPrice() {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.PriceOracle,
    abi: PriceOracleABI,
    functionName: 'getIUSDPrice',
    query: PRICE_QUERY_OPTIONS,
  })

  return {
    iusdPrice: data ? Number(formatUnits(data as bigint, 18)) : 0,
    isLoading,
    error,
  }
}

// Read WETH price directly from Chainlink ETH/USD feed
export function useWETHPrice() {
  const chainlinkAddress = CONTRACTS.ChainlinkETHUSD
  const isValidAddress = chainlinkAddress && chainlinkAddress !== ZERO_ADDRESS

  const { data, isLoading, error } = useReadContract({
    address: chainlinkAddress,
    abi: CHAINLINK_AGGREGATOR_ABI,
    functionName: 'latestRoundData',
    query: {
      ...PRICE_QUERY_OPTIONS,
      enabled: isValidAddress,
    },
  })

  // Chainlink returns 8 decimals, convert to number
  // For local network (zero address), fallback to $3000
  let wethPrice = 3000 // Default fallback for local
  if (isValidAddress && data) {
    const [, answer] = data as [bigint, bigint, bigint, bigint, bigint]
    wethPrice = Number(answer) / 1e8
  }

  return {
    wethPrice,
    isLoading: isValidAddress ? isLoading : false,
    error: isValidAddress ? error : null,
  }
}

// Read USDC price directly from Chainlink USDC/USD feed
// Note: Not available on Sepolia, fallback to $1
export function useUSDCPrice() {
  const chainlinkAddress = CONTRACTS.ChainlinkUSDCUSD
  const isValidAddress = chainlinkAddress && chainlinkAddress !== ZERO_ADDRESS

  const { data, isLoading, error } = useReadContract({
    address: chainlinkAddress,
    abi: CHAINLINK_AGGREGATOR_ABI,
    functionName: 'latestRoundData',
    query: {
      ...PRICE_QUERY_OPTIONS,
      enabled: isValidAddress,
    },
  })

  // Chainlink returns 8 decimals, convert to number
  // For Sepolia/local (zero address), fallback to $1
  let usdcPrice = 1 // Default fallback
  if (isValidAddress && data) {
    const [, answer] = data as [bigint, bigint, bigint, bigint, bigint]
    usdcPrice = Number(answer) / 1e8
  }

  return {
    usdcPrice,
    isLoading: isValidAddress ? isLoading : false,
    error: isValidAddress ? error : null,
  }
}

// Read USDT price directly from Chainlink USDT/USD feed
// Note: Not available on Sepolia, fallback to $1
export function useUSDTPrice() {
  const chainlinkAddress = CONTRACTS.ChainlinkUSDTUSD
  const isValidAddress = chainlinkAddress && chainlinkAddress !== ZERO_ADDRESS

  const { data, isLoading, error } = useReadContract({
    address: chainlinkAddress,
    abi: CHAINLINK_AGGREGATOR_ABI,
    functionName: 'latestRoundData',
    query: {
      ...PRICE_QUERY_OPTIONS,
      enabled: isValidAddress,
    },
  })

  // Chainlink returns 8 decimals, convert to number
  // For Sepolia/local (zero address), fallback to $1
  let usdtPrice = 1 // Default fallback
  if (isValidAddress && data) {
    const [, answer] = data as [bigint, bigint, bigint, bigint, bigint]
    usdtPrice = Number(answer) / 1e8
  }

  return {
    usdtPrice,
    isLoading: isValidAddress ? isLoading : false,
    error: isValidAddress ? error : null,
  }
}

// Read BTC price directly from Chainlink BTC/USD feed (for display purposes)
export function useChainlinkBTCPrice() {
  const chainlinkAddress = CONTRACTS.ChainlinkBTCUSD
  const isValidAddress = chainlinkAddress && chainlinkAddress !== ZERO_ADDRESS

  const { data, isLoading, error } = useReadContract({
    address: chainlinkAddress,
    abi: CHAINLINK_AGGREGATOR_ABI,
    functionName: 'latestRoundData',
    query: {
      ...PRICE_QUERY_OPTIONS,
      enabled: isValidAddress,
    },
  })

  // Chainlink returns 8 decimals, convert to number
  // For local network (zero address), fallback to $100000
  let btcPrice = 100000 // Default fallback for local
  if (isValidAddress && data) {
    const [, answer] = data as [bigint, bigint, bigint, bigint, bigint]
    btcPrice = Number(answer) / 1e8
  }

  return {
    btcPrice,
    isLoading: isValidAddress ? isLoading : false,
    error: isValidAddress ? error : null,
  }
}

// ============================================================================
// CONFIG HOOKS
// ============================================================================

// Read BTB minimum price from ConfigGov
export function useBTBMinPrice() {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.ConfigGov,
    abi: ConfigABI,
    functionName: 'minBTBPrice',
    query: REFETCH_CONFIG_BY_TYPE.staticData, // Static data, rarely changes
  })

  return {
    btbMinPrice: data ? Number(formatUnits(data as bigint, 18)) : 0,
    isLoading,
    error,
  }
}

// Read BTD APR from Config (note: Config doesn't have btdAPR, this should come from InterestPool)
export function useBTDAPR() {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.InterestPool,
    abi: InterestPoolABI,
    functionName: 'btdPool',
    query: REFETCH_CONFIG_BY_TYPE.staticData, // Static data, updates every 1-2 months
  })

  const pool = data as readonly [string, bigint, bigint, bigint, bigint] | undefined

  return {
    btdAPR: pool ? Number(pool[4]) / 100 : 0,
    isLoading,
    error,
  }
}

// Read BTB dynamic APR from InterestPool
export function useBTBAPR() {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.InterestPool,
    abi: InterestPoolABI,
    functionName: 'btbPool',
    query: REFETCH_CONFIG_BY_TYPE.staticData, // Static data, updates every 1-2 months
  })

  const pool = data as readonly [string, bigint, bigint, bigint, bigint] | undefined

  return {
    btbAPR: pool ? Number(pool[4]) / 100 : 0,
    isLoading,
    error,
  }
}

// ============================================================================
// SUPPLY HOOKS
// ============================================================================

// Read total supply for any token
export function useTotalSupply(tokenAddress: `0x${string}`, decimals: number) {
  const { data, isLoading, error } = useReadContract({
    address: tokenAddress,
    abi: BTDABI, // All ERC20 have totalSupply
    functionName: 'totalSupply',
    query: REFETCH_CONFIG_BY_TYPE.stats, // 12 second refresh, for displaying mining progress
  })

  return {
    totalSupply: data ? formatUnits(data as bigint, decimals) : '0',
    totalSupplyRaw: data as bigint | undefined,
    totalSupplyNum: data ? Number(formatUnits(data as bigint, decimals)) : 0,
    isLoading,
    error,
  }
}

// Generic token balance lookup for any address
export function useTokenBalance(
  tokenAddress: `0x${string}`,
  ownerAddress: `0x${string}` | undefined,
  decimals: number
) {
  const targetOwner = ownerAddress ?? ZERO_ADDRESS

  const { data, isLoading, error } = useReadContract({
    address: tokenAddress,
    abi: BTDABI,
    functionName: 'balanceOf',
    args: [targetOwner],
    query: {
      enabled: Boolean(ownerAddress),
      ...REFETCH_CONFIG_BY_TYPE.balance, // 30 second refresh, for Foundation/Team balances
    },
  })

  return {
    balance: ownerAddress && data ? Number(formatUnits(data as bigint, decimals)) : 0,
    balanceRaw: data as bigint | undefined,
    isLoading,
    error,
  }
}

// Read fund address from FarmingPool by index (0: treasury, 1: foundation, 2: team)
export function useFarmingFundAddress(index: number) {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.FarmingPool,
    abi: FarmingPoolABI,
    functionName: 'fundAddrs',
    args: [BigInt(index)],
    query: REFETCH_CONFIG_BY_TYPE.constant, // 60 second refresh, almost never changes
  })

  return {
    address: data as `0x${string}` | undefined,
    isLoading,
    error,
  }
}

// ============================================================================
// TREASURY HOOKS
// ============================================================================

// Read Treasury balances (WBTC, BRS, BTD)
export function useTreasuryBalances() {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.Treasury,
    abi: TreasuryABI,
    functionName: 'getBalances',
    query: REFETCH_CONFIG_BY_TYPE.balance, // 30 second refresh, Treasury balance changes slowly
  })

  const balances = data as [bigint, bigint, bigint] | undefined

  return {
    wbtcBalance: balances ? Number(formatUnits(balances[0], TOKEN_DECIMALS.WBTC)) : 0,
    brsBalance: balances ? Number(formatUnits(balances[1], TOKEN_DECIMALS.BRS)) : 0,
    btdBalance: balances ? Number(formatUnits(balances[2], TOKEN_DECIMALS.BTD)) : 0,
    isLoading,
    error,
  }
}

// Read Treasury balance for a specific token
export function useTreasuryBalance(tokenAddress: `0x${string}`, decimals: number) {
  const { data, isLoading, error } = useReadContract({
    address: tokenAddress,
    abi: BTDABI, // ERC20 balanceOf
    functionName: 'balanceOf',
    args: [CONTRACTS.Treasury],
    query: REFETCH_CONFIG_BY_TYPE.balance, // 30 second refresh
  })

  return {
    balance: data ? formatUnits(data as bigint, decimals) : '0',
    balanceRaw: data as bigint | undefined,
    balanceNum: data ? Number(formatUnits(data as bigint, decimals)) : 0,
    isLoading,
    error,
  }
}

// ============================================================================
// MINTER HOOKS
// ============================================================================

// Read collateral ratio from Minter
export function useCollateralRatio() {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.Minter,
    abi: MinterABI,
    functionName: 'getCollateralRatio',
    query: REFETCH_CONFIG_BY_TYPE.stats, // 12 second refresh, important system metrics
  })

  return {
    collateralRatio: data ? Number(formatUnits(data as bigint, 18)) * 100 : 0,
    isLoading,
    error,
  }
}

// ============================================================================
// BRS MINING HOOKS
// ============================================================================

// Read BRS distributed amount (total supply minus FarmingPool balance)
// This includes both claimed rewards and initial LP allocation
export function useBRSMined() {
  const { data: totalSupply, isLoading: supplyLoading } = useReadContract({
    address: CONTRACTS.BRS,
    abi: BTDABI,
    functionName: 'totalSupply',
    query: REFETCH_CONFIG_BY_TYPE.stats,
  })

  const { data: farmingBalance, isLoading: balanceLoading } = useReadContract({
    address: CONTRACTS.BRS,
    abi: BTDABI,
    functionName: 'balanceOf',
    args: [CONTRACTS.FarmingPool],
    query: REFETCH_CONFIG_BY_TYPE.stats,
  })

  // Only calculate when both values are loaded (check for undefined, not falsy)
  const distributed =
    totalSupply !== undefined && farmingBalance !== undefined
      ? (totalSupply as bigint) - (farmingBalance as bigint)
      : 0n

  return {
    minedAmount: Number(formatUnits(distributed, TOKEN_DECIMALS.BRS)),
    isLoading: supplyLoading || balanceLoading,
    error: null,
  }
}

// Read BRS maximum supply from FarmingPool
export function useBRSMaxSupply() {
  // BRS_MAX_SUPPLY is a constant in the contract: 2,100,000,000 BRS (2.1 billion)
  // From contracts/libraries/BRSConstants.sol:BRS_MAX_SUPPLY
  // Since it's an internal constant in a library, frontend cannot read directly, so hardcoded
  const BRS_MAX_SUPPLY = 2_100_000_000

  return {
    maxSupply: BRS_MAX_SUPPLY,
    isLoading: false,
    error: null,
  }
}

// Read farming pool information
export function useFarmingPoolLength() {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.FarmingPool,
    abi: FarmingPoolABI,
    functionName: 'poolLength',
    query: REFETCH_CONFIG_BY_TYPE.constant, // 60 second refresh, almost never changes
  })

  return {
    poolLength: data ? Number(data) : 0,
    isLoading,
    error,
  }
}

// Read total allocation points (for calculating BRS distribution)
export function useTotalAllocPoint() {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.FarmingPool,
    abi: FarmingPoolABI,
    functionName: 'totalAllocPoint',
    query: REFETCH_CONFIG_BY_TYPE.config, // 30 second refresh, configuration data
  })

  return {
    totalAllocPoint: data ? Number(data) : 0,
    isLoading,
    error,
  }
}

// Read pool info for a specific pool
export function usePoolInfo(poolId: number) {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.FarmingPool,
    abi: FarmingPoolABI,
    functionName: 'poolInfo',
    args: [BigInt(poolId)],
  })

  const poolInfo = data as any

  return {
    poolInfo,
    isLoading,
    error,
  }
}

// ============================================================================
// COMBINED STATISTICS HOOKS
// ============================================================================

// Calculate total TVL (Treasury + Farming Pools)
export function useTotalTVL() {
  const { wbtcBalance, brsBalance, btdBalance, isLoading: treasuryLoading } = useTreasuryBalances()
  const { wbtcPrice, isLoading: wbtcPriceLoading } = useWBTCPrice()
  const { brsPrice, isLoading: brsPriceLoading } = useBRSPrice()
  const { btdPrice, isLoading: btdPriceLoading } = useBTDPrice()

  const treasuryTVL = wbtcBalance * wbtcPrice + brsBalance * brsPrice + btdBalance * btdPrice

  // Get farming pool TVL from useFarmingPositions
  const { pools } = useFarmingPositions()
  const farmingPoolTVL = pools.reduce((sum, pool) => sum + pool.tvl, 0)

  return {
    totalTVL: treasuryTVL + farmingPoolTVL,
    treasuryTVL,
    farmingPoolTVL,
    isLoading: treasuryLoading || wbtcPriceLoading || brsPriceLoading || btdPriceLoading,
  }
}

// Get comprehensive system metrics
export function useSystemMetrics() {
  const { collateralRatio, isLoading: crLoading } = useCollateralRatio()
  const { iusdPrice, isLoading: iusdLoading } = useIUSDPrice()
  const { btdAPR, isLoading: btdAprLoading } = useBTDAPR()
  const { btbAPR, isLoading: btbAprLoading } = useBTBAPR()
  const { btbMinPrice, isLoading: minPriceLoading } = useBTBMinPrice()
  const { totalTVL, treasuryTVL, farmingPoolTVL, isLoading: tvlLoading } = useTotalTVL()

  return {
    tvl: totalTVL,
    treasuryTVL,
    farmingPoolTVL,
    collateralRatio,
    collateralRatioLoading: crLoading,
    iusdPrice,
    btdAPR,
    btbAPR,
    btbMinPrice,
    userCount: 0, // TODO: Implement user count tracking if available on-chain
    isLoading:
      crLoading || iusdLoading || btdAprLoading || btbAprLoading || minPriceLoading || tvlLoading,
  }
}
