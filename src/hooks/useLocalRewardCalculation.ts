/**
 * Local Reward Calculation Hook
 *
 * Principle:
 * 1. Get initial reward value and mining speed from server
 * 2. Frontend calculates locally every second: currentReward += rewardPerSecond
 * 3. Calibrate with server every 10 seconds for actual values
 *
 * Advantages:
 * - Reward numbers update smoothly every second
 * - Reduces 90% of server requests
 * - Better user experience (real-time growth)
 */

import { useState, useEffect, useRef } from 'react'
import { useAccount } from 'wagmi'
import { usePendingReward } from './useFarming'
import { formatUnits } from 'viem'

const FAST_RESYNC_INTERVAL = 2000 // Trigger again within 2 seconds after first sync to quickly get mining speed

interface RewardCalculation {
  displayReward: number      // Displayed reward value (locally calculated)
  serverReward: number       // Server actual value
  rewardPerSecond: number    // Reward speed per second
  lastSyncTime: number       // Last sync time
  isCalculating: boolean     // Whether local calculation is in progress
}

/**
 * Use locally calculated reward Hook
 * @param poolId Pool ID
 * @param syncInterval Sync interval (milliseconds), default 10 seconds
 */
export function useLocalRewardCalculation(poolId: number, syncInterval = 10000) {
  const { address } = useAccount()

  // Get actual reward from server (only used for periodic calibration)
  const { pendingReward: serverRewardStr, refetch } = usePendingReward(poolId)
  const serverReward = parseFloat(serverRewardStr)

  // Local state
  const initialCalculation: RewardCalculation = {
    displayReward: 0,
    serverReward: 0,
    rewardPerSecond: 0,
    lastSyncTime: Date.now(),
    isCalculating: false,
  }

  const [calculation, setCalculation] = useState<RewardCalculation>(initialCalculation)

  // Reset local state immediately when switching wallet address or pool to avoid using old address reward info
  useEffect(() => {
    setCalculation({
      displayReward: 0,
      serverReward: 0,
      rewardPerSecond: 0,
      lastSyncTime: Date.now(),
      isCalculating: false,
    })
  }, [address, poolId])

  // Store timer IDs
  const localTimerRef = useRef<NodeJS.Timeout | null>(null)
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null)
  const fastSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Use ref to save the latest calculation state to avoid timer rebuilding due to useEffect dependency changes
  const calculationRef = useRef(calculation)

  // Sync update ref whenever calculation updates
  useEffect(() => {
    calculationRef.current = calculation
  }, [calculation])

  // Initialize and periodically sync server data
  useEffect(() => {
    if (!address) {
      setCalculation({
        displayReward: 0,
        serverReward: 0,
        rewardPerSecond: 0,
        lastSyncTime: Date.now(),
        isCalculating: false,
      })
      return
    }

    // Sync function
    const syncWithServer = async (options?: { skipFastSync?: boolean }) => {
      try {
        const { data } = await refetch()
        const now = Date.now()
        const latestRewardStr =
          typeof data === 'bigint'
            ? formatUnits(data, 18)
            : data != null
                ? data.toString()
                : serverRewardStr ?? '0'

        const parsedReward = parseFloat(latestRewardStr)
        const currentServerReward = Number.isFinite(parsedReward) ? parsedReward : 0

        setCalculation(prev => {
          // Calculate mining speed (based on last sync data)
          let newRewardPerSecond = prev.rewardPerSecond

          if (prev.serverReward > 0 && prev.lastSyncTime > 0) {
            const timeDiff = (now - prev.lastSyncTime) / 1000 // seconds
            const rewardDiff = currentServerReward - prev.serverReward

            if (timeDiff > 0) {
              if (rewardDiff >= 0) {
                // Update mining speed (using exponential moving average, smooth fluctuations)
                const calculatedSpeed = rewardDiff / timeDiff
                newRewardPerSecond = prev.rewardPerSecond === 0
                  ? calculatedSpeed
                  : prev.rewardPerSecond * 0.7 + calculatedSpeed * 0.3
              } else {
                // When rewards are claimed or address switch causes pending to decrease, immediately pause local accumulation
                newRewardPerSecond = 0
              }
            }
          }

          // If server reward is 0 and no staking, reset mining speed
          if (currentServerReward === 0 && prev.serverReward === 0) {
            newRewardPerSecond = 0
          }

          // Determine display value update strategy
          let newDisplayReward: number

          // Special case 1: After user claim, server reward becomes zero
          if (currentServerReward === 0 && prev.serverReward > 0) {
            // Clear claim operation, immediately zero the display value
            newDisplayReward = 0
          }
          // Special case 2: Server value is significantly less than local value (possibly claim or address switch)
          else if (currentServerReward < prev.displayReward * 0.5 && prev.displayReward > 0.1) {
            // Server value decreased by more than 50%, possibly a claim, use server value
            newDisplayReward = currentServerReward
          }
          // Normal case: Use server value directly
          // Since local uses 95% speed discount, local accumulation is only for smooth display between two syncs
          // Correct to server actual value on each sync to ensure users are not misled
          else {
            newDisplayReward = currentServerReward
          }

          return {
            displayReward: newDisplayReward,
            serverReward: currentServerReward,
            rewardPerSecond: newRewardPerSecond,
            lastSyncTime: now,
            // Only enable local calculation when there are rewards or mining speed > 0
            isCalculating: currentServerReward > 0 || newRewardPerSecond > 0,
          }
        })

        // After completing a full sync, if using a longer calibration interval, schedule an additional quick sync
        if (!options?.skipFastSync && syncInterval > FAST_RESYNC_INTERVAL) {
          if (fastSyncTimeoutRef.current) {
            clearTimeout(fastSyncTimeoutRef.current)
          }
          fastSyncTimeoutRef.current = setTimeout(() => {
            syncWithServer({ skipFastSync: true })
          }, FAST_RESYNC_INTERVAL)
        }
      } catch (error) {
        console.error('[useLocalRewardCalculation] sync error', error)
      }
    }

    // Sync immediately once
    syncWithServer()

    // Set up periodic sync (default 10 seconds)
    syncTimerRef.current = setInterval(syncWithServer, syncInterval)

    return () => {
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current)
      }
      if (fastSyncTimeoutRef.current) {
        clearTimeout(fastSyncTimeoutRef.current)
      }
    }
  }, [address, poolId, syncInterval, refetch, serverRewardStr])

  // Local calculation of reward growth every 1 second (consistent with contract mining frequency)
  useEffect(() => {
    if (!address) {
      // Clear timer when no address is connected
      if (localTimerRef.current) {
        clearInterval(localTimerRef.current)
        localTimerRef.current = null
      }
      return
    }

    // If timer is already running, do not create duplicate
    if (localTimerRef.current) {
      return
    }

    // Update every 1 second, consistent with contract frequency
    const updateInterval = 1000
    // Local accumulation speed discount factor (95%), ensures local value is slightly slower than server value
    // Server value will automatically correct upward on each 30-second sync
    const LOCAL_SPEED_DISCOUNT = 0.95

    localTimerRef.current = setInterval(() => {
      setCalculation(prev => {
        // Use prev to access latest state, only update when still calculating and speed > 0
        if (prev.isCalculating && prev.rewardPerSecond > 0) {
          return {
            ...prev,
            // Use 95% speed accumulation to prevent local value from getting ahead
            displayReward: prev.displayReward + prev.rewardPerSecond * LOCAL_SPEED_DISCOUNT,
          }
        }
        return prev
      })
    }, updateInterval)

    return () => {
      if (localTimerRef.current) {
        clearInterval(localTimerRef.current)
        localTimerRef.current = null
      }
    }
  }, [address])

  return {
    // Reward value for display (smooth growth)
    reward: calculation.displayReward,

    // Formatted reward value (BRS is stablecoin, use 2 decimal places)
    rewardFormatted: calculation.displayReward.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }),

    // Reward speed per second
    rewardPerSecond: calculation.rewardPerSecond,

    // Reward speed per hour
    rewardPerHour: calculation.rewardPerSecond * 3600,

    // Reward speed per day
    rewardPerDay: calculation.rewardPerSecond * 86400,

    // Whether calculation is in progress
    isCalculating: calculation.isCalculating,

    // Last sync time
    lastSyncTime: new Date(calculation.lastSyncTime),

    // Manually trigger sync
    forceSync: () => refetch(),

    // refetch method compatible with useFarmingPositions and other callers
    refetch: () => refetch(),
  }
}

/**
 * Batch use of locally calculated rewards (for Farm page)
 * @param poolIds Array of pool IDs
 * @param syncInterval Sync interval (milliseconds), default 10 seconds
 */
export function useBatchLocalRewardCalculation(
  poolIds: number[],
  syncInterval = 10000
) {
  const rewards = poolIds.map(poolId =>
    useLocalRewardCalculation(poolId, syncInterval)
  )

  // Calculate total rewards
  const totalReward = rewards.reduce((sum, r) => sum + r.reward, 0)
  const totalRewardPerSecond = rewards.reduce((sum, r) => sum + r.rewardPerSecond, 0)

  return {
    rewards,
    totalReward,
    totalRewardFormatted: totalReward.toLocaleString(undefined, {
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    }),
    totalRewardPerSecond,
    totalRewardPerHour: totalRewardPerSecond * 3600,
    totalRewardPerDay: totalRewardPerSecond * 86400,
  }
}
