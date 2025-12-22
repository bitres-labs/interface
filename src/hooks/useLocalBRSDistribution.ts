/**
 * BRS Distribution Local Real-time Calculation Hook
 *
 * Principle:
 * 1. BRS mining is distributed per second (currentRewardPerSec)
 * 2. Treasury/Foundation/Team BRS balances grow linearly per second
 * 3. Frontend local calculation for real-time display + periodic server calibration
 *
 * Formula:
 * - Total mining per second = currentRewardPerSec()
 * - Treasury growth rate = Total mining * 20%
 * - Foundation growth rate = Total mining * 10%
 * - Team growth rate = Total mining * 10%
 * - Farming Pools growth rate = Total mining * 60%
 */

import { useState, useEffect, useRef } from 'react'
import { useReadContract } from 'wagmi'
import { formatUnits } from 'viem'
import { CONTRACTS, TOKEN_DECIMALS } from '@/config/contracts'
import { FarmingPool_ABI as FarmingPoolABI } from '@/abis'
import { useTotalSupply } from './useSystemStats'

interface BRSDistributionCalc {
  treasury: {
    amount: number
    displayAmount: number
    growthPerSecond: number
  }
  foundation: {
    amount: number
    displayAmount: number
    growthPerSecond: number
  }
  team: {
    amount: number
    displayAmount: number
    growthPerSecond: number
  }
  farmingPools: {
    amount: number
    displayAmount: number
    growthPerSecond: number
  }
  totalCirculating: number
  displayTotalCirculating: number
  lastSyncTime: number
  isCalculating: boolean
}

/**
 * Use locally calculated BRS distribution data
 * @param syncInterval Sync interval with server (milliseconds), default 30 seconds
 */
export function useLocalBRSDistribution(syncInterval = 30000) {
  // Get mining speed
  const { data: rewardPerSecData } = useReadContract({
    address: CONTRACTS.FarmingPool,
    abi: FarmingPoolABI,
    functionName: 'currentRewardPerSecond',
  })

  // BRS total supply
  const { totalSupplyNum, totalSupplyRaw } = useTotalSupply(CONTRACTS.BRS, TOKEN_DECIMALS.BRS)

  // Fixed allocation ratios (consistent with backend configuration)
  const TREASURY_SHARE = 0.2
  const FOUNDATION_SHARE = 0.1
  const TEAM_SHARE = 0.1
  const FARMING_SHARE = 0.6

  // Local state
  const [calculation, setCalculation] = useState<BRSDistributionCalc>({
    treasury: { amount: 0, displayAmount: 0, growthPerSecond: 0 },
    foundation: { amount: 0, displayAmount: 0, growthPerSecond: 0 },
    team: { amount: 0, displayAmount: 0, growthPerSecond: 0 },
    farmingPools: { amount: 0, displayAmount: 0, growthPerSecond: 0 },
    totalCirculating: 0,
    displayTotalCirculating: 0,
    lastSyncTime: Date.now(),
    isCalculating: false,
  })

  // Timer references
  const localTimerRef = useRef<NodeJS.Timeout | null>(null)
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Calculate mining speed (growth amount per second for each party)
  const rewardPerSecond = rewardPerSecData ? Number(formatUnits(rewardPerSecData as bigint, 18)) : 0

  // Sync server data
  useEffect(() => {
    const syncWithServer = () => {
      // If critical data is not ready yet, skip sync to avoid resetting display values to 0
      if (rewardPerSecData === undefined || totalSupplyRaw === undefined) {
        return
      }

      const now = Date.now()

      // Calculate base values for each sector based on total supply and allocation ratios
      const serverTotal = totalSupplyNum
      const serverTreasury = serverTotal * TREASURY_SHARE
      const serverFoundation = serverTotal * FOUNDATION_SHARE
      const serverTeam = serverTotal * TEAM_SHARE
      const serverFarmingPools = serverTotal * FARMING_SHARE

      // Calculate growth rates (based on currentRewardPerSecond)
      // Treasury: 20%, Foundation: 10%, Team: 10%, Farming Pools: 60%
      const treasuryGrowth = rewardPerSecond * 0.20
      const foundationGrowth = rewardPerSecond * 0.10
      const teamGrowth = rewardPerSecond * 0.10
      const farmingGrowth = rewardPerSecond * 0.60

      setCalculation({
        treasury: {
          amount: serverTreasury,
          displayAmount: serverTreasury,
          growthPerSecond: treasuryGrowth,
        },
        foundation: {
          amount: serverFoundation,
          displayAmount: serverFoundation,
          growthPerSecond: foundationGrowth,
        },
        team: {
          amount: serverTeam,
          displayAmount: serverTeam,
          growthPerSecond: teamGrowth,
        },
        farmingPools: {
          amount: serverFarmingPools,
          displayAmount: serverFarmingPools,
          growthPerSecond: farmingGrowth,
        },
        totalCirculating: serverTotal,
        displayTotalCirculating: serverTotal,
        lastSyncTime: now,
        isCalculating: true,
      })
    }

    // Sync immediately once
    syncWithServer()

    // Set up periodic sync
    syncTimerRef.current = setInterval(syncWithServer, syncInterval)

    return () => {
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current)
      }
    }
  }, [
    rewardPerSecond,
    rewardPerSecData,
    totalSupplyNum,
    totalSupplyRaw,
    syncInterval,
  ])

  // Local calculation of growth every 1 second (consistent with contract mining frequency)
  useEffect(() => {
    if (!calculation.isCalculating || rewardPerSecond <= 0) {
      return
    }

    const updateInterval = 1000 // Update every 1 second, consistent with contract frequency

    localTimerRef.current = setInterval(() => {
      setCalculation(prev => ({
        ...prev,
        treasury: {
          ...prev.treasury,
          displayAmount: prev.treasury.displayAmount + prev.treasury.growthPerSecond,
        },
        foundation: {
          ...prev.foundation,
          displayAmount: prev.foundation.displayAmount + prev.foundation.growthPerSecond,
        },
        team: {
          ...prev.team,
          displayAmount: prev.team.displayAmount + prev.team.growthPerSecond,
        },
        farmingPools: {
          ...prev.farmingPools,
          // Farming pools decrease as rewards are distributed (not increase)
          displayAmount: prev.farmingPools.displayAmount - rewardPerSecond * 0.6,
        },
        // Total supply is fixed at max supply, does not grow
        // BRS is pre-minted, mining only distributes existing tokens
        displayTotalCirculating: prev.totalCirculating,
      }))
    }, updateInterval)

    return () => {
      if (localTimerRef.current) {
        clearInterval(localTimerRef.current)
      }
    }
  }, [calculation.isCalculating, rewardPerSecond])

  return {
    treasury: calculation.treasury,
    foundation: calculation.foundation,
    team: calculation.team,
    farmingPools: calculation.farmingPools,
    totalCirculating: calculation.displayTotalCirculating,
    lastSyncTime: new Date(calculation.lastSyncTime),
    isCalculating: calculation.isCalculating,
    rewardPerSecond, // Expose mining speed for debugging
  }
}
