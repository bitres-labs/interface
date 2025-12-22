import { POOLS } from '@/hooks/useUniswapV2'

// Get all unique tokens from pools
export const ALL_TOKENS = [
  { symbol: 'BRS', address: POOLS[0].token0.address, decimals: POOLS[0].token0.decimals },
  { symbol: 'BTD', address: POOLS[0].token1.address, decimals: POOLS[0].token1.decimals },
  { symbol: 'USDC', address: POOLS[1].token1.address, decimals: POOLS[1].token1.decimals },
  { symbol: 'BTB', address: POOLS[2].token0.address, decimals: POOLS[2].token0.decimals },
  { symbol: 'WBTC', address: POOLS[3].token0.address, decimals: POOLS[3].token0.decimals },
]

// Find pool for two tokens
export function findPool(token0Symbol: string, token1Symbol: string) {
  return POOLS.find(
    pool =>
      (pool.token0.symbol === token0Symbol && pool.token1.symbol === token1Symbol) ||
      (pool.token0.symbol === token1Symbol && pool.token1.symbol === token0Symbol)
  )
}
