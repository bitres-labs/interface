'use client'
import { logger } from '@/utils/logger'

import { useState, useMemo, useEffect } from 'react'
import { Droplets, Plus, Minus, Info } from 'lucide-react'
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
  useWalletClient,
} from 'wagmi'
import { formatUnits, parseUnits } from 'viem'
import { POOLS, useTokenBalance } from '@/hooks/useUniswapV2'
import { ERC20_ABI, UniswapV2Pair_ABI } from '@/abis'
import { useApproveAndExecute } from '@/hooks/useApproveAndExecute'
import { blockInvalidNumberInput } from '@/utils/input'
import { useLiquidityPools } from '@/hooks/useLiquidityPools'

// Convert POOLS to LIQUIDITY_POOLS format
const LIQUIDITY_POOLS = POOLS.map(pool => ({
  id: pool.name.toLowerCase().replace('/', '-'),
  name: pool.name,
  token0: pool.token0.symbol,
  token1: pool.token1.symbol,
  pairAddress: pool.address,
  token0Color:
    pool.token0.symbol === 'BRS'
      ? 'text-brs'
      : pool.token0.symbol === 'BTD'
        ? 'text-btd'
        : pool.token0.symbol === 'BTB'
          ? 'text-btb'
          : pool.token0.symbol === 'WBTC'
            ? 'text-primary-600'
            : 'text-gray-600',
  token1Color:
    pool.token1.symbol === 'BRS'
      ? 'text-brs'
      : pool.token1.symbol === 'BTD'
        ? 'text-btd'
        : pool.token1.symbol === 'BTB'
          ? 'text-btb'
          : pool.token1.symbol === 'WBTC'
            ? 'text-primary-600'
            : pool.token1.symbol === 'USDC'
              ? 'text-green-600'
              : 'text-gray-600',
}))

// PoolCard component with hooks
function PoolCard({
  pool,
  poolConfig,
  poolData,
  selectedPool,
  setSelectedPool,
  refetchPools,
}: any) {
  const { address: account, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const [actionMode, setActionMode] = useState<'add' | 'remove'>('add')
  const [amount0, setAmount0] = useState('')
  const [amount1, setAmount1] = useState('')
  const [lpAmount, setLpAmount] = useState('')
  const [percentage, setPercentage] = useState(25)
  const [addingStep, setAddingStep] = useState(0) // 0: idle, 1: transfer0, 2: transfer1, 3: mint
  const [amount1Wei, setAmount1Wei] = useState<bigint>(0n)

  // Use pool data from useLiquidityPools hook
  const reserve0 = poolData.reserves.reserve0
  const reserve1 = poolData.reserves.reserve1
  const lpBalance = poolData.lpBalanceRaw
  const lpFormatted = poolData.lpBalanceFormatted
  const lpTotalSupply = poolData.totalSupply.raw

  // Get token balances
  const { formatted: balance0, refetch: refetchBalance0 } = useTokenBalance(
    poolConfig.token0.address as `0x${string}`,
    poolConfig.token0.decimals
  )
  const { formatted: balance1, refetch: refetchBalance1 } = useTokenBalance(
    poolConfig.token1.address as `0x${string}`,
    poolConfig.token1.decimals
  )

  // Calculate TVL and pool share
  const reserve0Formatted = Number(formatUnits(reserve0, poolConfig.token0.decimals))
  const reserve1Formatted = Number(formatUnits(reserve1, poolConfig.token1.decimals))
  const tvl = reserve0Formatted + reserve1Formatted

  const poolShare = lpTotalSupply > 0n ? (Number(lpBalance) / Number(lpTotalSupply)) * 100 : 0

  // Auto-calculate amounts based on ratio
  const handleAmount0Change = (value: string) => {
    setAmount0(value)
    if (value && reserve0 > 0n && reserve1 > 0n) {
      const ratio =
        Number(formatUnits(reserve1, poolConfig.token1.decimals)) /
        Number(formatUnits(reserve0, poolConfig.token0.decimals))
      setAmount1(
        (Number(value) * ratio).toFixed(
          poolConfig.token1.decimals === 18 ? 6 : poolConfig.token1.decimals
        )
      )
    }
  }

  const handleAmount1Change = (value: string) => {
    setAmount1(value)
    if (value && reserve0 > 0n && reserve1 > 0n) {
      const ratio =
        Number(formatUnits(reserve0, poolConfig.token0.decimals)) /
        Number(formatUnits(reserve1, poolConfig.token1.decimals))
      setAmount0(
        (Number(value) * ratio).toFixed(
          poolConfig.token0.decimals === 18 ? 6 : poolConfig.token0.decimals
        )
      )
    }
  }

  // Calculate amounts to receive when removing
  const { amount0Out, amount1Out } = useMemo(() => {
    if (!lpAmount || Number(lpAmount) <= 0) {
      return { amount0Out: '0', amount1Out: '0' }
    }
    try {
      const lpWei = parseUnits(lpAmount, 18)
      const totalSupplyWei = parseUnits(lpFormatted || '0', 18)
      if (lpWei === 0n || totalSupplyWei === 0n) {
        return { amount0Out: '0', amount1Out: '0' }
      }
      const amount0Wei = (lpWei * reserve0) / totalSupplyWei
      const amount1Wei = (lpWei * reserve1) / totalSupplyWei
      return {
        amount0Out: formatUnits(amount0Wei, poolConfig.token0.decimals),
        amount1Out: formatUnits(amount1Wei, poolConfig.token1.decimals),
      }
    } catch {
      return { amount0Out: '0', amount1Out: '0' }
    }
  }, [lpAmount, lpFormatted, reserve0, reserve1, poolConfig])

  // Balance validation for add liquidity
  const hasInsufficientBalanceForAdd = useMemo(() => {
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

  // Balance validation for remove liquidity
  const hasInsufficientLPBalance = useMemo(() => {
    if (!lpAmount || Number(lpAmount) <= 0) {
      return false
    }
    try {
      const amt = Number(lpAmount)
      const bal = Number(lpFormatted || '0')
      return amt > bal
    } catch {
      return false
    }
  }, [lpAmount, lpFormatted])

  // Update LP amount when percentage changes
  useEffect(() => {
    if (lpBalance > 0n) {
      const amountWei = (lpBalance * BigInt(percentage)) / 100n
      setLpAmount(formatUnits(amountWei, 18))
    } else {
      setLpAmount('0')
    }
  }, [percentage, lpBalance])

  // For add liquidity transactions
  const { writeContract: writeAdd, data: hashAdd } = useWriteContract()
  const { isSuccess: isSuccessAdd } = useWaitForTransactionReceipt({ hash: hashAdd })

  useEffect(() => {
    if (!isSuccessAdd || !account) return
    if (addingStep === 1) {
      setAddingStep(2)
      writeAdd({
        address: poolConfig.token1.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [pool.pairAddress, amount1Wei],
      })
    } else if (addingStep === 2) {
      setAddingStep(3)
      writeAdd({
        address: pool.pairAddress,
        abi: UniswapV2Pair_ABI,
        functionName: 'mint',
        args: [account],
      })
    } else if (addingStep === 3) {
      alert(
        `✅ Successfully added ${amount0} ${poolConfig.token0.symbol} + ${amount1} ${poolConfig.token1.symbol}!`
      )
      setAmount0('')
      setAmount1('')
      setAddingStep(0)
      refetchPools()
      refetchBalance0()
      refetchBalance1()
    }
  }, [isSuccessAdd, addingStep])

  // Unified approve+execute hook for remove liquidity
  const { approveAndExecute, isProcessing } = useApproveAndExecute()

  const handleAddLiquidity = () => {
    if (!isConnected || !account) {
      alert('Please connect wallet first')
      return
    }
    if (!amount0 || !amount1 || Number(amount0) <= 0 || Number(amount1) <= 0) {
      alert('Please enter valid amounts')
      return
    }
    try {
      const amt0Wei = parseUnits(amount0, poolConfig.token0.decimals)
      const amt1Wei = parseUnits(amount1, poolConfig.token1.decimals)
      setAmount1Wei(amt1Wei)
      setAddingStep(1)
      writeAdd({
        address: poolConfig.token0.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [pool.pairAddress, amt0Wei],
      })
    } catch (error) {
      logger.error('Add liquidity error:', error)
      alert(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setAddingStep(0)
    }
  }

  const handleRemoveLiquidity = async () => {
    if (!isConnected || !account || !walletClient || !publicClient) {
      alert('Please connect wallet first')
      return
    }
    if (!lpAmount || Number(lpAmount) <= 0) {
      alert('Please enter valid LP amount')
      return
    }
    try {
      await approveAndExecute({
        tokenAddress: pool.pairAddress as `0x${string}`,
        spenderAddress: pool.pairAddress as `0x${string}`,
        amount: lpAmount,
        decimals: 18,
        actionName: `remove liquidity from ${pool.name}`,
        executeAction: async () => {
          const hash = await walletClient.writeContract({
            account,
            address: pool.pairAddress as `0x${string}`,
            abi: UniswapV2Pair_ABI,
            functionName: 'burn',
            args: [account],
          })
          await publicClient.waitForTransactionReceipt({ hash })
        },
      })
      alert(
        `✅ Removed liquidity! Received ${amount0Out} ${poolConfig.token0.symbol} + ${amount1Out} ${poolConfig.token1.symbol}`
      )
      setLpAmount('')
      setPercentage(25)
      refetchPools()
      refetchBalance0()
      refetchBalance1()
    } catch (error) {
      logger.error('Remove liquidity error:', error)
      alert(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <div key={pool.id} className="card hover:shadow-lg transition-shadow">
      {/* Pool Header */}
      <div
        className="flex items-center justify-between mb-4 cursor-pointer"
        onClick={() => setSelectedPool(selectedPool === pool.id ? null : pool.id)}
      >
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
              <span className={`text-sm font-bold ${pool.token0Color}`}>{pool.token0[0]}</span>
            </div>
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center">
              <span className={`text-sm font-bold ${pool.token1Color}`}>{pool.token1[0]}</span>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">{pool.name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Uniswap V2 Pool</p>
          </div>
        </div>
      </div>

      {/* Pool Stats */}
      <div
        className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg mb-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        onClick={() => setSelectedPool(selectedPool === pool.id ? null : pool.id)}
      >
        <div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">TVL</div>
          <div className="font-semibold text-gray-900 dark:text-white">${tvl.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Fee</div>
          <div className="font-semibold text-gray-900 dark:text-white">0.3%</div>
        </div>
        <div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">APR</div>
          <div className="font-semibold text-green-600 dark:text-green-400">0.00%</div>
        </div>
      </div>

      {/* User Position */}
      {isConnected && (
        <div
          className="p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg mb-4 cursor-pointer hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
          onClick={() => setSelectedPool(selectedPool === pool.id ? null : pool.id)}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Your LP Tokens</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {Number(lpFormatted).toFixed(6)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Your Pool Share</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {poolShare.toFixed(4)}%
            </span>
          </div>
        </div>
      )}

      {/* Expanded Actions */}
      {selectedPool === pool.id && (
        <div
          className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
          onClick={e => e.stopPropagation()}
        >
          {/* Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActionMode('add')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                actionMode === 'add'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              <Plus className="w-4 h-4 inline mr-1" />
              Add Liquidity
            </button>
            <button
              onClick={() => setActionMode('remove')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                actionMode === 'remove'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              <Minus className="w-4 h-4 inline mr-1" />
              Remove Liquidity
            </button>
          </div>

          {/* Add Liquidity Form */}
          {actionMode === 'add' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {pool.token0} Amount (Balance: {balance0})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount0}
                    onKeyDown={blockInvalidNumberInput}
                    onChange={e => {
                      const value = e.target.value
                      if (!value || Number(value) >= 0) handleAmount0Change(value)
                    }}
                    placeholder="0.0"
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => handleAmount0Change(balance0)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    MAX
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {pool.token1} Amount (Balance: {balance1})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount1}
                    onKeyDown={blockInvalidNumberInput}
                    onChange={e => {
                      const value = e.target.value
                      if (!value || Number(value) >= 0) handleAmount1Change(value)
                    }}
                    placeholder="0.0"
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => handleAmount1Change(balance1)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    MAX
                  </button>
                </div>
              </div>
              <button
                onClick={handleAddLiquidity}
                disabled={
                  !isConnected ||
                  hasInsufficientBalanceForAdd ||
                  addingStep > 0 ||
                  !amount0 ||
                  !amount1
                }
                className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                {!isConnected
                  ? 'Connect Wallet'
                  : hasInsufficientBalanceForAdd
                    ? 'Insufficient Balance'
                    : addingStep === 1
                      ? `Transferring ${poolConfig.token0.symbol}...`
                      : addingStep === 2
                        ? `Transferring ${poolConfig.token1.symbol}...`
                        : addingStep === 3
                          ? 'Minting LP...'
                          : 'Add Liquidity'}
              </button>
            </div>
          )}

          {/* Remove Liquidity Form */}
          {actionMode === 'remove' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                  LP Tokens to Remove (Balance: {lpFormatted})
                </label>
                <input
                  type="number"
                  value={lpAmount}
                  onKeyDown={blockInvalidNumberInput}
                  onChange={e => {
                    const value = e.target.value
                    if (!value || Number(value) >= 0) setLpAmount(value)
                  }}
                  placeholder="0.0"
                  max={lpFormatted}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-2 mb-2">
                {[25, 50, 75, 100].map(percent => (
                  <button
                    key={percent}
                    onClick={() => setPercentage(percent)}
                    className={`flex-1 py-2 px-3 text-sm rounded-lg transition-colors ${
                      percentage === percent
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {percent}%
                  </button>
                ))}
              </div>
              {Number(lpAmount) > 0 && (
                <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-sm">
                  <div className="text-primary-900 dark:text-blue-100">
                    You will receive:
                    <div className="font-semibold mt-1">
                      {Number(amount0Out).toFixed(6)} {poolConfig.token0.symbol}
                    </div>
                    <div className="font-semibold">
                      {Number(amount1Out).toFixed(6)} {poolConfig.token1.symbol}
                    </div>
                  </div>
                </div>
              )}
              <button
                onClick={handleRemoveLiquidity}
                disabled={
                  !isConnected ||
                  hasInsufficientLPBalance ||
                  isProcessing ||
                  !lpAmount ||
                  Number(lpAmount) <= 0
                }
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                {!isConnected
                  ? 'Connect Wallet'
                  : hasInsufficientLPBalance
                    ? 'Insufficient LP Balance'
                    : isProcessing
                      ? 'Processing...'
                      : 'Remove Liquidity'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Click to expand hint */}
      {selectedPool !== pool.id && (
        <div
          className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          onClick={() => setSelectedPool(pool.id)}
        >
          Click to manage liquidity
        </div>
      )}
    </div>
  )
}

function PoolPage() {
  const [selectedPool, setSelectedPool] = useState<string | null>(null)

  // Use unified liquidity pools hook
  const { pools, isConnected } = useLiquidityPools()

  // Create a refetch function to update all pool data
  const refetchPools = () => {
    // The hook will automatically refetch when dependencies change
    // We can trigger a manual refetch if needed
    window.location.reload() // Simple approach - or implement a refetch mechanism
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
          <Droplets className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Liquidity Pools</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Provide liquidity to earn trading fees
          </p>
        </div>
      </div>

      {/* Pool Cards Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {isConnected && pools.length > 0 ? (
          LIQUIDITY_POOLS.map((pool, index) => (
            <PoolCard
              key={pool.id}
              pool={pool}
              poolConfig={POOLS[index]}
              poolData={pools[index]}
              selectedPool={selectedPool}
              setSelectedPool={setSelectedPool}
              refetchPools={refetchPools}
            />
          ))
        ) : (
          <div className="col-span-2 card text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              {!isConnected ? 'Connect your wallet to view liquidity pools' : 'Loading pools...'}
            </p>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="card bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-primary-900 dark:text-blue-100">
            <p className="font-medium mb-1">About Liquidity Pools</p>
            <p>
              By providing liquidity to these pools, you earn a 0.3% fee on all trades proportional
              to your share of the pool. Your liquidity is represented by LP tokens which can be
              redeemed at any time.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PoolPage
