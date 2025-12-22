import { useState, useEffect, useMemo } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { Dialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { getTokenDecimals } from '@/utils/format'
import { useWrapETH } from '@/hooks/useWETH'
import { useDepositStBTD, useDepositStBTB } from '@/hooks/useStToken'
import { useDeposit } from '@/hooks/useFarming'
import { useApproveAndExecute } from '@/hooks/useApproveAndExecute'
import { CONTRACTS, TOKEN_DECIMALS } from '@/config/contracts'
import { useBTDStakeRate, useBTBStakeRate } from '@/hooks/useStakingRate'
import { useWETHPrice, useBTDPrice, useBTBPrice } from '@/hooks/useSystemStats'
import { ERC20_ABI as ERC20ABI } from '@/abis'
import { formatUnits, parseUnits } from 'viem'

type ConvertType = 'eth-to-weth' | 'btd-to-stbtd' | 'btb-to-stbtb'

interface ConvertAndStakeModalProps {
  isOpen: boolean
  onClose: () => void
  convertType: ConvertType
  poolId: number
  availableBalance: number
  tokenSymbol: string
  targetTokenSymbol: string
  presetAmount?: string
  desiredTargetAmount?: number
  currentTargetBalance?: number
  shortageTargetAmount?: number
}

export function ConvertAndStakeModal({
  isOpen,
  onClose,
  convertType,
  poolId,
  availableBalance,
  tokenSymbol,
  targetTokenSymbol,
  presetAmount,
  desiredTargetAmount,
  currentTargetBalance,
  shortageTargetAmount,
}: ConvertAndStakeModalProps) {
  const [amount, setAmount] = useState('')
  const [step, setStep] = useState<'convert' | 'stake'>('convert')
  const [isRefreshingTargetBalance, setIsRefreshingTargetBalance] = useState(false)

  // Conversion hooks
  const { wrap, isPending: isWrapping, isSuccess: wrapSuccess } = useWrapETH()
  const {
    deposit: depositStBTD,
    isPending: isDepositingStBTD,
    isSuccess: depositStBTDSuccess,
  } = useDepositStBTD()
  const {
    deposit: depositStBTB,
    isPending: isDepositingStBTB,
    isSuccess: depositStBTBSuccess,
  } = useDepositStBTB()

  // Farming deposit hook
  const {
    deposit: farmDeposit,
    isPending: isFarmDepositing,
    isSuccess: farmDepositSuccess,
  } = useDeposit()
  const { approveAndExecute, isProcessing: isApproving } = useApproveAndExecute()
  const btdStakeRate = useBTDStakeRate()
  const btbStakeRate = useBTBStakeRate()
  const { address } = useAccount()

  // Price hooks for USD value calculation
  const { wethPrice } = useWETHPrice()
  const { btdPrice } = useBTDPrice()
  const { btbPrice } = useBTBPrice()

  const targetTokenConfig = useMemo(() => {
    switch (convertType) {
      case 'eth-to-weth':
        return { tokenAddress: CONTRACTS.WETH, decimals: TOKEN_DECIMALS.WETH ?? 18 }
      case 'btd-to-stbtd':
        return { tokenAddress: CONTRACTS.stBTD, decimals: TOKEN_DECIMALS.stBTD }
      case 'btb-to-stbtb':
        return { tokenAddress: CONTRACTS.stBTB, decimals: TOKEN_DECIMALS.stBTB }
      default:
        return { tokenAddress: CONTRACTS.WETH, decimals: 18 }
    }
  }, [convertType])

  const { data: targetBalanceRaw, refetch: refetchTargetBalance } = useReadContract({
    address: targetTokenConfig.tokenAddress,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: isOpen && !!address,
    },
  })

  const fallbackTargetBalanceRaw = useMemo(() => {
    if (typeof currentTargetBalance !== 'number') return null
    try {
      return parseUnits(currentTargetBalance.toString(), targetTokenConfig.decimals)
    } catch {
      return null
    }
  }, [currentTargetBalance, targetTokenConfig.decimals])

  const effectiveTargetBalanceRaw = targetBalanceRaw ?? fallbackTargetBalanceRaw

  const desiredTargetAmountRaw = useMemo(() => {
    if (typeof desiredTargetAmount !== 'number') return null
    try {
      return parseUnits(desiredTargetAmount.toString(), targetTokenConfig.decimals)
    } catch {
      return null
    }
  }, [desiredTargetAmount, targetTokenConfig.decimals])

  const actualStakeAmountRaw = useMemo(() => {
    if (!effectiveTargetBalanceRaw || effectiveTargetBalanceRaw <= 0n) return null
    if (desiredTargetAmountRaw && desiredTargetAmountRaw > 0n) {
      return effectiveTargetBalanceRaw < desiredTargetAmountRaw
        ? effectiveTargetBalanceRaw
        : desiredTargetAmountRaw
    }
    return effectiveTargetBalanceRaw
  }, [effectiveTargetBalanceRaw, desiredTargetAmountRaw])

  const actualStakeAmountDisplay = actualStakeAmountRaw
    ? Number(formatUnits(actualStakeAmountRaw, targetTokenConfig.decimals)).toFixed(6)
    : '0'

  const stakeAmountStr = actualStakeAmountRaw
    ? formatUnits(actualStakeAmountRaw, targetTokenConfig.decimals)
    : '0'

  const canStakeActualAmount = actualStakeAmountRaw !== null && actualStakeAmountRaw > 0n

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setAmount(presetAmount ?? '')
      setStep('convert')
      setIsRefreshingTargetBalance(false)
    }
  }, [isOpen, presetAmount])

  // Handle conversion success -> move to staking step
  useEffect(() => {
    if (wrapSuccess || depositStBTDSuccess || depositStBTBSuccess) {
      setStep('stake')
      if (refetchTargetBalance) {
        setIsRefreshingTargetBalance(true)
        refetchTargetBalance()
          .catch(() => {})
          .finally(() => setIsRefreshingTargetBalance(false))
      }
    }
  }, [wrapSuccess, depositStBTDSuccess, depositStBTBSuccess, refetchTargetBalance])

  // Handle farm deposit success -> close modal
  useEffect(() => {
    if (farmDepositSuccess) {
      onClose()
    }
  }, [farmDepositSuccess, onClose])

  const inverseRate = useMemo(() => {
    switch (convertType) {
      case 'eth-to-weth':
        return 1
      case 'btd-to-stbtd':
        return btdStakeRate?.inverseRate || 1
      case 'btb-to-stbtb':
        return btbStakeRate?.inverseRate || 1
      default:
        return 1
    }
  }, [convertType, btdStakeRate?.inverseRate, btbStakeRate?.inverseRate])

  const estimatedStakeAmount = useMemo(() => {
    const baseAmount = parseFloat(amount)
    if (!baseAmount || baseAmount <= 0 || inverseRate <= 0) return 0
    return baseAmount * inverseRate
  }, [amount, inverseRate])

  const existingBalance = currentTargetBalance ?? 0
  const desiredStake = desiredTargetAmount ?? estimatedStakeAmount + existingBalance

  const totalStakeAmount = useMemo(() => {
    const availableAfterConvert = existingBalance + estimatedStakeAmount
    return Math.min(desiredStake, availableAfterConvert)
  }, [desiredStake, existingBalance, estimatedStakeAmount])

  const estimatedStakeAmountDisplay =
    estimatedStakeAmount > 0 ? estimatedStakeAmount.toFixed(6) : '0'

  const totalStakeAmountDisplay =
    step === 'stake'
      ? actualStakeAmountDisplay
      : totalStakeAmount > 0
        ? totalStakeAmount.toFixed(6)
        : '0'

  // Calculate USD values
  const inputUSDValue = useMemo(() => {
    const inputAmount = parseFloat(amount)
    if (!inputAmount || inputAmount <= 0) return 0

    switch (convertType) {
      case 'eth-to-weth':
        return inputAmount * wethPrice
      case 'btd-to-stbtd':
        return inputAmount * btdPrice
      case 'btb-to-stbtb':
        return inputAmount * btbPrice
      default:
        return 0
    }
  }, [amount, convertType, wethPrice, btdPrice, btbPrice])

  const estimatedStakeUSDValue = useMemo(() => {
    if (estimatedStakeAmount <= 0) return 0

    switch (convertType) {
      case 'eth-to-weth':
        return estimatedStakeAmount * wethPrice
      case 'btd-to-stbtd':
        return estimatedStakeAmount * btdPrice
      case 'btb-to-stbtb':
        return estimatedStakeAmount * btbPrice
      default:
        return 0
    }
  }, [estimatedStakeAmount, convertType, wethPrice, btdPrice, btbPrice])

  const totalStakeUSDValue = useMemo(() => {
    const total = step === 'stake' ? parseFloat(actualStakeAmountDisplay) : totalStakeAmount
    if (total <= 0) return 0

    switch (convertType) {
      case 'eth-to-weth':
        return total * wethPrice
      case 'btd-to-stbtd':
        return total * btdPrice
      case 'btb-to-stbtb':
        return total * btbPrice
      default:
        return 0
    }
  }, [step, actualStakeAmountDisplay, totalStakeAmount, convertType, wethPrice, btdPrice, btbPrice])

  const handleConvert = async () => {
    if (!amount || parseFloat(amount) <= 0) return

    try {
      switch (convertType) {
        case 'eth-to-weth':
          await wrap(amount)
          break
        case 'btd-to-stbtd':
          await depositStBTD(amount)
          break
        case 'btb-to-stbtb':
          await depositStBTB(amount)
          break
      }
    } catch (error) {
      console.error('Convert error:', error)
    }
  }

  const handleStake = async () => {
    if (!canStakeActualAmount || !stakeAmountStr || isRefreshingTargetBalance) return

    try {
      await approveAndExecute({
        tokenAddress: targetTokenConfig.tokenAddress as `0x${string}`,
        spenderAddress: CONTRACTS.FarmingPool,
        amount: stakeAmountStr,
        decimals: targetTokenConfig.decimals,
        actionName: `stake ${targetTokenSymbol}`,
        executeAction: async () => {
          await farmDeposit(poolId, stakeAmountStr, targetTokenConfig.decimals)
        },
      })
    } catch (error) {
      console.error('Stake error:', error)
    }
  }

  const isProcessing =
    isWrapping || isDepositingStBTD || isDepositingStBTB || isFarmDepositing || isApproving

  const getTitle = () => {
    if (step === 'convert') {
      return `Convert ${tokenSymbol} to ${targetTokenSymbol} and Stake`
    }
    return `Stake ${targetTokenSymbol} to Pool`
  }

  const getDescription = () => {
    if (step === 'convert') {
      return `Do you want to convert ${tokenSymbol} to ${targetTokenSymbol} and stake for farming?`
    }
    return `${tokenSymbol} has been successfully converted to ${targetTokenSymbol}, now staking to the pool.`
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
              {getTitle()}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Description */}
            <p className="text-sm text-gray-600 dark:text-gray-300">{getDescription()}</p>

            {/* Amount Input */}
            {step === 'convert' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {tokenSymbol} Amount
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.0"
                    className="w-full px-4 py-3 pr-20 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={isProcessing}
                  />
                  <button
                    onClick={() => setAmount(availableBalance.toString())}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                    disabled={isProcessing}
                  >
                    Max
                  </button>
                </div>
                {/* USD Value Display */}
                {inputUSDValue > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    ≈ ${inputUSDValue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </div>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Available:{' '}
                  {availableBalance.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: getTokenDecimals(tokenSymbol),
                  })}{' '}
                  {tokenSymbol}
                </p>
                {typeof currentTargetBalance === 'number' && (
                  <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                    Current {targetTokenSymbol} balance:{' '}
                    {currentTargetBalance.toLocaleString(undefined, {
                      maximumFractionDigits: 6,
                    })}{' '}
                    {targetTokenSymbol}
                  </p>
                )}
                {typeof shortageTargetAmount === 'number' && (
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    Shortage:{' '}
                    {shortageTargetAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })}{' '}
                    {targetTokenSymbol}
                  </p>
                )}
                {typeof desiredTargetAmount === 'number' && (
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    Desired stake:{' '}
                    {desiredTargetAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })}{' '}
                    {targetTokenSymbol}
                  </p>
                )}
                <div className="mt-3 space-y-2">
                  <div className="p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 rounded-lg text-sm text-primary-800 dark:text-primary-200">
                    <div>
                      New {targetTokenSymbol} from this conversion:{' '}
                      <span className="font-semibold">{estimatedStakeAmountDisplay}</span>
                    </div>
                    {estimatedStakeUSDValue > 0 && (
                      <div className="text-xs mt-1 text-primary-600 dark:text-primary-300">
                        ≈ ${estimatedStakeUSDValue.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-800 dark:text-green-200">
                    <div>
                      Estimated total stake (existing + new):{' '}
                      <span className="font-semibold">{totalStakeAmountDisplay}</span>{' '}
                      {targetTokenSymbol}
                    </div>
                    {totalStakeUSDValue > 0 && (
                      <div className="text-xs mt-1 text-green-600 dark:text-green-300">
                        ≈ ${totalStakeUSDValue.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step Status */}
            {step === 'stake' && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-green-800 dark:text-green-200">
                  ✅ Conversion successful! Ready to stake {totalStakeAmountDisplay}{' '}
                  {targetTokenSymbol}
                  {isRefreshingTargetBalance && ' (syncing balance...)'}
                </p>
              </div>
            )}

            {/* Success Message */}
            {farmDepositSuccess && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-green-800 dark:text-green-200">
                  ✅ Staking successful! Deposited approximately {totalStakeAmountDisplay}{' '}
                  {targetTokenSymbol}. Closing window...
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              disabled={isProcessing}
            >
              Cancel
            </button>
            {step === 'convert' ? (
              <button
                onClick={handleConvert}
                disabled={isProcessing || !amount || parseFloat(amount) <= 0}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {isProcessing ? 'Converting...' : 'Confirm Convert'}
              </button>
            ) : (
              <button
                onClick={handleStake}
                disabled={isProcessing || !canStakeActualAmount || isRefreshingTargetBalance}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {isProcessing
                  ? 'Staking...'
                  : isRefreshingTargetBalance
                    ? 'Syncing balance...'
                    : 'Confirm Stake'}
              </button>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
