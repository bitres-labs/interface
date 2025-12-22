import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { logger } from '@/utils/logger'
import { parseUnits, formatUnits } from 'viem'
import { CONTRACTS, TOKEN_DECIMALS } from '@/config/contracts'
import { UniswapV2Pair_ABI as UniswapV2PairABI } from '@/abis'

// Pair address mapping
const PAIR_ADDRESSES: Record<string, `0x${string}`> = {
  'BRS-BTD': CONTRACTS.BRSBTDPair,
  'BTD-BRS': CONTRACTS.BRSBTDPair,
  'BTD-USDC': CONTRACTS.BTDUSDCPair,
  'USDC-BTD': CONTRACTS.BTDUSDCPair,
  'BTB-BTD': CONTRACTS.BTBBTDPair,
  'BTD-BTB': CONTRACTS.BTBBTDPair,
  'WBTC-USDC': CONTRACTS.WBTCUSDCPair,
  'USDC-WBTC': CONTRACTS.WBTCUSDCPair,
}

// Token address mapping
const TOKEN_ADDRESSES: Record<string, `0x${string}`> = {
  BRS: CONTRACTS.BRS,
  BTD: CONTRACTS.BTD,
  BTB: CONTRACTS.BTB,
  WBTC: CONTRACTS.WBTC,
  USDC: CONTRACTS.USDC,
  USDT: CONTRACTS.USDT,
}

/**
 * Get pair address for two tokens
 */
export function getPairAddress(tokenA: string, tokenB: string): `0x${string}` | null {
  const key = `${tokenA}-${tokenB}`
  return PAIR_ADDRESSES[key] || null
}

/**
 * Get reserves for a pair
 */
export function usePairReserves(pairAddress: `0x${string}` | null) {
  const { data, isLoading, refetch } = useReadContract({
    address: pairAddress || '0x0',
    abi: UniswapV2PairABI,
    functionName: 'getReserves',
    query: {
      enabled: !!pairAddress,
    },
  })

  if (!data || !pairAddress) {
    return {
      reserve0: BigInt(0),
      reserve1: BigInt(0),
      blockTimestampLast: 0,
      isLoading,
      refetch,
    }
  }

  const [reserve0, reserve1, blockTimestampLast] = data as [bigint, bigint, number]

  return {
    reserve0,
    reserve1,
    blockTimestampLast,
    isLoading,
    refetch,
  }
}

/**
 * Get token0 address from pair
 */
export function usePairToken0(pairAddress: `0x${string}` | null) {
  const { data } = useReadContract({
    address: pairAddress || '0x0',
    abi: UniswapV2PairABI,
    functionName: 'token0',
    query: {
      enabled: !!pairAddress,
    },
  })

  return data as `0x${string}` | undefined
}

/**
 * Get token1 address from pair
 */
export function usePairToken1(pairAddress: `0x${string}` | null) {
  const { data } = useReadContract({
    address: pairAddress || '0x0',
    abi: UniswapV2PairABI,
    functionName: 'token1',
    query: {
      enabled: !!pairAddress,
    },
  })

  return data as `0x${string}` | undefined
}

/**
 * Calculate output amount for a swap
 * Uses x * y = k formula
 */
export function calculateAmountOut(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
  fee: number = 30 // 0.3% fee in basis points
): bigint {
  if (amountIn === BigInt(0) || reserveIn === BigInt(0) || reserveOut === BigInt(0)) {
    return BigInt(0)
  }

  const amountInWithFee = amountIn * BigInt(10000 - fee)
  const numerator = amountInWithFee * reserveOut
  const denominator = reserveIn * BigInt(10000) + amountInWithFee

  return numerator / denominator
}

/**
 * Get quote for swapping tokenA to tokenB
 */
export function useSwapQuote(tokenA: string, tokenB: string, amountIn: string) {
  const pairAddress = getPairAddress(tokenA, tokenB)
  const token0 = usePairToken0(pairAddress)
  const { reserve0, reserve1, isLoading } = usePairReserves(pairAddress)

  const tokenAAddress = TOKEN_ADDRESSES[tokenA]

  // Determine if tokenA is token0 or token1
  const isToken0 = token0 && tokenAAddress && token0.toLowerCase() === tokenAAddress.toLowerCase()

  // Get correct reserves based on token order
  const reserveIn = isToken0 ? reserve0 : reserve1
  const reserveOut = isToken0 ? reserve1 : reserve0

  // Calculate output amount
  const decimalsIn = TOKEN_DECIMALS[tokenA as keyof typeof TOKEN_DECIMALS] || 18
  const decimalsOut = TOKEN_DECIMALS[tokenB as keyof typeof TOKEN_DECIMALS] || 18

  let amountOut = '0'
  let priceImpact = '0'

  if (amountIn && parseFloat(amountIn) > 0 && reserveIn > 0 && reserveOut > 0) {
    try {
      const amountInWei = parseUnits(amountIn, decimalsIn)
      const amountOutWei = calculateAmountOut(amountInWei, reserveIn, reserveOut)
      amountOut = formatUnits(amountOutWei, decimalsOut)

      // Calculate price impact: (amountIn / reserveIn) * 100
      const impact = (Number(amountInWei) / Number(reserveIn)) * 100
      priceImpact = impact.toFixed(2)
    } catch (error) {
      logger.error('Error calculating swap quote:', error)
    }
  }

  // Calculate exchange rate
  const exchangeRate =
    reserveIn > 0 && reserveOut > 0 ? (Number(reserveOut) / Number(reserveIn)).toFixed(6) : '0'

  return {
    amountOut,
    priceImpact,
    exchangeRate,
    pairAddress,
    isToken0,
    isLoading,
  }
}

/**
 * Execute a swap
 */
export function useSwap() {
  const { address } = useAccount()
  const { data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const swap = async (
    _tokenIn: string,
    _tokenOut: string,
    _amountIn: string,
    _minAmountOut: string
  ) => {
    if (!address) {
      throw new Error('Wallet not connected')
    }

    // NOTE: This is a placeholder implementation
    // Direct pair swap not fully implemented

    // First, transfer tokens to the pair
    // Note: In production, you should approve the pair first, then transfer
    // For this simplified version, we're assuming tokens are already approved

    // Determine amount0Out and amount1Out based on token order
    // We need to call getReserves to determine token order
    // For now, this is a simplified implementation
    // In production, you'd need to:
    // 1. Check token0/token1 order
    // 2. Transfer input tokens to pair
    // 3. Call swap with correct parameters

    throw new Error('Direct pair swap not fully implemented. Please use a router contract.')
  }

  return {
    swap,
    isPending: isPending || isConfirming,
    isSuccess,
    error,
  }
}

/**
 * Helper hook to check if swap path exists
 */
export function useSwapPathExists(tokenA: string, tokenB: string) {
  const pairAddress = getPairAddress(tokenA, tokenB)
  return {
    exists: !!pairAddress,
    pairAddress,
  }
}

/**
 * Get all available swap pairs for a token
 */
export function useAvailablePairs(token: string) {
  const pairs: string[] = []

  Object.keys(TOKEN_ADDRESSES).forEach(otherToken => {
    if (otherToken !== token && getPairAddress(token, otherToken)) {
      pairs.push(otherToken)
    }
  })

  return { availablePairs: pairs }
}
