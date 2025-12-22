'use client'

import { useState, useMemo, useEffect } from 'react'
import { Plus, AlertCircle } from 'lucide-react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { parseUnits, formatUnits } from 'viem'
import { ERC20_ABI, UniswapV2Pair_ABI } from '@/abis'
import { POOLS, usePairReserves, useTokenBalance } from '@/hooks/useUniswapV2'
import { blockInvalidNumberInput } from '@/utils/input'
import { logger } from '@/utils/logger'

export interface AddLiquidityTabProps {
  selectedPool: number
  setSelectedPool: (pool: number) => void
}

/**
 * Add Liquidity Tab Component
 */
function AddLiquidityTab({
  selectedPool,
  setSelectedPool,
}: {
  selectedPool: number
  setSelectedPool: (pool: number) => void
}) {
  const { address: account, isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const [amount0, setAmount0] = useState('')
  const [amount1, setAmount1] = useState('')
  const [addingStep, setAddingStep] = useState(0) // 0: idle, 1: transfer0, 2: transfer1, 3: mint
  const [amount0Wei, setAmount0Wei] = useState<bigint>(0n)
  const [amount1Wei, setAmount1Wei] = useState<bigint>(0n)

  const pool = POOLS[selectedPool]

  // Get reserves for ratio calculation (must be before any early returns)
  const {
    reserve0,
    reserve1,
    refetch: refetchReserves,
  } = usePairReserves(pool?.address || ('0x0' as `0x${string}`))

  // Get token balances (must be before any early returns)
  const { formatted: balance0, refetch: refetchBalance0 } = useTokenBalance(
    (pool?.token0.address as `0x${string}`) || ('0x0' as `0x${string}`),
    pool?.token0.decimals || 18
  )
  const { formatted: balance1, refetch: refetchBalance1 } = useTokenBalance(
    (pool?.token1.address as `0x${string}`) || ('0x0' as `0x${string}`),
    pool?.token1.decimals || 18
  )

  // Safety check (after all hooks)
  if (!pool) {
    return <div className="text-red-600">Error: Invalid pool selected</div>
  }

  // Auto-calculate second amount based on ratio
  const handleAmount0Change = (value: string) => {
    setAmount0(value)
    if (value && reserve0 > 0n && reserve1 > 0n) {
      const ratio =
        Number(formatUnits(reserve1, pool.token1.decimals)) /
        Number(formatUnits(reserve0, pool.token0.decimals))
      setAmount1(
        (Number(value) * ratio).toFixed(pool.token1.decimals === 18 ? 6 : pool.token1.decimals)
      )
    }
  }

  const handleAmount1Change = (value: string) => {
    setAmount1(value)
    if (value && reserve0 > 0n && reserve1 > 0n) {
      const ratio =
        Number(formatUnits(reserve0, pool.token0.decimals)) /
        Number(formatUnits(reserve1, pool.token1.decimals))
      setAmount0(
        (Number(value) * ratio).toFixed(pool.token0.decimals === 18 ? 6 : pool.token0.decimals)
      )
    }
  }

  // Approval and add liquidity
  const { writeContract, data: hash } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({ hash })

  // Handle multi-step transaction flow
  useEffect(() => {
    if (!isSuccess || !account) return

    if (addingStep === 1) {
      // Step 1 completed (token0 transferred), now transfer token1
      logger.log(
        'Step 1 completed. Step 2: Transferring',
        amount1,
        pool.token1.symbol,
        'to pair...'
      )
      setAddingStep(2)
      writeContract({
        address: pool.token1.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [pool.address, amount1Wei],
      })
    } else if (addingStep === 2) {
      // Step 2 completed (token1 transferred), now mint LP tokens
      logger.log('Step 2 completed. Step 3: Minting LP tokens...')
      setAddingStep(3)
      writeContract({
        address: pool.address,
        abi: UniswapV2Pair_ABI,
        functionName: 'mint',
        args: [account],
      })
    } else if (addingStep === 3) {
      // Step 3 completed (LP minted), done!
      logger.log('Step 3 completed. Liquidity added successfully!')
      logger.log(
        `✅ Successfully added liquidity! ${amount0} ${pool.token0.symbol} + ${amount1} ${pool.token1.symbol} to ${pool.name} pool`
      )
      // TODO: Replace with toast notification
      setAmount0('')
      setAmount1('')
      setAddingStep(0)
      refetchReserves()
      refetchBalance0()
      refetchBalance1()
    }
  }, [
    isSuccess,
    addingStep,
    account,
    pool,
    amount0,
    amount1,
    amount0Wei,
    amount1Wei,
    writeContract,
    refetchReserves,
    refetchBalance0,
    refetchBalance1,
  ])

  const handleAddLiquidity = () => {
    if (!isConnected || !account) {
      openConnectModal?.()
      return
    }

    if (!amount0 || !amount1 || Number(amount0) <= 0 || Number(amount1) <= 0) {
      logger.warn('Please enter valid amounts')
      return
    }

    try {
      const amt0Wei = parseUnits(amount0, pool.token0.decimals)
      const amt1Wei = parseUnits(amount1, pool.token1.decimals)

      setAmount0Wei(amt0Wei)
      setAmount1Wei(amt1Wei)
      setAddingStep(1)

      // Step 1: Transfer token0 to pair
      logger.log('Step 1: Transferring', amount0, pool.token0.symbol, 'to pair...')
      writeContract({
        address: pool.token0.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [pool.address, amt0Wei],
      })
    } catch (error) {
      logger.error('Add liquidity error:', error)
      alert(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setAddingStep(0)
    }
  }

  const currentRatio = useMemo(() => {
    if (reserve0 === 0n || reserve1 === 0n) return 'Pool not initialized'
    const ratio =
      Number(formatUnits(reserve1, pool.token1.decimals)) /
      Number(formatUnits(reserve0, pool.token0.decimals))
    return `1 ${pool.token0.symbol} = ${ratio.toFixed(6)} ${pool.token1.symbol}`
  }, [reserve0, reserve1, pool])

  // Balance validation
  const hasInsufficientBalance = useMemo(() => {
    if (!amount0 || !amount1 || Number(amount0) <= 0 || Number(amount1) <= 0) {
      return false
    }
    try {
      const amt0 = Number(amount0)
      const amt1 = Number(amount1)
      const bal0 = Number(balance0 || '0')
      const bal1 = Number(balance1 || '0')
      return amt0 > bal0 || amt1 > bal1
    } catch {
      return false
    }
  }, [amount0, amount1, balance0, balance1])

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
            setAmount0('')
            setAmount1('')
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

      <div className="p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg flex gap-2 text-sm">
        <AlertCircle className="w-4 h-4 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
        <div className="text-primary-800 dark:text-primary-300">
          Add liquidity in the correct ratio to avoid price impact. Current ratio: {currentRatio}
        </div>
      </div>

      {/* Token Inputs */}
      <div className="space-y-0">
        {/* Token 0 Input */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-1 min-h-[100px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">{pool.token0.symbol}</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">Balance: {balance0}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <input
              type="number"
              min="0"
              step="any"
              value={amount0}
              onKeyDown={blockInvalidNumberInput}
              onChange={e => {
                const value = e.target.value
                if (!value || Number(value) >= 0) handleAmount0Change(value)
              }}
              placeholder="0.0"
              className="flex-1 min-w-0 bg-transparent text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white outline-none"
            />
            <button
              onClick={() => setAmount0(balance0)}
              className="px-2 py-1 text-xs sm:text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/20 rounded-lg transition-colors flex-shrink-0"
            >
              MAX
            </button>
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

        {/* Token 1 Input */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mt-1 min-h-[100px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">{pool.token1.symbol}</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">Balance: {balance1}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <input
              type="number"
              min="0"
              step="any"
              value={amount1}
              onKeyDown={blockInvalidNumberInput}
              onChange={e => {
                const value = e.target.value
                if (!value || Number(value) >= 0) handleAmount1Change(value)
              }}
              placeholder="0.0"
              className="flex-1 min-w-0 bg-transparent text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white outline-none"
            />
            <button
              onClick={() => setAmount1(balance1)}
              className="px-2 py-1 text-xs sm:text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/20 rounded-lg transition-colors flex-shrink-0"
            >
              MAX
            </button>
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

      {/* Info */}
      <div className="space-y-2 text-sm bg-gray-50 dark:bg-gray-800/60 rounded-lg p-4">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Pool</span>
          <span className="font-medium text-gray-900 dark:text-white">{pool.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Share of Pool</span>
          <span className="font-medium text-gray-900 dark:text-white">~0.00%</span>
        </div>
      </div>

      {/* Button */}
      <button
        onClick={handleAddLiquidity}
        disabled={!isConnected || hasInsufficientBalance || addingStep > 0 || !amount0 || !amount1}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {!isConnected
          ? 'Connect Wallet'
          : hasInsufficientBalance
            ? 'Insufficient Balance'
            : addingStep === 1
              ? `Transferring ${pool.token0.symbol}...`
              : addingStep === 2
                ? `Transferring ${pool.token1.symbol}...`
                : addingStep === 3
                  ? 'Minting LP...'
                  : 'Add Liquidity'}
      </button>
    </div>
  )
}

/**
 * Remove Liquidity Tab Component
 */

export default AddLiquidityTab
