import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { parseEther } from 'viem'
import { CONTRACTS, TOKEN_DECIMALS } from '@/config/contracts'
import { logger } from '@/utils/logger'
import { usePermit } from './usePermit'
import { useState } from 'react'

// ERC4626 Vault ABI with permit support (used by stBTD and stBTB)
const VAULT_ABI = [
  {
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    name: 'deposit',
    outputs: [{ name: 'shares', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'shares', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'owner', type: 'address' },
    ],
    name: 'redeem',
    outputs: [{ name: 'assets', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'deadline', type: 'uint256' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    name: 'depositWithPermit',
    outputs: [{ name: 'shares', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

/**
 * Deposit BTD to stBTD (ERC4626 vault) using EIP-2612 permit
 * No separate approve transaction needed - gasless approval via signature
 */
export function useDepositStBTD() {
  const { address } = useAccount()
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { signPermit } = usePermit()
  const [isSigningPermit, setIsSigningPermit] = useState(false)
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const deposit = async (btdAmount: string) => {
    if (!address) throw new Error('Wallet not connected')

    try {
      setIsSigningPermit(true)
      logger.info('Signing permit for BTD deposit to stBTD...', { amount: btdAmount })

      // Sign permit for BTD token
      const permitSig = await signPermit({
        tokenAddress: CONTRACTS.BTD,
        spenderAddress: CONTRACTS.stBTD,
        amount: btdAmount,
        decimals: TOKEN_DECIMALS.BTD,
      })

      setIsSigningPermit(false)
      logger.info('Depositing BTD to stBTD with permit...', { amount: btdAmount })

      const amount = parseEther(btdAmount)

      writeContract({
        address: CONTRACTS.stBTD,
        abi: VAULT_ABI,
        functionName: 'depositWithPermit',
        args: [amount, address, permitSig.deadline, permitSig.v, permitSig.r, permitSig.s],
      })
    } catch (err) {
      setIsSigningPermit(false)
      logger.error('Deposit stBTD with permit error:', err)
      throw err
    }
  }

  return {
    deposit,
    isPending: isPending || isSigningPermit,
    isSigningPermit,
    isConfirming,
    isSuccess,
    error,
    hash,
  }
}

/**
 * Redeem stBTD to BTD (ERC4626 vault)
 */
export function useRedeemStBTD() {
  const { address } = useAccount()
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const redeem = async (stBTDAmount: string) => {
    if (!address) throw new Error('Wallet not connected')

    try {
      logger.info('Redeeming stBTD to BTD...', { amount: stBTDAmount })

      const amount = parseEther(stBTDAmount)

      writeContract({
        address: CONTRACTS.stBTD,
        abi: VAULT_ABI,
        functionName: 'redeem',
        args: [amount, address, address],
      })
    } catch (err) {
      logger.error('Redeem stBTD error:', err)
      throw err
    }
  }

  return {
    redeem,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  }
}

/**
 * Deposit BTB to stBTB (ERC4626 vault) using EIP-2612 permit
 * No separate approve transaction needed - gasless approval via signature
 */
export function useDepositStBTB() {
  const { address } = useAccount()
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { signPermit } = usePermit()
  const [isSigningPermit, setIsSigningPermit] = useState(false)
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const deposit = async (btbAmount: string) => {
    if (!address) throw new Error('Wallet not connected')

    try {
      setIsSigningPermit(true)
      logger.info('Signing permit for BTB deposit to stBTB...', { amount: btbAmount })

      // Sign permit for BTB token
      const permitSig = await signPermit({
        tokenAddress: CONTRACTS.BTB,
        spenderAddress: CONTRACTS.stBTB,
        amount: btbAmount,
        decimals: TOKEN_DECIMALS.BTB,
      })

      setIsSigningPermit(false)
      logger.info('Depositing BTB to stBTB with permit...', { amount: btbAmount })

      const amount = parseEther(btbAmount)

      writeContract({
        address: CONTRACTS.stBTB,
        abi: VAULT_ABI,
        functionName: 'depositWithPermit',
        args: [amount, address, permitSig.deadline, permitSig.v, permitSig.r, permitSig.s],
      })
    } catch (err) {
      setIsSigningPermit(false)
      logger.error('Deposit stBTB with permit error:', err)
      throw err
    }
  }

  return {
    deposit,
    isPending: isPending || isSigningPermit,
    isSigningPermit,
    isConfirming,
    isSuccess,
    error,
    hash,
  }
}

/**
 * Redeem stBTB to BTB (ERC4626 vault)
 */
export function useRedeemStBTB() {
  const { address } = useAccount()
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const redeem = async (stBTBAmount: string) => {
    if (!address) throw new Error('Wallet not connected')

    try {
      logger.info('Redeeming stBTB to BTB...', { amount: stBTBAmount })

      const amount = parseEther(stBTBAmount)

      writeContract({
        address: CONTRACTS.stBTB,
        abi: VAULT_ABI,
        functionName: 'redeem',
        args: [amount, address, address],
      })
    } catch (err) {
      logger.error('Redeem stBTB error:', err)
      throw err
    }
  }

  return {
    redeem,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  }
}
