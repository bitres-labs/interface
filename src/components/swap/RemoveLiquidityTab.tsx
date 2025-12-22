'use client'

import { useState, useMemo, useEffect } from 'react'
import { ArrowDown, Plus } from 'lucide-react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { parseUnits, formatUnits } from 'viem'
import { ERC20_ABI, UniswapV2Pair_ABI } from '@/abis'
import { formatSmartNumber } from '@/utils/formatNumber'
import {
  POOLS,
  usePairReserves,
  useLPBalance,
  useLPTotalSupply,
  useTokenBalance,
} from '@/hooks/useUniswapV2'
import { logger } from '@/utils/logger'

export interface RemoveLiquidityTabProps {
  selectedPool: number
  setSelectedPool: (pool: number) => void
}

/**
 * Remove Liquidity Tab Component
 */
function RemoveLiquidityTab({
  selectedPool,
  setSelectedPool,
}: {
  selectedPool: number
  setSelectedPool: (pool: number) => void
}) {
  const { address: account, isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const [percentage, setPercentage] = useState(25)
  const [lpAmount, setLpAmount] = useState('')
  const [removingStep, setRemovingStep] = useState(0) // 0: idle, 1: transfer, 2: burn

  const pool = POOLS[selectedPool]

  // Get LP balance (must be before any early returns)
  const lpBalanceResult = useLPBalance(pool?.address || ('0x0' as `0x${string}`))
  const totalSupplyResult = useLPTotalSupply(pool?.address || ('0x0' as `0x${string}`))
  const reservesResult = usePairReserves(pool?.address || ('0x0' as `0x${string}`))

  const lpBalance = lpBalanceResult.formatted || '0'
  const lpBalanceWei = lpBalanceResult.balance || 0n
  const refetchLPBalance = lpBalanceResult.refetch
  const totalSupply = totalSupplyResult.formatted || '0'
  const reserve0 = reservesResult.reserve0 || 0n
  const reserve1 = reservesResult.reserve1 || 0n
  const refetchReserves = reservesResult.refetch

  // Get token balances (must be before any early returns)
  const { refetch: refetchBalance0 } = useTokenBalance(
    (pool?.token0.address as `0x${string}`) || ('0x0' as `0x${string}`),
    pool?.token0.decimals || 18
  )
  const { refetch: refetchBalance1 } = useTokenBalance(
    (pool?.token1.address as `0x${string}`) || ('0x0' as `0x${string}`),
    pool?.token1.decimals || 18
  )

  // Safety checks (after all hooks)
  if (!pool) {
    return <div className="text-red-600">Error: Invalid pool selected (index: {selectedPool})</div>
  }

  if (!pool.address) {
    return <div className="text-red-600">Error: Pool address not configured for {pool.name}</div>
  }

  // Calculate amounts to receive
  const token0Decimals = pool?.token0?.decimals || 18
  const token1Decimals = pool?.token1?.decimals || 18

  const { amount0Out, amount1Out } = useMemo(() => {
    if (!lpAmount || Number(lpAmount) <= 0 || !pool || !pool.token0 || !pool.token1) {
      return { amount0Out: '0', amount1Out: '0' }
    }

    try {
      const lpWei = parseUnits(lpAmount, 18)
      const totalSupplyWei = parseUnits(totalSupply || '0', 18)

      if (lpWei === 0n || totalSupplyWei === 0n) {
        return { amount0Out: '0', amount1Out: '0' }
      }

      // Calculate token amounts - ensure we don't lose precision
      const amount0Wei = (lpWei * reserve0) / totalSupplyWei
      const amount1Wei = (lpWei * reserve1) / totalSupplyWei

      const out0 = formatUnits(amount0Wei, token0Decimals)
      const out1 = formatUnits(amount1Wei, token1Decimals)

      logger.log('Remove liquidity calculation:', {
        lpAmount,
        lpWei: lpWei.toString(),
        totalSupply,
        totalSupplyWei: totalSupplyWei.toString(),
        reserve0: reserve0.toString(),
        reserve1: reserve1.toString(),
        amount0Wei: amount0Wei.toString(),
        amount1Wei: amount1Wei.toString(),
        out0,
        out1,
      })

      return {
        amount0Out: out0,
        amount1Out: out1,
      }
    } catch (error) {
      logger.error('Error calculating remove amounts:', error)
      return { amount0Out: '0', amount1Out: '0' }
    }
  }, [lpAmount, totalSupply, reserve0, reserve1, token0Decimals, token1Decimals])

  // Balance validation
  const hasInsufficientLPBalance = useMemo(() => {
    if (!lpAmount || Number(lpAmount) <= 0) return false
    try {
      const amt = Number(lpAmount)
      const bal = Number(lpBalance || '0')
      return amt > bal
    } catch {
      return false
    }
  }, [lpAmount, lpBalance])

  // Update LP amount when percentage changes
  useEffect(() => {
    if (lpBalanceWei > 0n) {
      // Use BigInt math to preserve precision
      const amountWei = (lpBalanceWei * BigInt(percentage)) / 100n
      const amount = formatUnits(amountWei, 18)
      setLpAmount(amount)
    } else {
      setLpAmount('0')
    }
  }, [percentage, lpBalanceWei])

  const { writeContract, data: hash } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({ hash })

  useEffect(() => {
    if (!isSuccess || !account) return

    if (removingStep === 1) {
      setRemovingStep(2)
      writeContract({
        address: pool.address,
        abi: UniswapV2Pair_ABI,
        functionName: 'burn',
        args: [account],
      })
    } else if (removingStep === 2) {
      logger.log(
        `✅ Removed liquidity from ${pool.name} pool! You should receive ${amount0Out} ${pool.token0.symbol} + ${amount1Out} ${pool.token1.symbol}`
      )
      // TODO: Replace with toast notification
      setRemovingStep(0)
      setLpAmount('')
      setPercentage(25)
      refetchLPBalance()
      refetchReserves()
      refetchBalance0()
      refetchBalance1()
    }
  }, [
    isSuccess,
    removingStep,
    account,
    pool,
    amount0Out,
    amount1Out,
    writeContract,
    refetchLPBalance,
    refetchReserves,
    refetchBalance0,
    refetchBalance1,
  ])

  const handleRemoveLiquidity = async () => {
    if (!isConnected || !account) {
      openConnectModal?.()
      return
    }

    if (!lpAmount || Number(lpAmount) <= 0) {
      logger.warn('Please enter a valid amount')
      return
    }

    try {
      const lpAmountWei = parseUnits(lpAmount, 18)
      setRemovingStep(1)
      writeContract({
        address: pool.address,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [pool.address, lpAmountWei],
      })
    } catch (error) {
      logger.error('Remove liquidity error:', error)
      logger.error(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setRemovingStep(0)
    }
  }

  return (
    <div className="space-y-4">
      {/* Pool Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Pool
        </label>
        <select
          value={selectedPool}
          onChange={e => {
            setSelectedPool(Number(e.target.value))
            setLpAmount('')
            setPercentage(25)
          }}
          className="input-field"
        >
          {POOLS.map((p, idx) => (
            <option key={idx} value={idx}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* LP Balance */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-lg">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          Your LP Tokens ({pool.name})
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {formatSmartNumber(lpBalance)}{' '}
          <span className="text-lg font-normal text-gray-500">LP</span>
        </div>
      </div>

      {/* Percentage Selector */}
      <div>
        <label className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3 block">
          Amount to Remove
        </label>
        <div className="flex gap-2 mb-4">
          {[25, 50, 75, 100].map(pct => (
            <button
              key={pct}
              onClick={() => setPercentage(pct)}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                percentage === pct
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {pct}%
            </button>
          ))}
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={percentage}
          onChange={e => setPercentage(Number(e.target.value))}
          className="w-full"
        />
        <div className="text-center mt-2 text-lg font-semibold text-gray-900 dark:text-white">
          {percentage}%
        </div>
      </div>

      {/* LP Amount and Expected Output */}
      <div className="space-y-0">
        {/* LP Amount Input */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-1 min-h-[100px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">LP Tokens to Remove</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">{percentage}% selected</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <div className="flex-1 text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
              {formatSmartNumber(lpAmount || '0')}
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex-shrink-0 min-h-[2.25rem] sm:min-h-0">
              <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                {pool.name} LP
              </span>
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center -my-4 relative z-10">
          <div className="w-10 h-10 bg-white dark:bg-gray-800 border-4 border-gray-50 dark:border-gray-900 rounded-full flex items-center justify-center shadow-md">
            <ArrowDown className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </div>
        </div>

        {/* Expected Output - Token 0 */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mt-1 mb-1 min-h-[100px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">You will receive</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <div className="flex-1 text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
              {formatSmartNumber(amount0Out)}
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex-shrink-0 min-h-[2.25rem] sm:min-h-0">
              {pool.token0.symbol === 'WBTC' ? (
                <img src="/tokens/wbtc.png" alt="WBTC" className="w-5 h-5 rounded-full" />
              ) : pool.token0.symbol === 'BTD' ? (
                <div className="w-5 h-5 bg-btd-DEFAULT rounded-full" />
              ) : pool.token0.symbol === 'BTB' ? (
                <div className="w-5 h-5 bg-btb-DEFAULT rounded-full" />
              ) : pool.token0.symbol === 'BRS' ? (
                <div className="w-5 h-5 bg-brs-DEFAULT rounded-full" />
              ) : (
                <div className="w-5 h-5 bg-gray-400 rounded-full" />
              )}
              <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                {pool.token0.symbol}
              </span>
            </div>
          </div>
        </div>

        {/* Plus Icon */}
        <div className="flex justify-center -my-4 relative z-10">
          <div className="w-10 h-10 bg-white dark:bg-gray-800 border-4 border-gray-50 dark:border-gray-900 rounded-full flex items-center justify-center shadow-md">
            <Plus className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </div>
        </div>

        {/* Expected Output - Token 1 */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mt-1 min-h-[100px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">&nbsp;</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <div className="flex-1 text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
              {formatSmartNumber(amount1Out)}
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex-shrink-0 min-h-[2.25rem] sm:min-h-0">
              {pool.token1.symbol === 'WBTC' ? (
                <img src="/tokens/wbtc.png" alt="WBTC" className="w-5 h-5 rounded-full" />
              ) : pool.token1.symbol === 'BTD' ? (
                <div className="w-5 h-5 bg-btd-DEFAULT rounded-full" />
              ) : pool.token1.symbol === 'BTB' ? (
                <div className="w-5 h-5 bg-btb-DEFAULT rounded-full" />
              ) : pool.token1.symbol === 'BRS' ? (
                <div className="w-5 h-5 bg-brs-DEFAULT rounded-full" />
              ) : pool.token1.symbol === 'USDT' ? (
                <img src="/tokens/usdt.png" alt="USDT" className="w-5 h-5 rounded-full" />
              ) : (
                <div className="w-5 h-5 bg-gray-400 rounded-full" />
              )}
              <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                {pool.token1.symbol}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Button */}
      <button
        onClick={handleRemoveLiquidity}
        disabled={
          !isConnected ||
          hasInsufficientLPBalance ||
          removingStep > 0 ||
          !lpAmount ||
          Number(lpAmount) <= 0
        }
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {!isConnected
          ? 'Connect Wallet'
          : hasInsufficientLPBalance
            ? 'Insufficient LP Balance'
            : removingStep === 1
              ? 'Transferring LP tokens...'
              : removingStep === 2
                ? 'Burning LP tokens...'
                : 'Remove Liquidity'}
      </button>
    </div>
  )
}

export default RemoveLiquidityTab
