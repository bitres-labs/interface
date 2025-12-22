import { useCallback } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { UniswapV2Pair_ABI, ERC20_ABI } from '@/abis'
import { CONTRACTS, TOKEN_DECIMALS } from '@/config/contracts'

// Pool configuration
export const POOLS = [
  {
    name: 'BRS/BTD',
    address: CONTRACTS.BRSBTDPair,
    token0: { symbol: 'BRS', address: CONTRACTS.BRS, decimals: TOKEN_DECIMALS.BRS },
    token1: { symbol: 'BTD', address: CONTRACTS.BTD, decimals: TOKEN_DECIMALS.BTD },
  },
  {
    name: 'BTD/USDC',
    address: CONTRACTS.BTDUSDCPair,
    token0: { symbol: 'BTD', address: CONTRACTS.BTD, decimals: TOKEN_DECIMALS.BTD },
    token1: { symbol: 'USDC', address: CONTRACTS.USDC, decimals: TOKEN_DECIMALS.USDC },
  },
  {
    name: 'BTB/BTD',
    address: CONTRACTS.BTBBTDPair,
    token0: { symbol: 'BTB', address: CONTRACTS.BTB, decimals: TOKEN_DECIMALS.BTB },
    token1: { symbol: 'BTD', address: CONTRACTS.BTD, decimals: TOKEN_DECIMALS.BTD },
  },
  {
    name: 'WBTC/USDC',
    address: CONTRACTS.WBTCUSDCPair,
    token0: { symbol: 'WBTC', address: CONTRACTS.WBTC, decimals: TOKEN_DECIMALS.WBTC },
    token1: { symbol: 'USDC', address: CONTRACTS.USDC, decimals: TOKEN_DECIMALS.USDC },
  },
]

/**
 * Hook to read pair reserves
 */
export function usePairReserves(pairAddress: `0x${string}`) {
  const { data, refetch } = useReadContract({
    address: pairAddress,
    abi: UniswapV2Pair_ABI,
    functionName: 'getReserves',
  })

  const reserves = data as [bigint, bigint, number] | undefined

  return {
    reserve0: reserves?.[0] || 0n,
    reserve1: reserves?.[1] || 0n,
    blockTimestampLast: reserves?.[2] || 0,
    refetch,
  }
}

/**
 * Get token order in pair (token0 < token1 by address)
 * Not a hook - just a utility function
 */
export function getTokenOrder(tokenAAddress: string, tokenBAddress: string) {
  const isAToken0 = tokenAAddress.toLowerCase() < tokenBAddress.toLowerCase()
  return {
    isAToken0,
    token0Address: isAToken0 ? tokenAAddress : tokenBAddress,
    token1Address: isAToken0 ? tokenBAddress : tokenAAddress,
  }
}

/**
 * Calculate output amount for swap using x*y=k formula
 */
export function calculateSwapOutput(
  amountIn: string,
  reserveIn: bigint,
  reserveOut: bigint,
  decimalsIn: number,
  decimalsOut: number
): string {
  if (!amountIn || Number(amountIn) <= 0 || reserveIn === 0n || reserveOut === 0n) {
    return '0'
  }

  try {
    const amountInWei = parseUnits(amountIn, decimalsIn)
    const amountInWithFee = amountInWei * 997n // 0.3% fee
    const numerator = amountInWithFee * reserveOut
    const denominator = reserveIn * 1000n + amountInWithFee
    const amountOut = numerator / denominator

    return formatUnits(amountOut, decimalsOut)
  } catch {
    return '0'
  }
}

/**
 * Hook to perform swap on Uniswap V2 pair
 */
export function useSwapOnPair() {
  const { address: account } = useAccount()
  const { writeContract, data: hash, isPending, isError, error } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({ hash })

  const swap = useCallback(
    async (
      pairAddress: `0x${string}`,
      tokenIn: string,
      tokenOut: string,
      _amountIn: string,
      amountOutMin: string,
      _decimalsIn: number,
      decimalsOut: number
    ) => {
      if (!account) throw new Error('Wallet not connected')

      const { isAToken0 } = getTokenOrder(tokenIn, tokenOut)
      // TODO: Calculate amountInWei for swap implementation using _amountIn and _decimalsIn
      const amountOutMinWei = parseUnits(amountOutMin, decimalsOut)

      // amount0Out and amount1Out based on token order
      const amount0Out = isAToken0 ? 0n : amountOutMinWei
      const amount1Out = isAToken0 ? amountOutMinWei : 0n

      writeContract({
        address: pairAddress,
        abi: UniswapV2Pair_ABI,
        functionName: 'swap',
        args: [amount0Out, amount1Out, account, '0x'],
      })
    },
    [account, writeContract]
  )

  return {
    swap,
    isPending,
    isSuccess,
    isError,
    error,
    hash,
  }
}

/**
 * Hook to read LP token balance
 */
export function useLPBalance(pairAddress: `0x${string}`) {
  const { address: account } = useAccount()
  const { data, refetch } = useReadContract({
    address: pairAddress,
    abi: UniswapV2Pair_ABI,
    functionName: 'balanceOf',
    args: account ? [account] : undefined,
  })

  const balance = data as bigint | undefined

  return {
    balance: balance || 0n,
    formatted: formatUnits(balance || 0n, 18),
    refetch,
  }
}

/**
 * Hook to read total supply of LP tokens
 */
export function useLPTotalSupply(pairAddress: `0x${string}`) {
  const { data, refetch } = useReadContract({
    address: pairAddress,
    abi: UniswapV2Pair_ABI,
    functionName: 'totalSupply',
  })

  const totalSupply = data as bigint | undefined

  return {
    totalSupply: totalSupply || 0n,
    formatted: formatUnits(totalSupply || 0n, 18),
    refetch,
  }
}

/**
 * Hook to add liquidity to pair
 */
export function useAddLiquidity() {
  const { address: account } = useAccount()
  const { writeContract, data: hash, isPending, isError, error } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({ hash })

  const addLiquidity = useCallback(
    async (
      _token0Contract: `0x${string}`,
      _token1Contract: `0x${string}`,
      _pairAddress: `0x${string}`,
      _amount0: string,
      _amount1: string,
      _decimals0: number,
      _decimals1: number
    ) => {
      if (!account) throw new Error('Wallet not connected')

      // TODO: Calculate amount0Wei and amount1Wei for implementation using _amount0, _amount1, _decimals0, _decimals1
      // Note: In a real implementation, we would need to:
      // 1. Transfer token0 to pair
      // 2. Transfer token1 to pair
      // 3. Call pair.mint(account)
      // For now, we'll call mint directly assuming tokens are transferred

      writeContract({
        address: _pairAddress,
        abi: UniswapV2Pair_ABI,
        functionName: 'mint',
        args: [account],
      })
    },
    [account, writeContract]
  )

  return {
    addLiquidity,
    isPending,
    isSuccess,
    isError,
    error,
    hash,
  }
}

/**
 * Hook to remove liquidity from pair
 */
export function useRemoveLiquidity() {
  const { address: account } = useAccount()
  const { writeContract, data: hash, isPending, isError, error } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({ hash })

  const removeLiquidity = useCallback(
    async (pairAddress: `0x${string}`, _liquidity: string) => {
      if (!account) throw new Error('Wallet not connected')

      // TODO: Calculate liquidityWei (LP tokens are 18 decimals) for implementation using _liquidity
      // Transfer LP tokens to pair, then call burn
      writeContract({
        address: pairAddress,
        abi: UniswapV2Pair_ABI,
        functionName: 'burn',
        args: [account],
      })
    },
    [account, writeContract]
  )

  return {
    removeLiquidity,
    isPending,
    isSuccess,
    isError,
    error,
    hash,
  }
}

/**
 * Hook to read token balance
 */
export function useTokenBalance(tokenAddress: `0x${string}`, decimals: number) {
  const { address: account } = useAccount()
  const { data, refetch } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: account ? [account] : undefined,
  })

  const balance = data as bigint | undefined

  return {
    balance: balance || 0n,
    formatted: formatUnits(balance || 0n, decimals),
    refetch,
  }
}
