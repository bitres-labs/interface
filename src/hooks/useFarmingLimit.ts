import { useReadContract } from 'wagmi'
import { CONTRACTS } from '@/config/contracts'
import { FarmingPool_ABI } from '@/abis'
import { formatUnits } from 'viem'

/**
 * Hook to get a specific pool's 24-hour withdraw limit info
 * @param poolId - The ID of the pool to query
 * @returns Daily limit information for the specific pool
 */
export function usePoolDailyLimit(poolId: number) {
  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACTS.FarmingPool,
    abi: FarmingPool_ABI,
    functionName: 'getPoolDailyLimitInfo',
    args: [BigInt(poolId)],
  })

  // Parse the returned tuple: (dailyLimitValue, dailyRemaining, current12h, previous12h)
  const result = data as readonly [bigint, bigint, bigint, bigint] | undefined
  const dailyLimitValue = result?.[0] ? Number(formatUnits(result[0], 18)) : 0
  const dailyRemaining = result?.[1] ? Number(formatUnits(result[1], 18)) : 0
  const current12h = result?.[2] ? Number(formatUnits(result[2], 18)) : 0
  const previous12h = result?.[3] ? Number(formatUnits(result[3], 18)) : 0

  // Calculate used amount and usage percentage
  const dailyUsed = current12h + previous12h
  const usagePercent = dailyLimitValue > 0 ? (dailyUsed / dailyLimitValue) * 100 : 0
  const remainingPercent = 100 - usagePercent

  return {
    // Raw values (USD, 18 decimals parsed to number)
    dailyLimitValue,    // Total 24h limit in USD for this pool
    dailyRemaining,     // Remaining quota in USD for this pool
    dailyUsed,          // Used amount in 24h (current12h + previous12h)
    current12h,         // Amount withdrawn in current 12h window
    previous12h,        // Amount withdrawn in previous 12h window

    // Calculated percentages
    usagePercent,       // Used percentage (0-100)
    remainingPercent,   // Remaining percentage (0-100)

    // Status flags
    isNearLimit: remainingPercent < 20,  // Warning when < 20% remaining
    isAtLimit: dailyRemaining <= 0,      // Alert when limit reached

    // Query status
    isLoading,
    error,
    refetch,
  }
}

/**
 * Hook to get farming pool's 24-hour global withdraw limit info (all pools combined)
 * @returns Daily limit information including total limit and remaining quota
 * @deprecated Use usePoolDailyLimit() for per-pool limits instead
 */
export function useFarmingDailyLimit() {
  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACTS.FarmingPool,
    abi: FarmingPool_ABI,
    functionName: 'getDailyLimitInfo',
  })

  // Parse the returned tuple: (dailyLimitValue, dailyRemaining, current12h, previous12h)
  const result = data as readonly [bigint, bigint, bigint, bigint] | undefined
  const dailyLimitValue = result?.[0] ? Number(formatUnits(result[0], 18)) : 0
  const dailyRemaining = result?.[1] ? Number(formatUnits(result[1], 18)) : 0
  const current12h = result?.[2] ? Number(formatUnits(result[2], 18)) : 0
  const previous12h = result?.[3] ? Number(formatUnits(result[3], 18)) : 0

  // Calculate used amount and usage percentage
  const dailyUsed = current12h + previous12h
  const usagePercent = dailyLimitValue > 0 ? (dailyUsed / dailyLimitValue) * 100 : 0
  const remainingPercent = 100 - usagePercent

  return {
    // Raw values (USD, 18 decimals parsed to number)
    dailyLimitValue,    // Total 24h limit in USD
    dailyRemaining,     // Remaining quota in USD
    dailyUsed,          // Used amount in 24h (current12h + previous12h)
    current12h,         // Amount withdrawn in current 12h window
    previous12h,        // Amount withdrawn in previous 12h window

    // Calculated percentages
    usagePercent,       // Used percentage (0-100)
    remainingPercent,   // Remaining percentage (0-100)

    // Status flags
    isNearLimit: remainingPercent < 20,  // Warning when < 20% remaining
    isAtLimit: dailyRemaining <= 0,      // Alert when limit reached

    // Query status
    isLoading,
    error,
    refetch,
  }
}
