import { useReadContract } from 'wagmi'
import { CONTRACTS } from '@/config/contracts'

// InterestPool ABI (minimal - only what we need)
const INTEREST_POOL_ABI = [
  {
    inputs: [],
    name: 'btdPool',
    outputs: [
      { internalType: 'contract IMintableERC20', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'totalStaked', type: 'uint256' },
      { internalType: 'uint256', name: 'accInterestPerShare', type: 'uint256' },
      { internalType: 'uint256', name: 'lastAccrual', type: 'uint256' },
      { internalType: 'uint256', name: 'annualRateBps', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'btbPool',
    outputs: [
      { internalType: 'contract IMintableERC20', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'totalStaked', type: 'uint256' },
      { internalType: 'uint256', name: 'accInterestPerShare', type: 'uint256' },
      { internalType: 'uint256', name: 'lastAccrual', type: 'uint256' },
      { internalType: 'uint256', name: 'annualRateBps', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const

/**
 * Get BTD staking interest rate from InterestPool
 * @returns APR as a percentage (e.g., 4.0 for 4%)
 */
export function useBTDInterestRate() {
  const { data: btdPool, refetch } = useReadContract({
    address: CONTRACTS.InterestPool,
    abi: INTEREST_POOL_ABI,
    functionName: 'btdPool',
  })

  // Convert basis points to percentage
  // 400 bps = 4.00%
  const apr = btdPool ? Number(btdPool[4]) / 100 : 0

  return {
    apr,
    aprBps: btdPool ? Number(btdPool[4]) : 0,
    totalStaked: btdPool ? btdPool[1] : 0n,
    lastAccrual: btdPool ? Number(btdPool[3]) : 0,
    refetch,
  }
}

/**
 * Get BTB staking interest rate from InterestPool
 * @returns APR as a percentage (e.g., 4.0 for 4%)
 */
export function useBTBInterestRate() {
  const { data: btbPool, refetch } = useReadContract({
    address: CONTRACTS.InterestPool,
    abi: INTEREST_POOL_ABI,
    functionName: 'btbPool',
  })

  // Convert basis points to percentage
  // 400 bps = 4.00%
  const apr = btbPool ? Number(btbPool[4]) / 100 : 0

  return {
    apr,
    aprBps: btbPool ? Number(btbPool[4]) : 0,
    totalStaked: btbPool ? btbPool[1] : 0n,
    lastAccrual: btbPool ? Number(btbPool[3]) : 0,
    refetch,
  }
}
