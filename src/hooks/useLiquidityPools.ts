import { useMemo } from 'react'
import { useAccount } from 'wagmi'
import { formatUnits } from 'viem'
import { POOLS, useLPBalance, usePairReserves, useLPTotalSupply } from './useUniswapV2'
import { useTokenPrices } from './useAPY'

/**
 * Unified hook for all liquidity pool data
 * Used across PoolPage, AssetPage, and HomePage
 */
export function useLiquidityPools() {
  const { isConnected } = useAccount()
  const prices = useTokenPrices()

  // Get LP balances for all 4 pools
  const lpBalance0 = useLPBalance(POOLS[0].address as `0x${string}`)
  const lpBalance1 = useLPBalance(POOLS[1].address as `0x${string}`)
  const lpBalance2 = useLPBalance(POOLS[2].address as `0x${string}`)
  const lpBalance3 = useLPBalance(POOLS[3].address as `0x${string}`)

  // Get reserves for all 4 pools
  const reserves0 = usePairReserves(POOLS[0].address as `0x${string}`)
  const reserves1 = usePairReserves(POOLS[1].address as `0x${string}`)
  const reserves2 = usePairReserves(POOLS[2].address as `0x${string}`)
  const reserves3 = usePairReserves(POOLS[3].address as `0x${string}`)

  // Get total supply for all 4 pools
  const totalSupply0 = useLPTotalSupply(POOLS[0].address as `0x${string}`)
  const totalSupply1 = useLPTotalSupply(POOLS[1].address as `0x${string}`)
  const totalSupply2 = useLPTotalSupply(POOLS[2].address as `0x${string}`)
  const totalSupply3 = useLPTotalSupply(POOLS[3].address as `0x${string}`)

  // Helper function to get token price
  const getTokenPrice = (symbol: string) => {
    switch (symbol) {
      case 'WBTC':
        return prices.WBTC
      case 'BRS':
        return prices.BRS
      case 'BTD':
        return prices.BTD
      case 'BTB':
        return prices.BTB
      case 'USDC':
        return 1.0
      case 'USDT':
        return 1.0
      default:
        return 0
    }
  }

  // Build comprehensive pool data
  const pools = useMemo(() => {
    if (!isConnected) {
      return []
    }

    const buildPoolData = (index: number, lpBalance: any, reserves: any, totalSupply: any) => {
      const pool = POOLS[index]
      const lpBalanceFormatted = lpBalance.formatted || '0'
      const lpBalanceRaw = lpBalance.balance || 0n

      // Format reserves
      const reserve0 = reserves.reserve0 || 0n
      const reserve1 = reserves.reserve1 || 0n
      const reserve0Formatted = Number(formatUnits(reserve0, pool.token0.decimals))
      const reserve1Formatted = Number(formatUnits(reserve1, pool.token1.decimals))

      // Calculate pool value
      const token0Price = getTokenPrice(pool.token0.symbol)
      const token1Price = getTokenPrice(pool.token1.symbol)
      const token0Value = reserve0Formatted * token0Price
      const token1Value = reserve1Formatted * token1Price
      const totalPoolValue = token0Value + token1Value

      // Calculate user position
      const totalSupplyFormatted = totalSupply.formatted || '0'
      const userLPBalance = Number(lpBalanceFormatted)
      const totalLPSupply = Number(totalSupplyFormatted)
      const userShare = totalLPSupply > 0 ? (userLPBalance / totalLPSupply) * 100 : 0
      const userValue = totalLPSupply > 0 ? (totalPoolValue * userLPBalance) / totalLPSupply : 0

      // Calculate user's underlying tokens
      const userToken0 = totalLPSupply > 0 ? (reserve0Formatted * userLPBalance) / totalLPSupply : 0
      const userToken1 = totalLPSupply > 0 ? (reserve1Formatted * userLPBalance) / totalLPSupply : 0

      return {
        id: index,
        pool,
        lpBalance: userLPBalance,
        lpBalanceFormatted,
        lpBalanceRaw,
        reserves: {
          reserve0,
          reserve1,
          reserve0Formatted,
          reserve1Formatted,
        },
        totalSupply: {
          formatted: totalSupplyFormatted,
          raw: totalSupply.totalSupply || 0n,
        },
        value: {
          token0Value,
          token1Value,
          totalPoolValue,
          userValue,
        },
        userShare,
        userPosition: {
          token0Amount: userToken0,
          token1Amount: userToken1,
          value: userValue,
        },
      }
    }

    return [
      buildPoolData(0, lpBalance0, reserves0, totalSupply0),
      buildPoolData(1, lpBalance1, reserves1, totalSupply1),
      buildPoolData(2, lpBalance2, reserves2, totalSupply2),
      buildPoolData(3, lpBalance3, reserves3, totalSupply3),
    ]
  }, [
    isConnected,
    lpBalance0,
    lpBalance1,
    lpBalance2,
    lpBalance3,
    reserves0,
    reserves1,
    reserves2,
    reserves3,
    totalSupply0,
    totalSupply1,
    totalSupply2,
    totalSupply3,
    prices,
  ])

  // Calculate total liquidity value
  const totalLiquidityValue = useMemo(() => {
    return pools.reduce((sum, pool) => sum + pool.userPosition.value, 0)
  }, [pools])

  // Filter pools with non-zero balance
  const poolsWithBalance = useMemo(() => {
    return pools.filter(pool => pool.lpBalance > 0)
  }, [pools])

  return {
    pools,
    poolsWithBalance,
    totalLiquidityValue,
    isConnected,
  }
}
