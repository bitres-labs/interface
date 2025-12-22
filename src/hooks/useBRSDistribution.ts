/**
 * BRS Distribution Hook - Reads actual on-chain balances
 *
 * This hook reads the actual BRS token balances from various contracts/addresses
 * to show the real distribution of BRS tokens.
 *
 * Distribution model (via FarmingPool fundShares mechanism):
 * - 60% to miners (actual stakers)
 * - 20% to Treasury
 * - 10% to Foundation
 * - 10% to Team
 */

import { useReadContracts } from 'wagmi'
import { formatUnits } from 'viem'
import { CONTRACTS, TOKEN_DECIMALS } from '@/config/contracts'
import { BRS_ABI } from '@/abis'

// Known addresses for distribution tracking (Hardhat accounts)
const FOUNDATION_ADDRESS = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as const
const TEAM_ADDRESS = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' as const

// Distribution percentages (fundShares model)
const MINER_SHARE = 0.6 // 60%
const TREASURY_SHARE = 0.2 // 20%
const FOUNDATION_SHARE = 0.1 // 10%
const TEAM_SHARE = 0.1 // 10%

interface BRSDistributionData {
  // Actual on-chain balances
  farmingPool: number
  treasury: number
  foundation: number
  team: number
  totalSupply: number
  // Calculated values
  distributed: number // totalSupply - farmingPool
  // Theoretical allocation based on distributed amount
  allocation: {
    miners: number // 60% of distributed
    treasury: number // 20% of distributed
    foundation: number // 10% of distributed
    team: number // 10% of distributed
  }
  isLoading: boolean
  error: Error | null
}

export function useBRSDistribution(): BRSDistributionData {
  const { data, isLoading, error } = useReadContracts({
    contracts: [
      // Total Supply
      {
        address: CONTRACTS.BRS,
        abi: BRS_ABI,
        functionName: 'totalSupply',
      },
      // FarmingPool balance (holds all BRS initially, decreases as rewards are distributed)
      {
        address: CONTRACTS.BRS,
        abi: BRS_ABI,
        functionName: 'balanceOf',
        args: [CONTRACTS.FarmingPool],
      },
      // Treasury balance (receives 20% of emissions via fundShares)
      {
        address: CONTRACTS.BRS,
        abi: BRS_ABI,
        functionName: 'balanceOf',
        args: [CONTRACTS.Treasury],
      },
      // Foundation balance (receives 10% of emissions via fundShares)
      {
        address: CONTRACTS.BRS,
        abi: BRS_ABI,
        functionName: 'balanceOf',
        args: [FOUNDATION_ADDRESS],
      },
      // Team balance (receives 10% of emissions via fundShares)
      {
        address: CONTRACTS.BRS,
        abi: BRS_ABI,
        functionName: 'balanceOf',
        args: [TEAM_ADDRESS],
      },
    ],
    query: {
      refetchInterval: 10000, // Refresh every 10 seconds
    },
  })

  const decimals = TOKEN_DECIMALS.BRS

  const totalSupply = data?.[0]?.result
    ? Number(formatUnits(data[0].result as bigint, decimals))
    : 0

  const farmingPool = data?.[1]?.result
    ? Number(formatUnits(data[1].result as bigint, decimals))
    : 0

  const treasury = data?.[2]?.result
    ? Number(formatUnits(data[2].result as bigint, decimals))
    : 0

  const foundation = data?.[3]?.result
    ? Number(formatUnits(data[3].result as bigint, decimals))
    : 0

  const team = data?.[4]?.result
    ? Number(formatUnits(data[4].result as bigint, decimals))
    : 0

  // Calculate distributed amount (what has left FarmingPool)
  const distributed = totalSupply - farmingPool

  // Calculate theoretical allocation based on distributed amount
  const allocation = {
    miners: distributed * MINER_SHARE,
    treasury: distributed * TREASURY_SHARE,
    foundation: distributed * FOUNDATION_SHARE,
    team: distributed * TEAM_SHARE,
  }

  return {
    farmingPool,
    treasury,
    foundation,
    team,
    totalSupply,
    distributed,
    allocation,
    isLoading,
    error: error || null,
  }
}
