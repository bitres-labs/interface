import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { parseEther } from 'viem'
import { CONTRACTS } from '@/config/contracts'
import { logger } from '@/utils/logger'
import { useApproveAndExecute } from './useApproveAndExecute'

// ERC4626 Vault ABI (used by stBTD and stBTB)
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
] as const

/**
 * Deposit BTD to stBTD (ERC4626 vault)
 */
export function useDepositStBTD() {
  const { address } = useAccount()
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { approveAndExecute, isProcessing: isApproving } = useApproveAndExecute()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const deposit = async (btdAmount: string) => {
    if (!address) throw new Error('Wallet not connected')

    try {
      await approveAndExecute({
        tokenAddress: CONTRACTS.BTD,
        spenderAddress: CONTRACTS.stBTD,
        amount: btdAmount,
        decimals: 18,
        actionName: 'Deposit to stBTD',
        executeAction: async () => {
          logger.info('Depositing BTD to stBTD...', { amount: btdAmount })

          const amount = parseEther(btdAmount)

          writeContract({
            address: CONTRACTS.stBTD,
            abi: VAULT_ABI,
            functionName: 'deposit',
            args: [amount, address],
          })
        },
      })
    } catch (err) {
      logger.error('Deposit stBTD error:', err)
      throw err
    }
  }

  return {
    deposit,
    isPending: isPending || isApproving,
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
 * Deposit BTB to stBTB (ERC4626 vault)
 */
export function useDepositStBTB() {
  const { address } = useAccount()
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { approveAndExecute, isProcessing: isApproving } = useApproveAndExecute()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const deposit = async (btbAmount: string) => {
    if (!address) throw new Error('Wallet not connected')

    try {
      await approveAndExecute({
        tokenAddress: CONTRACTS.BTB,
        spenderAddress: CONTRACTS.stBTB,
        amount: btbAmount,
        decimals: 18,
        actionName: 'Deposit to stBTB',
        executeAction: async () => {
          logger.info('Depositing BTB to stBTB...', { amount: btbAmount })

          const amount = parseEther(btbAmount)

          writeContract({
            address: CONTRACTS.stBTB,
            abi: VAULT_ABI,
            functionName: 'deposit',
            args: [amount, address],
          })
        },
      })
    } catch (err) {
      logger.error('Deposit stBTB error:', err)
      throw err
    }
  }

  return {
    deposit,
    isPending: isPending || isApproving,
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
