import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'
import { CONTRACTS } from '@/config/contracts'
import { logger } from '@/utils/logger'
import { WETH_ABI } from '@/abis'

/**
 * Wrap ETH to WETH
 */
export function useWrapETH() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const wrap = async (ethAmount: string) => {
    try {
      logger.info('Wrapping ETH to WETH...', { amount: ethAmount })

      await writeContract({
        address: CONTRACTS.WETH,
        abi: WETH_ABI,
        functionName: 'deposit',
        value: parseEther(ethAmount),
      })
    } catch (err) {
      logger.error('Wrap ETH error:', err)
      throw err
    }
  }

  return {
    wrap,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  }
}

/**
 * Unwrap WETH to ETH
 */
export function useUnwrapWETH() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const unwrap = async (wethAmount: string) => {
    try {
      logger.info('Unwrapping WETH to ETH...', { amount: wethAmount })

      const amount = parseEther(wethAmount)

      await writeContract({
        address: CONTRACTS.WETH,
        abi: WETH_ABI,
        functionName: 'withdraw',
        args: [amount],
      })
    } catch (err) {
      logger.error('Unwrap WETH error:', err)
      throw err
    }
  }

  return {
    unwrap,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  }
}
