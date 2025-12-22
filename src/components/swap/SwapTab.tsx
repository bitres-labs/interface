'use client'

import { useState, useMemo, useEffect } from 'react'
import { ArrowDown } from 'lucide-react'
import { useAccount, useChainId, useWalletClient, usePublicClient } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { parseUnits, formatUnits } from 'viem'
import { ERC20_ABI, UniswapV2Pair_ABI } from '@/abis'
import { NETWORK_CONFIG } from '@/config/contracts'
import { formatSmartNumber } from '@/utils/formatNumber'
import { POOLS, usePairReserves, calculateSwapOutput, useTokenBalance } from '@/hooks/useUniswapV2'
import { blockInvalidNumberInput } from '@/utils/input'
import { logger } from '@/utils/logger'
import { ALL_TOKENS, findPool } from './swapUtils'
import { formatTokenAmount } from '@/utils/format'
import { useWBTCPrice, useBTDPrice, useBTBPrice, useBRSPrice } from '@/hooks/useSystemStats'

/**
 * Swap Tab Component
 */
function SwapTab() {
  const { address: account, isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()

  // Load saved token selections from localStorage
  const [tokenInSymbol, setTokenInSymbol] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('swap_tokenIn') || 'BRS'
    }
    return 'BRS'
  })
  const [tokenOutSymbol, setTokenOutSymbol] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('swap_tokenOut') || 'BTD'
    }
    return 'BTD'
  })
  const [amountIn, setAmountIn] = useState('')

  // Save token selections to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('swap_tokenIn', tokenInSymbol)
      localStorage.setItem('swap_tokenOut', tokenOutSymbol)
    }
  }, [tokenInSymbol, tokenOutSymbol])

  // Find the pool for selected tokens
  const pool = findPool(tokenInSymbol, tokenOutSymbol)

  // Use fallback pool for hooks to maintain consistent call order
  const poolAddress = pool?.address || POOLS[0].address
  const tokenInData = pool
    ? pool.token0.symbol === tokenInSymbol
      ? pool.token0
      : pool.token1
    : POOLS[0].token0
  const tokenOutData = pool
    ? pool.token0.symbol === tokenOutSymbol
      ? pool.token0
      : pool.token1
    : POOLS[0].token1

  // Get reserves - must call hooks before any conditional returns
  const {
    reserve0,
    reserve1,
    refetch: refetchReserves,
  } = usePairReserves(poolAddress as `0x${string}`)

  // Determine which reserve is for which token based on pool's token0/token1
  // pool.token0 corresponds to reserve0, pool.token1 corresponds to reserve1
  const isTokenInToken0 = pool
    ? tokenInData.address.toLowerCase() === pool.token0.address.toLowerCase()
    : true
  const reserveIn = isTokenInToken0 ? reserve0 : reserve1
  const reserveOut = isTokenInToken0 ? reserve1 : reserve0

  // Calculate output
  const amountOut = useMemo(() => {
    return calculateSwapOutput(
      amountIn,
      reserveIn,
      reserveOut,
      tokenInData.decimals,
      tokenOutData.decimals
    )
  }, [amountIn, reserveIn, reserveOut, tokenInData.decimals, tokenOutData.decimals])

  // Get token balances
  const { formatted: tokenInBalance, refetch: refetchTokenInBalance } = useTokenBalance(
    tokenInData.address as `0x${string}`,
    tokenInData.decimals
  )
  const { formatted: tokenOutBalance, refetch: refetchTokenOutBalance } = useTokenBalance(
    tokenOutData.address as `0x${string}`,
    tokenOutData.decimals
  )

  const chainId = useChainId()
  const wrongNetwork = chainId !== undefined && chainId !== NETWORK_CONFIG.chainId
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  const [isSwapping, setIsSwapping] = useState(false)

  // Token prices for USD value calculation
  const { wbtcPrice } = useWBTCPrice()
  const { btdPrice } = useBTDPrice()
  const { btbPrice } = useBTBPrice()
  const { brsPrice } = useBRSPrice()

  // Calculate USD value for any token amount
  const calculateTokenUSDValue = (amount: string, symbol: string) => {
    const amt = Number(amount)
    if (!amt || !Number.isFinite(amt)) return 0

    const upperSymbol = symbol.toUpperCase()
    switch (upperSymbol) {
      case 'BRS':
        return amt * brsPrice
      case 'BTD':
        return amt * btdPrice
      case 'BTB':
        return amt * btbPrice
      case 'WBTC':
        return amt * wbtcPrice
      case 'USDC':
      case 'USDT':
        return amt * 1.0 // Stablecoins
      default:
        return 0
    }
  }

  const handleSwitch = () => {
    const temp = tokenInSymbol
    setTokenInSymbol(tokenOutSymbol)
    setTokenOutSymbol(temp)
    setAmountIn('')
  }

  const handleMax = () => {
    setAmountIn(tokenInBalance)
  }

  const handleTokenInChange = (symbol: string) => {
    if (symbol === tokenOutSymbol) {
      // Swap them
      setTokenOutSymbol(tokenInSymbol)
    }
    setTokenInSymbol(symbol)
    setAmountIn('')
  }

  const handleTokenOutChange = (symbol: string) => {
    if (symbol === tokenInSymbol) {
      // Swap them
      setTokenInSymbol(tokenOutSymbol)
    }
    setTokenOutSymbol(symbol)
  }

  const handleSwap = async () => {
    if (!isConnected) {
      openConnectModal?.()
      return
    }

    if (!pool) {
      alert('The selected trading pair does not exist, please choose an existing pool')
      return
    }

    if (!walletClient || !publicClient || !account) {
      alert('Wallet not ready, please try again later')
      return
    }

    if (wrongNetwork) {
      alert('Please switch wallet network to Hardhat Local (31337)')
      return
    }

    if (!amountIn || Number(amountIn) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    if (!amountOut || Number(amountOut) <= 0) {
      alert('Quote unavailable, unable to execute swap')
      return
    }

    try {
      setIsSwapping(true)
      const amountInWei = parseUnits(amountIn, tokenInData.decimals)
      const minAmountOut = amountOut && Number(amountOut) > 0 ? amountOut : '0'
      const minAmountOutWei = parseUnits(minAmountOut, tokenOutData.decimals)

      const transferHash = await walletClient.writeContract({
        account,
        address: tokenInData.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [pool.address as `0x${string}`, amountInWei],
      })
      await publicClient.waitForTransactionReceipt({ hash: transferHash })

      const tokenInIsToken0 =
        pool.token0.address.toLowerCase() === tokenInData.address.toLowerCase()
      const amount0Out = tokenInIsToken0 ? 0n : minAmountOutWei
      const amount1Out = tokenInIsToken0 ? minAmountOutWei : 0n

      const swapHash = await walletClient.writeContract({
        account,
        address: pool.address as `0x${string}`,
        abi: UniswapV2Pair_ABI,
        functionName: 'swap',
        args: [amount0Out, amount1Out, account, '0x'],
      })
      await publicClient.waitForTransactionReceipt({ hash: swapHash })

      alert(
        `✅ Successfully swapped ${amountIn} ${tokenInSymbol} for ${minAmountOut} ${tokenOutSymbol}!`
      )
      setAmountIn('')
      refetchReserves()
      refetchTokenInBalance()
      refetchTokenOutBalance()
    } catch (error) {
      logger.error('Swap error:', error)
      alert(`Swap failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSwapping(false)
    }
  }

  const exchangeRate = useMemo(() => {
    if (!pool) return 'No pool available'
    if (reserveIn === 0n || reserveOut === 0n) return 'Loading...'
    const rate =
      Number(formatUnits(reserveOut, tokenOutData.decimals)) /
      Number(formatUnits(reserveIn, tokenInData.decimals))
    return `1 ${tokenInSymbol} ≈ ${formatSmartNumber(rate)} ${tokenOutSymbol}`
  }, [pool, reserveIn, reserveOut, tokenInSymbol, tokenOutSymbol, tokenInData, tokenOutData])

  // Balance validation
  const hasInsufficientBalance = useMemo(() => {
    if (!amountIn || Number(amountIn) <= 0) return false
    try {
      const amt = Number(amountIn)
      const bal = Number(tokenInBalance || '0')
      return amt > bal
    } catch {
      return false
    }
  }, [amountIn, tokenInBalance])

  const hasPool = !!pool

  return (
    <div className="space-y-0">
      {/* From Input */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-1 min-h-[100px]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">From</span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Balance: {formatTokenAmount(Number(tokenInBalance), tokenInSymbol)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <div className="flex-1 min-w-0">
            <input
              type="number"
              min="0"
              step="any"
              value={amountIn}
              onKeyDown={blockInvalidNumberInput}
              onChange={e => {
                const value = e.target.value
                if (!value || Number(value) >= 0) setAmountIn(value)
              }}
              placeholder="0.0"
              className="w-full bg-transparent text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white outline-none"
            />
            {/* USD value display */}
            {amountIn && Number(amountIn) > 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                ≈ ${calculateTokenUSDValue(amountIn, tokenInSymbol).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </div>
            )}
          </div>
          <button
            onClick={handleMax}
            className="px-2 py-1 text-xs sm:text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/20 rounded-lg transition-colors flex-shrink-0"
          >
            MAX
          </button>
          <select
            value={tokenInSymbol}
            onChange={e => handleTokenInChange(e.target.value)}
            className="px-2 py-2 sm:px-3 sm:py-2 bg-white dark:bg-gray-800 rounded-lg text-sm sm:text-base font-medium text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 outline-none cursor-pointer hover:border-primary-500 transition-colors flex-shrink-0 min-h-[2.25rem] sm:min-h-0"
          >
            {ALL_TOKENS.map(token => (
              <option key={token.symbol} value={token.symbol}>
                {token.symbol}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Arrow */}
      <div className="flex justify-center -my-4 relative z-10">
        <button
          onClick={handleSwitch}
          className="w-10 h-10 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-4 border-gray-50 dark:border-gray-900 rounded-full flex items-center justify-center transition-colors cursor-pointer shadow-md"
        >
          <ArrowDown className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
      </div>

      {/* To Output */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mt-1 min-h-[100px]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">To (estimated)</span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Balance: {formatTokenAmount(Number(tokenOutBalance), tokenOutSymbol)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
              {amountOut || '0.0'}
            </div>
            {/* USD value display */}
            {amountOut && Number(amountOut) > 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                ≈ ${calculateTokenUSDValue(amountOut, tokenOutSymbol).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </div>
            )}
          </div>
          <select
            value={tokenOutSymbol}
            onChange={e => handleTokenOutChange(e.target.value)}
            className="px-2 py-2 sm:px-3 sm:py-2 bg-white dark:bg-gray-800 rounded-lg text-sm sm:text-base font-medium text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 outline-none cursor-pointer hover:border-primary-500 transition-colors flex-shrink-0 min-h-[2.25rem] sm:min-h-0"
          >
            {ALL_TOKENS.map(token => (
              <option key={token.symbol} value={token.symbol}>
                {token.symbol}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-2 text-sm bg-gray-50 dark:bg-gray-800/60 rounded-lg p-4 mt-4">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Exchange Rate</span>
          <span className="font-medium text-gray-900 dark:text-white">{exchangeRate}</span>
        </div>
        {hasPool && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Fee</span>
              <span className="font-medium text-gray-900 dark:text-white">0.3%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Reserves</span>
              <span className="font-medium text-gray-900 dark:text-white text-xs">
                {formatUnits(reserve0, pool.token0.decimals)} /{' '}
                {formatUnits(reserve1, pool.token1.decimals)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Button */}
      <div>
        {!hasPool ? (
          <button
            disabled
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            No Pool for {tokenInSymbol}/{tokenOutSymbol}
          </button>
        ) : (
          <button
            onClick={handleSwap}
            disabled={isSwapping || hasInsufficientBalance || !amountIn || Number(amountIn) <= 0}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {!isConnected
              ? 'Connect Wallet'
              : wrongNetwork
                ? 'Switch Network'
                : hasInsufficientBalance
                  ? `Insufficient ${tokenInSymbol} Balance`
                  : isSwapping
                    ? 'Swapping...'
                    : 'Swap'}
          </button>
        )}
      </div>

      {!isConnected && hasPool && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Connect your wallet to swap tokens
        </p>
      )}
    </div>
  )
}

/**
 * Add Liquidity Tab Component
 */

export default SwapTab
