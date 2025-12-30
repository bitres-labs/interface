import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { CONTRACTS, TOKEN_DECIMALS } from '@/config/contracts'
import { FarmingPool_ABI as FarmingPoolABI } from '@/abis'
import { REFETCH_CONFIG_BY_TYPE } from '@/config/refetch'

const LP_DECIMALS = 18

const POOL_DECIMALS: Record<number, number> = {
  0: LP_DECIMALS, // BRS/BTD LP
  1: LP_DECIMALS, // BTD/USDC LP
  2: LP_DECIMALS, // BTB/BTD LP
  3: TOKEN_DECIMALS.USDC,
  4: TOKEN_DECIMALS.USDT,
  5: TOKEN_DECIMALS.WBTC,
  6: 18, // WETH
  7: TOKEN_DECIMALS.stBTD,
  8: TOKEN_DECIMALS.stBTB,
  9: TOKEN_DECIMALS.BRS,
}

const DEFAULT_DECIMALS = 18

// ===== Pool Info Hooks =====

/**
 * Get pool information
 * @param poolId Pool ID (0-9)
 */
export function usePoolInfo(poolId: number) {
  const decimals = POOL_DECIMALS[poolId] ?? DEFAULT_DECIMALS

  const { data, isLoading, error, refetch } = useReadContract({
    address: CONTRACTS.FarmingPool,
    abi: FarmingPoolABI,
    functionName: 'poolInfo',
    args: [BigInt(poolId)],
    query: REFETCH_CONFIG_BY_TYPE.pool,
  })

  if (!data || isLoading) {
    return {
      lpToken: '0x0',
      allocPoint: BigInt(0),
      lastRewardTime: BigInt(0),
      accRewardPerShare: BigInt(0),
      totalStaked: '0',
      totalStakedRaw: BigInt(0),
      decimals,
      isLoading,
      refetch,
    }
  }

  // poolInfo returns: lpToken, allocPoint, lastRewardTime, accRewardPerShare, totalStaked, kind
  const [lpToken, allocPoint, lastRewardTime, accRewardPerShare, totalStaked, kind] = data as [
    `0x${string}`,
    bigint,
    bigint,
    bigint,
    bigint,
    number,
  ]

  return {
    lpToken,
    allocPoint,
    lastRewardTime,
    accRewardPerShare,
    totalStaked: formatUnits(totalStaked, decimals),
    totalStakedRaw: totalStaked,
    decimals,
    isLoading,
    refetch,
  }
}

/**
 * Get user staking information
 * @param poolId Pool ID (0-9)
 */
export function useUserInfo(poolId: number) {
  const { address } = useAccount()
  const decimals = POOL_DECIMALS[poolId] ?? DEFAULT_DECIMALS

  const { data, isLoading, refetch } = useReadContract({
    address: CONTRACTS.FarmingPool,
    abi: FarmingPoolABI,
    functionName: 'userInfo',
    args: [BigInt(poolId), address || '0x0'],
    query: {
      enabled: !!address,
      ...REFETCH_CONFIG_BY_TYPE.staking,
    },
  })

  if (!data || isLoading || !address) {
    return {
      stakedAmount: '0',
      stakedAmountRaw: BigInt(0),
      decimals,
      rewardDebt: BigInt(0),
      isLoading,
      refetch,
    }
  }

  const [amount, rewardDebt] = data as [bigint, bigint]

  return {
    stakedAmount: formatUnits(amount, decimals),
    stakedAmountRaw: amount,
    rewardDebt,
    decimals,
    isLoading,
    refetch,
  }
}

/**
 * Get pending rewards for user
 * @param poolId Pool ID (0-9)
 */
export function usePendingReward(poolId: number) {
  const { address } = useAccount()

  const { data, isLoading, refetch } = useReadContract({
    address: CONTRACTS.FarmingPool,
    abi: FarmingPoolABI,
    functionName: 'pendingReward',
    args: [BigInt(poolId), address || '0x0'],
    query: {
      enabled: !!address,
      ...REFETCH_CONFIG_BY_TYPE.rewards,
    },
  })

  return {
    pendingReward: data ? formatUnits(data as bigint, 18) : '0',
    isLoading,
    refetch,
  }
}

/**
 * Get total allocation points
 */
export function useTotalAllocPoint() {
  const { data, isLoading } = useReadContract({
    address: CONTRACTS.FarmingPool,
    abi: FarmingPoolABI,
    functionName: 'totalAllocPoint',
    query: REFETCH_CONFIG_BY_TYPE.config,
  })

  return {
    totalAllocPoint: data ? Number(data) : 0,
    isLoading,
  }
}

/**
 * Get current reward per second
 */
export function useCurrentRewardPerSecond() {
  const { data, isLoading } = useReadContract({
    address: CONTRACTS.FarmingPool,
    abi: FarmingPoolABI,
    functionName: 'currentRewardPerSecond',
    query: REFETCH_CONFIG_BY_TYPE.stats,
  })

  return {
    rewardPerSecond: data ? formatUnits(data as bigint, 18) : '0',
    isLoading,
  }
}

// ===== Write Functions (Deposit, Withdraw, Claim) =====

/**
 * Deposit LP tokens to farming pool
 */
export function useDeposit() {
  const { writeContract, writeContractAsync, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const deposit = async (poolId: number, amount: string, decimals: number = DEFAULT_DECIMALS) => {
    const amountWei = parseUnits(amount, decimals)
    const args = {
      address: CONTRACTS.FarmingPool,
      abi: FarmingPoolABI,
      functionName: 'deposit',
      args: [BigInt(poolId), amountWei],
    } as const

    if (writeContractAsync) {
      await writeContractAsync(args)
    } else {
      writeContract(args)
    }
  }

  return {
    deposit,
    isPending: isPending || isConfirming,
    isSuccess,
    hash,
    error,
  }
}

/**
 * Withdraw LP tokens from farming pool
 */
export function useWithdraw() {
  const { writeContract, writeContractAsync, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const withdraw = async (poolId: number, amount: string, decimals: number = DEFAULT_DECIMALS) => {
    const amountWei = parseUnits(amount, decimals)
    const args = {
      address: CONTRACTS.FarmingPool,
      abi: FarmingPoolABI,
      functionName: 'withdraw',
      args: [BigInt(poolId), amountWei],
    } as const

    if (writeContractAsync) {
      await writeContractAsync(args)
    } else {
      writeContract(args)
    }
  }

  return {
    withdraw,
    isPending: isPending || isConfirming,
    isSuccess,
    hash,
    error,
  }
}

/**
 * Claim rewards from farming pool
 */
export function useClaim() {
  const { writeContract, writeContractAsync, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const claim = async (poolId: number) => {
    const args = {
      address: CONTRACTS.FarmingPool,
      abi: FarmingPoolABI,
      functionName: 'claim',
      args: [BigInt(poolId)],
    } as const

    if (writeContractAsync) {
      await writeContractAsync(args)
    } else {
      writeContract(args)
    }
  }

  return {
    claim,
    isPending: isPending || isConfirming,
    isSuccess,
    hash,
    error,
  }
}

// ===== Helper Hook: Get complete pool data =====

/**
 * Get all relevant pool data for UI display
 * @param poolId Pool ID (0-9)
 */
export function usePoolData(poolId: number) {
  const poolInfo = usePoolInfo(poolId)
  const userInfo = useUserInfo(poolId)
  const pendingReward = usePendingReward(poolId)
  const { totalAllocPoint } = useTotalAllocPoint()

  // Calculate pool weight percentage
  const poolWeight =
    totalAllocPoint > 0 ? ((Number(poolInfo.allocPoint) / totalAllocPoint) * 100).toFixed(1) : '0'

  return {
    ...poolInfo,
    ...userInfo,
    ...pendingReward,
    poolWeight: `${poolWeight}%`,
    isLoading: poolInfo.isLoading || userInfo.isLoading || pendingReward.isLoading,
    refetchAll: () => {
      poolInfo.refetch()
      userInfo.refetch()
      pendingReward.refetch()
    },
  }
}
