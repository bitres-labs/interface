/**
 * Data Auto-Refresh Configuration - Smart Refresh Strategy
 *
 * Core Principles:
 * 1. Static data (balances, positions) - Only changes after transactions, use long intervals or disable auto-refresh
 * 2. Dynamic data (mining rewards) - Grows linearly per second, use local calculation + periodic calibration
 * 3. Price data - Relatively stable, use medium intervals
 *
 * Performance Optimization:
 * - Reduce 90% of unnecessary server requests
 * - Maintain smooth user experience
 * - Only refresh data when needed
 */

// Block time configuration
// Local development: Hardhat = 2 seconds/block
// Ethereum mainnet: ~12 seconds/block
// To maintain consistency with mainnet, refresh intervals are designed based on 12-second block time
export const BLOCK_TIME = 2000  // Hardhat local testing: 2 seconds/block
export const MAINNET_BLOCK_TIME = 12000  // Ethereum mainnet: 12 seconds/block

// Auto-refresh interval configuration (milliseconds)
export const REFETCH_INTERVAL = {
  // Real-time refresh: every 1 second (only for data requiring extreme real-time updates, like countdowns)
  REALTIME: 1000,

  // Fast refresh: every 6 seconds - for near real-time data like prices
  // (local: 3 blocks, mainnet: 0.5 blocks)
  FAST: BLOCK_TIME * 3,

  // Normal refresh: every 12 seconds - for general data like pool info, mining progress
  // (local: 6 blocks, mainnet: 1 block) - consistent with mainnet block time
  NORMAL: BLOCK_TIME * 6,

  // Slow refresh: every 30 seconds (15 blocks) - for infrequently changing data
  SLOW: BLOCK_TIME * 15,

  // Very slow refresh: every 60 seconds (30 blocks) - for rarely changing data
  VERY_SLOW: BLOCK_TIME * 30,

  // Manual refresh: disable auto-refresh, only refresh after user actions
  MANUAL: false,
} as const

/**
 * Default Query Configuration
 * Used for wagmi's useReadContract and other hooks
 */
export const DEFAULT_QUERY_CONFIG = {
  // Real-time refresh config - for data requiring second-level updates like countdowns
  realtime: {
    refetchInterval: REFETCH_INTERVAL.REALTIME,
    staleTime: 0,
  },

  // Fast refresh config - for near real-time data like prices
  fast: {
    refetchInterval: REFETCH_INTERVAL.FAST,
    staleTime: REFETCH_INTERVAL.FAST / 2,
  },

  // Normal refresh config - for general data like pool info
  normal: {
    refetchInterval: REFETCH_INTERVAL.NORMAL,
    staleTime: REFETCH_INTERVAL.NORMAL / 2,
  },

  // Slow refresh config - for infrequently changing config data
  slow: {
    refetchInterval: REFETCH_INTERVAL.SLOW,
    staleTime: REFETCH_INTERVAL.SLOW / 2,
  },

  // Very slow refresh config - for rarely changing data
  verySlow: {
    refetchInterval: REFETCH_INTERVAL.VERY_SLOW,
    staleTime: REFETCH_INTERVAL.VERY_SLOW / 2,
  },

  // Static data - disable timed refresh, only refresh on page switch
  // Used for: IUSD price, BTD/BTB rates, etc. that update only once every 1-2 months
  static: {
    refetchInterval: false,           // Disable timed refresh
    refetchOnWindowFocus: false,      // Disable window focus refresh
    refetchOnMount: true,             // Keep page switch refresh
    staleTime: Infinity,              // Never expires
  },
} as const

/**
 * Refresh Configuration by Data Type - Smart Refresh Strategy
 *
 * Core Principles:
 * 1. **All data auto-refreshes** - Users don't need to manually refresh the browser
 * 2. **Distinguish static and dynamic data** - Use different refresh frequencies
 * 3. **Event-driven optimization** - Immediately refresh relevant data after transactions
 *
 * Optimization Strategy:
 * 1. Balance/positions -> Slow auto-refresh (30s) + immediate refresh after transactions
 * 2. Mining rewards -> Local calculation (display updates every second) + periodic calibration (30s)
 * 3. Price data -> Fast refresh (6s)
 * 4. Pool info -> Normal refresh (12s)
 */
export const REFETCH_CONFIG_BY_TYPE = {
  // Balance data - slow auto-refresh (30s, since it only changes after transactions)
  // Combined with immediate refresh after transactions to ensure timely updates
  balance: DEFAULT_QUERY_CONFIG.slow,

  // Price data - fast refresh (6s, prices fluctuate relatively frequently)
  price: DEFAULT_QUERY_CONFIG.fast,

  // Pool data - normal refresh (12s, TVL/APY change slowly)
  pool: DEFAULT_QUERY_CONFIG.normal,

  // Staking data - slow auto-refresh (30s, only changes on stake/withdraw)
  // Combined with immediate refresh after transactions
  staking: DEFAULT_QUERY_CONFIG.slow,

  // Rewards data - slow refresh (30s, only for calibration)
  // Actual display uses useLocalRewardCalculation for local calculation
  // Frontend updates display every second, calibrates from server every 30s
  rewards: DEFAULT_QUERY_CONFIG.slow,

  // System stats - normal refresh (12s)
  stats: DEFAULT_QUERY_CONFIG.normal,

  // Config data - slow refresh (30s, rarely changes)
  config: DEFAULT_QUERY_CONFIG.slow,

  // Constant data - very slow refresh (60s, almost never changes)
  constant: DEFAULT_QUERY_CONFIG.verySlow,

  // Static data - only refresh on page switch (for IUSD price, BTD/BTB rates, etc.)
  // This data only updates once every 1-2 months, no need for timed refresh
  staticData: DEFAULT_QUERY_CONFIG.static,
} as const

export default DEFAULT_QUERY_CONFIG
