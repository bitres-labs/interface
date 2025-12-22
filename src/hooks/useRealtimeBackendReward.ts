/**
 * Real-time Backend Reward Hook (for debugging)
 * Reads actual reward value directly from contract every 1 second
 */

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useReadContract } from 'wagmi'
import { CONTRACTS } from '@/config/contracts'
import { FarmingPool_ABI } from '@/abis'
import { formatUnits } from 'viem'

/**
 * Read actual reward from backend every 1 second (for debugging comparison)
 * @param poolId Pool ID
 */
export function useRealtimeBackendReward(poolId: number) {
  const { address } = useAccount()
  const [realtimeReward, setRealtimeReward] = useState<number>(0)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date())

  // Use useReadContract to read backend data
  const { data: pendingRewardData, refetch } = useReadContract({
    address: CONTRACTS.FarmingPool,
    abi: FarmingPool_ABI,
    functionName: 'pendingReward',
    args: address ? [BigInt(poolId), address] : undefined,
    query: {
      enabled: !!address,
    },
  })

  // Update every 1 second
  useEffect(() => {
    if (!address) {
      setRealtimeReward(0)
      return
    }

    // Update immediately once
    const updateReward = () => {
      refetch().then(() => {
        if (pendingRewardData) {
          const reward = parseFloat(formatUnits(pendingRewardData as bigint, 18))
          setRealtimeReward(reward)
          setLastUpdateTime(new Date())
        }
      })
    }

    updateReward()

    // Update every 1 second
    const interval = setInterval(updateReward, 1000)

    return () => clearInterval(interval)
  }, [address, poolId, refetch, pendingRewardData])

  return {
    // Backend real-time reward
    backendReward: realtimeReward,

    // Formatted reward value
    backendRewardFormatted: realtimeReward.toLocaleString(undefined, {
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    }),

    // Last update time
    lastUpdateTime,

    // Manual refresh
    refresh: refetch,
  }
}
