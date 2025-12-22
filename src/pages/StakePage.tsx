'use client'
import { logger } from '@/utils/logger'

import { useState, useMemo, useEffect } from 'react'
import { Info, ArrowDown } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useBTDBalance, useBTBBalance, useStBTDBalance, useStBTBBalance } from '@/hooks/useBalances'
import { useStakeBTD, useStakeBTB, useUnstakeBTD, useUnstakeBTB } from '@/hooks/useStaking'
import { useBTDStakeRate, useBTBStakeRate, useCalculateStakeOutput } from '@/hooks/useStakingRate'
import { useBTDInterestRate, useBTBInterestRate } from '@/hooks/useInterestRate'
import { useApproveAndExecute } from '@/hooks/useApproveAndExecute'
import { CONTRACTS, TOKEN_DECIMALS } from '@/config/contracts'
import { blockInvalidNumberInput } from '@/utils/input'
import { formatTokenAmount } from '@/utils/format'
import { useBTDPrice, useBTBPrice } from '@/hooks/useSystemStats'

type Tab = 'stake' | 'unstake'

interface StakePageProps {
  embedded?: boolean
}

function StakePage({ embedded = false }: StakePageProps = {}) {
  const { isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()

  // Always start with 'stake' tab when component mounts
  const [activeTab, setActiveTab] = useState<Tab>('stake')
  const [fromToken, setFromToken] = useState('BTD')
  const [fromAmount, setFromAmount] = useState('')

  const isDeposit = activeTab === 'stake'

  // Determine the to token and base token
  const toToken = useMemo(() => {
    if (activeTab === 'stake') {
      return fromToken === 'BTD' ? 'stBTD' : 'stBTB'
    } else {
      return fromToken === 'stBTD' ? 'BTD' : 'BTB'
    }
  }, [activeTab, fromToken])

  const baseToken = useMemo(() => {
    if (fromToken === 'BTD' || fromToken === 'stBTD') return 'BTD'
    return 'BTB'
  }, [fromToken])

  // Handle tab change
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    setFromToken(tab === 'stake' ? 'BTD' : 'stBTD')
    setFromAmount('')
  }

  // Prices
  const { btdPrice } = useBTDPrice()
  const { btbPrice } = useBTBPrice()

  // Balances
  const { balance: btdBalance, refetch: refetchBTD } = useBTDBalance()
  const { balance: btbBalance, refetch: refetchBTB } = useBTBBalance()
  const { balance: stBTDBalance, refetch: refetchStBTD } = useStBTDBalance()
  const { balance: stBTBBalance, refetch: refetchStBTB } = useStBTBBalance()

  const fromBalance = useMemo(() => {
    if (fromToken === 'BTD') return btdBalance
    if (fromToken === 'BTB') return btbBalance
    if (fromToken === 'stBTD') return stBTDBalance
    if (fromToken === 'stBTB') return stBTBBalance
    return '0'
  }, [fromToken, btdBalance, btbBalance, stBTDBalance, stBTBBalance])

  const toBalance = useMemo(() => {
    if (toToken === 'BTD') return btdBalance
    if (toToken === 'BTB') return btbBalance
    if (toToken === 'stBTD') return stBTDBalance
    if (toToken === 'stBTB') return stBTBBalance
    return '0'
  }, [toToken, btdBalance, btbBalance, stBTDBalance, stBTBBalance])

  // Exchange rates
  const btdRate = useBTDStakeRate()
  const btbRate = useBTBStakeRate()
  const currentRate = baseToken === 'BTD' ? btdRate : btbRate

  // Calculate output
  const outputAmount = useCalculateStakeOutput(fromAmount, isDeposit, baseToken)

  // Calculate USD value for input
  const inputUSDValue = useMemo(() => {
    const amount = Number(fromAmount)
    if (!amount || !Number.isFinite(amount)) return 0

    // BTD, stBTD, BTB, stBTB all track iUSD price (approximately $1)
    const price = baseToken === 'BTD' ? btdPrice : btbPrice
    return amount * price
  }, [fromAmount, baseToken, btdPrice, btbPrice])

  // Unified approve+execute hook
  const { approveAndExecute, isProcessing } = useApproveAndExecute()

  // Stake/unstake hooks
  const { stakeBTD, isPending: isStakingBTD, isSuccess: stakeSuccessBTD } = useStakeBTD()
  const {
    stakeBTB,
    isPending: isStakingBTB,
    isSuccess: stakeSuccessBTB,
    isSigningPermit: isSigningStakeBTB,
  } = useStakeBTB()
  const { unstakeBTD, isPending: isUnstakingBTD, isSuccess: unstakeSuccessBTD } = useUnstakeBTD()
  const { unstakeBTB, isPending: isUnstakingBTB, isSuccess: unstakeSuccessBTB } = useUnstakeBTB()

  // APR data from InterestPool (staking interest rates)
  const btdInterestRate = useBTDInterestRate()
  const btbInterestRate = useBTBInterestRate()
  const currentAPR = baseToken === 'BTD' ? btdInterestRate.apr : btbInterestRate.apr

  // Pending states
  const isExecuting = useMemo(() => {
    if (fromToken === 'BTD') return isStakingBTD
    if (fromToken === 'BTB') return isStakingBTB || isSigningStakeBTB
    if (fromToken === 'stBTD') return isUnstakingBTD
    if (fromToken === 'stBTB') return isUnstakingBTB
    return false
  }, [fromToken, isStakingBTD, isStakingBTB, isSigningStakeBTB, isUnstakingBTD, isUnstakingBTB])

  // Check insufficient balance
  const hasInsufficientBalance = useMemo(() => {
    if (!fromAmount || Number(fromAmount) <= 0) return false
    return Number(fromAmount) > Number(fromBalance)
  }, [fromAmount, fromBalance])

  // Unified handler
  const handleAction = async () => {
    if (!isConnected && openConnectModal) {
      openConnectModal()
      return
    }

    if (!fromAmount || Number(fromAmount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    try {
      // For unstake operations, no approval needed
      if (!isDeposit) {
        if (fromToken === 'stBTD') await unstakeBTD(fromAmount)
        else if (fromToken === 'stBTB') await unstakeBTB(fromAmount)
        setFromAmount('')
        return
      }

      if (fromToken === 'BTD') {
        await approveAndExecute({
          tokenAddress: CONTRACTS.BTD,
          spenderAddress: CONTRACTS.stBTD,
          amount: fromAmount,
          decimals: TOKEN_DECIMALS.BTD,
          actionName: 'stake BTD',
          executeAction: async () => {
            await stakeBTD(fromAmount)
          },
        })
      } else if (fromToken === 'BTB') {
        await stakeBTB(fromAmount)
      }

      setFromAmount('')
    } catch (error) {
      logger.error('Action error:', error)
    }
  }

  // Auto-refresh balances after stake/unstake success
  useEffect(() => {
    if (stakeSuccessBTD) {
      refetchBTD()
      refetchStBTD()
    }
  }, [stakeSuccessBTD, refetchBTD, refetchStBTD])

  useEffect(() => {
    if (stakeSuccessBTB) {
      refetchBTB()
      refetchStBTB()
    }
  }, [stakeSuccessBTB, refetchBTB, refetchStBTB])

  useEffect(() => {
    if (unstakeSuccessBTD) {
      refetchBTD()
      refetchStBTD()
    }
  }, [unstakeSuccessBTD, refetchBTD, refetchStBTD])

  useEffect(() => {
    if (unstakeSuccessBTB) {
      refetchBTB()
      refetchStBTB()
    }
  }, [unstakeSuccessBTB, refetchBTB, refetchStBTB])

  // Exchange rate display
  const exchangeRateLabel = useMemo(() => {
    if (!currentRate) return 'Loading...'
    if (isDeposit) {
      return `1 ${baseToken} = ${currentRate.inverseRate.toFixed(6)} st${baseToken}`
    } else {
      return `1 st${baseToken} = ${currentRate.exchangeRate.toFixed(6)} ${baseToken}`
    }
  }, [isDeposit, baseToken, currentRate])

  // Button text
  const primaryButtonText = !isConnected
    ? 'Connect Wallet'
    : hasInsufficientBalance
      ? `Insufficient ${fromToken} Balance`
      : fromToken === 'BTB' && isSigningStakeBTB
        ? 'Signing Permit...'
      : isProcessing
        ? 'Processing...'
        : isExecuting
          ? isDeposit
            ? 'Staking...'
            : 'Unstaking...'
          : isDeposit
            ? `Stake ${baseToken}`
            : `Unstake ${baseToken}`

  const content = (
    <>
      {/* Tabs */}
      {embedded ? (
        // Embedded mode: original border-bottom style
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            onClick={() => handleTabChange('stake')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'stake'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Stake
          </button>
          <button
            onClick={() => handleTabChange('unstake')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'unstake'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Unstake
          </button>
        </div>
      ) : (
        // Standalone mode: highlighted grid style
        <div className="grid grid-cols-2 gap-3 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg mb-6">
          <button
            onClick={() => handleTabChange('stake')}
            className={`px-6 py-3 rounded-lg font-semibold text-base transition-all ${
              activeTab === 'stake'
                ? 'bg-primary-600 text-white shadow-md hover:bg-primary-700'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            Stake
          </button>
          <button
            onClick={() => handleTabChange('unstake')}
            className={`px-6 py-3 rounded-lg font-semibold text-base transition-all ${
              activeTab === 'unstake'
                ? 'bg-primary-600 text-white shadow-md hover:bg-primary-700'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            Unstake
          </button>
        </div>
      )}

      {/* From Token */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-1 min-h-[100px]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">From</span>
          <span className="text-sm text-gray-600 dark:text-gray-400">Balance: {formatTokenAmount(Number(fromBalance), fromToken)}</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <div className="flex-1 min-w-0">
            <input
              type="number"
              min="0"
              step="any"
              value={fromAmount}
              onKeyDown={blockInvalidNumberInput}
              onChange={e => {
                const value = e.target.value
                if (!value || Number(value) >= 0) setFromAmount(value)
              }}
              placeholder="0.0"
              className="w-full bg-transparent text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white outline-none"
            />
            {/* USD value display */}
            {fromAmount && Number(fromAmount) > 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                ≈ ${inputUSDValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            )}
          </div>
          <button
            onClick={() => setFromAmount(fromBalance)}
            className="px-2 py-1 text-xs sm:text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/20 rounded-lg transition-colors flex-shrink-0"
          >
            MAX
          </button>
          <select
            value={fromToken}
            onChange={e => {
              setFromToken(e.target.value)
              setFromAmount('')
            }}
            className="px-2 py-2 sm:px-3 sm:py-2 bg-white dark:bg-gray-800 rounded-lg text-sm sm:text-base font-medium text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 outline-none cursor-pointer hover:border-primary-500 transition-colors flex-shrink-0 min-h-[2.25rem] sm:min-h-0"
          >
            {activeTab === 'stake' ? (
              <>
                <option value="BTD">BTD</option>
                <option value="BTB">BTB</option>
              </>
            ) : (
              <>
                <option value="stBTD">stBTD</option>
                <option value="stBTB">stBTB</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Arrow */}
      <div className="flex justify-center -my-4 relative z-10">
        <button
          onClick={() => {
            // Toggle between stake and unstake
            if (activeTab === 'stake') {
              handleTabChange('unstake')
            } else {
              handleTabChange('stake')
            }
          }}
          className="w-10 h-10 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-4 border-gray-50 dark:border-gray-900 rounded-full flex items-center justify-center transition-colors cursor-pointer shadow-md"
        >
          <ArrowDown className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
      </div>

      {/* To Token */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mt-1 min-h-[100px]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">To</span>
          <span className="text-sm text-gray-600 dark:text-gray-400">Balance: {formatTokenAmount(Number(toBalance), toToken)}</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <div className="flex-1">
            <div className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
              {outputAmount || '0.0'}
            </div>
            {/* Output USD value display */}
            {outputAmount && Number(outputAmount) > 0 && (() => {
              const amount = Number(outputAmount)
              let usdValue = 0
              // stBTD and BTD use BTD price, stBTB and BTB use BTB price
              if (toToken === 'BTD' || toToken === 'stBTD') {
                usdValue = amount * btdPrice
              } else if (toToken === 'BTB' || toToken === 'stBTB') {
                usdValue = amount * btbPrice
              }
              return usdValue > 0 ? (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  ≈ ${usdValue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </div>
              ) : null
            })()}
          </div>
          <div className="px-2 py-1.5 sm:px-3 sm:py-2 bg-white dark:bg-gray-800 rounded-lg text-sm sm:text-base font-medium text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 flex-shrink-0">
            {toToken}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-2 text-sm bg-gray-50 dark:bg-gray-800/60 rounded-lg p-4 mt-4">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Exchange Rate</span>
          <span className="font-medium text-gray-900 dark:text-white">{exchangeRateLabel}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">APR</span>
          <span className="font-medium text-primary-600 dark:text-primary-400">
            {currentAPR.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={handleAction}
        disabled={
          (!isConnected && !openConnectModal) ||
          hasInsufficientBalance ||
          isProcessing ||
          isExecuting ||
          !fromAmount ||
          Number(fromAmount) <= 0
        }
        className="btn-primary w-full mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {primaryButtonText}
      </button>

      {!isConnected && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
          Wallet connection is required to stake.
        </p>
      )}
    </>
  )

  // Return based on embedded mode
  if (embedded) {
    return content
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="card">
        {content}

        {/* Info Box */}
        <div className="card bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 text-sm text-primary-900 dark:text-blue-100 flex gap-3 mt-6">
          <Info className="w-5 h-5 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">How staking works</p>
            <p className="text-primary-800 dark:text-blue-200">
              Staking converts your {baseToken} to st{baseToken}, which automatically earns interest
              as the exchange rate increases over time. You also earn BRS mining rewards. No
              liquidity pools or slippage involved.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StakePage
