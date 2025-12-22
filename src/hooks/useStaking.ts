import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { useState } from 'react'
import { logger } from '@/utils/logger'
import { parseUnits, formatUnits } from 'viem'
import { CONTRACTS, TOKEN_DECIMALS } from '@/config/contracts'
import { stBTD_ABI as stBTDABI } from '@/abis'
import { stBTB_ABI as stBTBABI } from '@/abis'
import { usePermit } from './usePermit'

// ============================================================================
// CONFIGURATION
// ============================================================================

type TokenType = 'BTD' | 'BTB'

const STTOKEN_CONFIG = {
  BTD: {
    contract: CONTRACTS.stBTD,
    abi: stBTDABI,
    decimals: TOKEN_DECIMALS.BTD,
    stDecimals: TOKEN_DECIMALS.stBTD,
  },
  BTB: {
    contract: CONTRACTS.stBTB,
    abi: stBTBABI,
    decimals: TOKEN_DECIMALS.BTB,
    stDecimals: TOKEN_DECIMALS.stBTB,
  },
} as const

// ============================================================================
// READ FUNCTIONS
// ============================================================================

/**
 * Generic hook to get staked amount (stToken balance)
 */
function useStakedAmount(tokenType: TokenType) {
  const { address } = useAccount()
  const config = STTOKEN_CONFIG[tokenType]

  const { data, isLoading, error, refetch } = useReadContract({
    address: config.contract,
    abi: config.abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  })

  return {
    staked: data ? formatUnits(data as bigint, config.stDecimals) : '0',
    stakedRaw: data as bigint | undefined,
    isLoading,
    error,
    refetch,
  }
}

// Export convenience functions for BTD
export function useStakedBTD() {
  return useStakedAmount('BTD')
}

// Export convenience functions for BTB
export function useStakedBTB() {
  return useStakedAmount('BTB')
}

// ============================================================================
// WRITE FUNCTIONS - STAKE
// ============================================================================

/**
 * Generic hook to stake tokens (deposit)
 */
function useStakeToken(tokenType: TokenType) {
  const { address } = useAccount()
  const config = STTOKEN_CONFIG[tokenType]
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const stake = async (amount: string) => {
    if (!address) throw new Error('Wallet not connected')

    try {
      const amountWei = parseUnits(amount, config.decimals)

      writeContract({
        address: config.contract,
        abi: config.abi,
        functionName: 'deposit',
        args: [amountWei, address],
      })
    } catch (err) {
      logger.error(`Stake ${tokenType} error:`, err)
      throw err
    }
  }

  return {
    stake,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  }
}

// Export convenience functions with specific names for backward compatibility
export function useStakeBTD() {
  const hook = useStakeToken('BTD')
  return {
    stakeBTD: hook.stake,
    isPending: hook.isPending,
    isConfirming: hook.isConfirming,
    isSuccess: hook.isSuccess,
    error: hook.error,
    hash: hook.hash,
  }
}

export function useStakeBTB() {
  const { address } = useAccount()
  const config = STTOKEN_CONFIG['BTB']
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { signPermit } = usePermit()
  const [isSigningPermit, setIsSigningPermit] = useState(false)

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const stakeBTBWithPermit = async (amount: string) => {
    if (!address) throw new Error('Wallet not connected')

    setIsSigningPermit(true)
    try {
      // Sign permit
      const permitSig = await signPermit({
        tokenAddress: CONTRACTS.BTB,
        spenderAddress: CONTRACTS.stBTB,
        amount,
        decimals: TOKEN_DECIMALS.BTB,
      })

      setIsSigningPermit(false)

      // Call depositWithPermit on stBTB contract
      const amountWei = parseUnits(amount, config.decimals)

      writeContract({
        address: config.contract,
        abi: config.abi,
        functionName: 'depositWithPermit',
        args: [amountWei, address, permitSig.deadline, permitSig.v, permitSig.r, permitSig.s],
      })
    } catch (err) {
      setIsSigningPermit(false)
      logger.error('Stake BTB with permit error:', err)
      throw err
    }
  }

  return {
    stakeBTB: stakeBTBWithPermit,
    isSigningPermit,
    isPending: isPending || isSigningPermit,
    isConfirming,
    isSuccess,
    error,
    hash,
  }
}

// ============================================================================
// WRITE FUNCTIONS - UNSTAKE
// ============================================================================

/**
 * Generic hook to unstake tokens (redeem)
 */
function useUnstakeToken(tokenType: TokenType) {
  const { address } = useAccount()
  const config = STTOKEN_CONFIG[tokenType]
  const { writeContract, data: hash, isPending, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const unstake = async (amount: string) => {
    if (!address) throw new Error('Wallet not connected')

    try {
      const amountWei = parseUnits(amount, config.stDecimals)

      writeContract({
        address: config.contract,
        abi: config.abi,
        functionName: 'redeem',
        args: [amountWei, address, address],
      })
    } catch (err) {
      logger.error(`Unstake ${tokenType} error:`, err)
      throw err
    }
  }

  return {
    unstake,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  }
}

// Export convenience functions with specific names for backward compatibility
export function useUnstakeBTD() {
  const hook = useUnstakeToken('BTD')
  return {
    unstakeBTD: hook.unstake,
    isPending: hook.isPending,
    isConfirming: hook.isConfirming,
    isSuccess: hook.isSuccess,
    error: hook.error,
    hash: hook.hash,
  }
}

export function useUnstakeBTB() {
  const hook = useUnstakeToken('BTB')
  return {
    unstakeBTB: hook.unstake,
    isPending: hook.isPending,
    isConfirming: hook.isConfirming,
    isSuccess: hook.isSuccess,
    error: hook.error,
    hash: hook.hash,
  }
}
