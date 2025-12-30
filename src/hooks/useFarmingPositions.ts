import { useMemo, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { useUserInfo, usePendingReward, usePoolInfo, useTotalAllocPoint } from './useFarming'
import { useTokenPrices, usePoolAPY } from './useAPY'
import { useLocalRewardCalculation } from './useLocalRewardCalculation'
import { useAllLPTokenPrices } from './useLPTokenPrice'
import { toNumber } from '@/utils/numbers'

// Pool metadata configuration
const POOL_META = [
  { id: 0, name: 'BRS/BTD', type: 'LP' as const },
  { id: 1, name: 'BTD/USDC', type: 'LP' as const },
  { id: 2, name: 'BTB/BTD', type: 'LP' as const },
  { id: 3, name: 'USDC', type: 'Single' as const },
  { id: 4, name: 'USDT', type: 'Single' as const },
  { id: 5, name: 'WBTC', type: 'Single' as const },
  { id: 6, name: 'WETH', type: 'Single' as const },
  { id: 7, name: 'stBTD', type: 'Single' as const },
  { id: 8, name: 'stBTB', type: 'Single' as const },
  { id: 9, name: 'BRS', type: 'Single' as const },
]

/**
 * Unified hook for all farming pool data
 * Used across FarmPage, AssetPage, and HomePage
 */
export function useFarmingPositions() {
  const { isConnected } = useAccount()
  const prices = useTokenPrices()
  const { totalAllocPoint } = useTotalAllocPoint()
  const realLPPrices = useAllLPTokenPrices()

  // Get user info for all 10 pools
  const userInfo0 = useUserInfo(0)
  const userInfo1 = useUserInfo(1)
  const userInfo2 = useUserInfo(2)
  const userInfo3 = useUserInfo(3)
  const userInfo4 = useUserInfo(4)
  const userInfo5 = useUserInfo(5)
  const userInfo6 = useUserInfo(6)
  const userInfo7 = useUserInfo(7)
  const userInfo8 = useUserInfo(8)
  const userInfo9 = useUserInfo(9)

  // Get pool info for all 10 pools
  const poolInfo0 = usePoolInfo(0)
  const poolInfo1 = usePoolInfo(1)
  const poolInfo2 = usePoolInfo(2)
  const poolInfo3 = usePoolInfo(3)
  const poolInfo4 = usePoolInfo(4)
  const poolInfo5 = usePoolInfo(5)
  const poolInfo6 = usePoolInfo(6)
  const poolInfo7 = usePoolInfo(7)
  const poolInfo8 = usePoolInfo(8)
  const poolInfo9 = usePoolInfo(9)

  // Get pending rewards for all 10 pools - using local calculation for smooth display
  // Each hook updates display every 100ms and syncs with server every 30s
  const reward0 = useLocalRewardCalculation(0, 30000)
  const reward1 = useLocalRewardCalculation(1, 30000)
  const reward2 = useLocalRewardCalculation(2, 30000)
  const reward3 = useLocalRewardCalculation(3, 30000)
  const reward4 = useLocalRewardCalculation(4, 30000)
  const reward5 = useLocalRewardCalculation(5, 30000)
  const reward6 = useLocalRewardCalculation(6, 30000)
  const reward7 = useLocalRewardCalculation(7, 30000)
  const reward8 = useLocalRewardCalculation(8, 30000)
  const reward9 = useLocalRewardCalculation(9, 30000)

  // LP token prices - using real on-chain data for LP tokens
  // All prices from Chainlink (BTC, ETH) or LP spot prices (BTD, BTB, BRS)
  const lpPrices: Record<number, number> = useMemo(
    () => ({
      0: realLPPrices[0] || 0, // BRS/BTD LP (from chain)
      1: realLPPrices[1] || 0, // BTD/USDC LP (from chain)
      2: realLPPrices[2] || 0, // BTB/BTD LP (from chain)
      3: prices.USDC, // USDC (from Chainlink, fallback $1 on Sepolia)
      4: prices.USDT, // USDT (from Chainlink, fallback $1 on Sepolia)
      5: prices.WBTC, // WBTC (from Chainlink BTC/USD)
      6: prices.WETH, // WETH (from Chainlink ETH/USD)
      7: prices.BTD, // stBTD (uses BTD price from LP)
      8: prices.BTB, // stBTB (uses BTB price from LP)
      9: prices.BRS, // BRS (from LP spot price)
    }),
    [realLPPrices, prices]
  )

  // APYs for all pools
  const apy0 = usePoolAPY(0, poolInfo0.allocPoint, poolInfo0.totalStaked, lpPrices[0])
  const apy1 = usePoolAPY(1, poolInfo1.allocPoint, poolInfo1.totalStaked, lpPrices[1])
  const apy2 = usePoolAPY(2, poolInfo2.allocPoint, poolInfo2.totalStaked, lpPrices[2])
  const apy3 = usePoolAPY(3, poolInfo3.allocPoint, poolInfo3.totalStaked, lpPrices[3])
  const apy4 = usePoolAPY(4, poolInfo4.allocPoint, poolInfo4.totalStaked, lpPrices[4])
  const apy5 = usePoolAPY(5, poolInfo5.allocPoint, poolInfo5.totalStaked, lpPrices[5])
  const apy6 = usePoolAPY(6, poolInfo6.allocPoint, poolInfo6.totalStaked, lpPrices[6])
  const apy7 = usePoolAPY(7, poolInfo7.allocPoint, poolInfo7.totalStaked, lpPrices[7])
  const apy8 = usePoolAPY(8, poolInfo8.allocPoint, poolInfo8.totalStaked, lpPrices[8])
  const apy9 = usePoolAPY(9, poolInfo9.allocPoint, poolInfo9.totalStaked, lpPrices[9])

  // Build comprehensive farming data
  const pools = useMemo(() => {
    const userInfos = [
      userInfo0,
      userInfo1,
      userInfo2,
      userInfo3,
      userInfo4,
      userInfo5,
      userInfo6,
      userInfo7,
      userInfo8,
      userInfo9,
    ]
    const poolInfos = [
      poolInfo0,
      poolInfo1,
      poolInfo2,
      poolInfo3,
      poolInfo4,
      poolInfo5,
      poolInfo6,
      poolInfo7,
      poolInfo8,
      poolInfo9,
    ]
    const rewards = [
      reward0,
      reward1,
      reward2,
      reward3,
      reward4,
      reward5,
      reward6,
      reward7,
      reward8,
      reward9,
    ]
    const apys = [apy0, apy1, apy2, apy3, apy4, apy5, apy6, apy7, apy8, apy9]

    return POOL_META.map((meta, index) => {
      const userInfo = userInfos[index]
      const poolInfo = poolInfos[index]
      const rewardCalc = rewards[index]
      const apy = apys[index]

      // If wallet not connected, show pool info but zero out user-specific data
      const stakedAmount = isConnected ? toNumber(userInfo.stakedAmount) : 0
      const pendingReward = isConnected ? rewardCalc.reward : 0
      const totalStaked = toNumber(poolInfo.totalStaked)
      const allocPoint = Number(poolInfo.allocPoint || 0)

      // Calculate values
      const lpPrice = lpPrices[index]
      const stakedValue = stakedAmount * lpPrice
      const pendingValue = pendingReward * prices.BRS

      // Calculate allocation percentage
      const allocation =
        totalAllocPoint > 0 ? ((allocPoint / totalAllocPoint) * 100).toFixed(1) : '0'

      // Calculate TVL (spot prices from LP pools)
      const tvl = totalStaked * lpPrice

      if (index === 0) {
        console.log('[Farm Pool 0] TVL calc:', { totalStaked, lpPrice, tvl })
      }

      return {
        ...meta,
        userInfo: {
          stakedAmount,
          stakedValue,
        },
        poolInfo: {
          totalStaked,
          allocPoint,
          allocation: `${allocation}%`,
          decimals: poolInfo.decimals ?? 18,
        },
        pending: {
          amount: pendingReward,
          value: pendingValue,
        },
        apy,
        tvl,
        lpPrice,
      }
    })
  }, [
    isConnected,
    userInfo0,
    userInfo1,
    userInfo2,
    userInfo3,
    userInfo4,
    userInfo5,
    userInfo6,
    userInfo7,
    userInfo8,
    userInfo9,
    poolInfo0,
    poolInfo1,
    poolInfo2,
    poolInfo3,
    poolInfo4,
    poolInfo5,
    poolInfo6,
    poolInfo7,
    poolInfo8,
    poolInfo9,
    reward0.reward,
    reward1.reward,
    reward2.reward,
    reward3.reward,
    reward4.reward,
    reward5.reward,
    reward6.reward,
    reward7.reward,
    reward8.reward,
    reward9.reward,
    apy0,
    apy1,
    apy2,
    apy3,
    apy4,
    apy5,
    apy6,
    apy7,
    apy8,
    apy9,
    lpPrices,
    prices.BRS,
    totalAllocPoint,
  ])

  // Calculate total farming value (staked + pending rewards)
  const totalFarmingValue = useMemo(() => {
    return pools.reduce((sum, pool) => sum + pool.userInfo.stakedValue, 0)
  }, [pools])

  // Calculate total pending rewards
  const totalPendingRewards = useMemo(() => {
    return pools.reduce((sum, pool) => sum + pool.pending.amount, 0)
  }, [pools])

  const totalPendingValue = useMemo(() => {
    return pools.reduce((sum, pool) => sum + pool.pending.value, 0)
  }, [pools])

  // Filter pools with non-zero staked amount
  const poolsWithStake = useMemo(() => {
    return pools.filter(pool => pool.userInfo.stakedAmount > 0)
  }, [pools])

  // Get top APY pools (for HomePage)
  const topAPYPools = useMemo(() => {
    return [...pools].sort((a, b) => b.apy.apy - a.apy.apy).slice(0, 3)
  }, [pools])

  // Refetch all pool data (for immediate refresh after operations)
  const refetchAll = useCallback(() => {
    // Refetch all user info
    userInfo0.refetch()
    userInfo1.refetch()
    userInfo2.refetch()
    userInfo3.refetch()
    userInfo4.refetch()
    userInfo5.refetch()
    userInfo6.refetch()
    userInfo7.refetch()
    userInfo8.refetch()
    userInfo9.refetch()

    // Refetch all pool info
    poolInfo0.refetch()
    poolInfo1.refetch()
    poolInfo2.refetch()
    poolInfo3.refetch()
    poolInfo4.refetch()
    poolInfo5.refetch()
    poolInfo6.refetch()
    poolInfo7.refetch()
    poolInfo8.refetch()
    poolInfo9.refetch()

    // Refetch all rewards
    reward0.refetch()
    reward1.refetch()
    reward2.refetch()
    reward3.refetch()
    reward4.refetch()
    reward5.refetch()
    reward6.refetch()
    reward7.refetch()
    reward8.refetch()
    reward9.refetch()
  }, [
    userInfo0, userInfo1, userInfo2, userInfo3, userInfo4,
    userInfo5, userInfo6, userInfo7, userInfo8, userInfo9,
    poolInfo0, poolInfo1, poolInfo2, poolInfo3, poolInfo4,
    poolInfo5, poolInfo6, poolInfo7, poolInfo8, poolInfo9,
    reward0, reward1, reward2, reward3, reward4,
    reward5, reward6, reward7, reward8, reward9,
  ])

  return {
    pools,
    poolsWithStake,
    topAPYPools,
    refetchAll,
    totalFarmingValue,
    totalPendingRewards,
    totalPendingValue,
    isConnected,
  }
}
