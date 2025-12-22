import { useState } from 'react'
import { useAccount, usePublicClient, useWalletClient, useReadContract } from 'wagmi'
import { parseUnits } from 'viem'
import { ERC20_ABI } from '@/abis'
import { logger } from '@/utils/logger'

/**
 * Hook to handle approve + execute in one click
 * Automatically checks allowance and approves if needed before executing the action
 */
export function useApproveAndExecute() {
  const { address: account } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const [isProcessing, setIsProcessing] = useState(false)

  const approveAndExecute = async ({
    tokenAddress,
    spenderAddress,
    amount,
    decimals,
    actionName,
    executeAction,
  }: {
    tokenAddress: `0x${string}`
    spenderAddress: `0x${string}`
    amount: string
    decimals: number
    actionName: string
    executeAction: () => Promise<void>
  }) => {
    if (!account || !publicClient || !walletClient) {
      throw new Error('Wallet not connected')
    }

    setIsProcessing(true)

    try {
      const amountWei = parseUnits(amount, decimals)

      // Check current allowance
      const currentAllowance = (await publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [account, spenderAddress],
      })) as bigint

      // If allowance is insufficient, approve first
      if (currentAllowance < amountWei) {
        logger.log(`Approving ${amount} tokens for ${actionName}...`)

        const approveHash = await walletClient.writeContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [spenderAddress, amountWei],
          account,
        })

        // Wait for approval transaction
        await publicClient.waitForTransactionReceipt({ hash: approveHash })
        logger.log('Approval confirmed')
      } else {
        logger.log('Sufficient allowance, skipping approval')
      }

      // Execute the actual action
      logger.log(`Executing ${actionName}...`)
      await executeAction()
    } finally {
      setIsProcessing(false)
    }
  }

  return {
    approveAndExecute,
    isProcessing,
  }
}

/**
 * Hook to check current allowance
 * Useful for showing approval status in UI
 */
export function useAllowance(
  tokenAddress: `0x${string}` | undefined,
  spenderAddress: `0x${string}` | undefined
) {
  const { address } = useAccount()

  const { data, isLoading, refetch } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && spenderAddress ? [address, spenderAddress] : undefined,
    query: {
      enabled: !!address && !!tokenAddress && !!spenderAddress,
    },
  })

  const allowance = data as bigint | undefined

  return {
    allowance: allowance ?? 0n,
    allowanceFormatted: allowance?.toString() || '0',
    hasAllowance: allowance ? allowance > 0n : false,
    isLoading,
    refetch,
  }
}

/**
 * Hook to check if approval is needed for a specific amount
 * Use this to show "Approve & Execute" vs "Execute" in UI
 */
export function useNeedsApproval(
  tokenAddress: `0x${string}` | undefined,
  spenderAddress: `0x${string}` | undefined,
  amount: string,
  decimals: number
) {
  const { allowance, isLoading } = useAllowance(tokenAddress, spenderAddress)

  if (!amount || Number(amount) === 0 || isLoading) {
    return false
  }

  try {
    const amountWei = parseUnits(amount, decimals)
    return allowance < amountWei
  } catch {
    return false
  }
}
