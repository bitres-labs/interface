import { useState, useEffect, useMemo } from 'react'
import { Dialog, RadioGroup } from '@headlessui/react'
import { XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { getTokenDecimals } from '@/utils/format'
import { useWithdraw } from '@/hooks/useFarming'
import { useUnwrapWETH } from '@/hooks/useWETH'
import { useRedeemStBTD, useRedeemStBTB } from '@/hooks/useStToken'
import { useWETHPrice, useBTDPrice, useBTBPrice } from '@/hooks/useSystemStats'

type WithdrawType = 'weth' | 'stbtd' | 'stbtb'

interface WithdrawConvertModalProps {
  isOpen: boolean
  onClose: () => void
  withdrawType: WithdrawType
  poolId: number
  stakedAmount: number
  withdrawAmount?: string // Pre-filled withdraw amount from input
  tokenSymbol: string // WETH, stBTD, stBTB
  baseTokenSymbol: string // ETH, BTD, BTB
}

export function WithdrawConvertModal({
  isOpen,
  onClose,
  withdrawType,
  poolId,
  stakedAmount,
  withdrawAmount,
  tokenSymbol,
  baseTokenSymbol,
}: WithdrawConvertModalProps) {
  const [amount, setAmount] = useState('')
  const [outputChoice, setOutputChoice] = useState<'wrapped' | 'unwrapped'>('wrapped')
  const [step, setStep] = useState<'withdraw' | 'convert'>('withdraw')

  // Farming withdraw hook
  const { withdraw, isPending: isWithdrawing, isSuccess: withdrawSuccess } = useWithdraw()

  // Conversion hooks
  const { unwrap, isPending: isUnwrapping, isSuccess: unwrapSuccess } = useUnwrapWETH()
  const { redeem: redeemStBTD, isPending: isRedeemingStBTD, isSuccess: redeemStBTDSuccess } = useRedeemStBTD()
  const { redeem: redeemStBTB, isPending: isRedeemingStBTB, isSuccess: redeemStBTBSuccess } = useRedeemStBTB()

  // Price hooks for USD value calculation
  const { wethPrice } = useWETHPrice()
  const { btdPrice } = useBTDPrice()
  const { btbPrice } = useBTBPrice()

  // Calculate USD value
  const withdrawUSDValue = useMemo(() => {
    const withdrawAmt = parseFloat(amount)
    if (!withdrawAmt || withdrawAmt <= 0) return 0

    switch (withdrawType) {
      case 'weth':
        return withdrawAmt * wethPrice
      case 'stbtd':
        return withdrawAmt * btdPrice
      case 'stbtb':
        return withdrawAmt * btbPrice
      default:
        return 0
    }
  }, [amount, withdrawType, wethPrice, btdPrice, btbPrice])

  // Reset state when modal opens, and set pre-filled amount if provided
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAmount(withdrawAmount || '')
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOutputChoice('wrapped')
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep('withdraw')
    }
  }, [isOpen, withdrawAmount])

  // Handle withdraw success
  useEffect(() => {
    if (withdrawSuccess) {
      if (outputChoice === 'unwrapped') {
        // Need to convert, move to next step
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStep('convert')
      } else {
        // No conversion needed, close modal
        setTimeout(() => {
          onClose()
        }, 1500)
      }
    }
  }, [withdrawSuccess, outputChoice, onClose])

  // Handle conversion success
  useEffect(() => {
    if (unwrapSuccess || redeemStBTDSuccess || redeemStBTBSuccess) {
      setTimeout(() => {
        onClose()
      }, 1500)
    }
  }, [unwrapSuccess, redeemStBTDSuccess, redeemStBTBSuccess, onClose])

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) return

    try {
      await withdraw(poolId, amount)
    } catch (error) {
      console.error('Withdraw error:', error)
    }
  }

  const handleConvert = async () => {
    if (!amount || parseFloat(amount) <= 0) return

    try {
      switch (withdrawType) {
        case 'weth':
          await unwrap(amount)
          break
        case 'stbtd':
          await redeemStBTD(amount)
          break
        case 'stbtb':
          await redeemStBTB(amount)
          break
      }
    } catch (error) {
      console.error('Convert error:', error)
    }
  }

  const isProcessing = isWithdrawing || isUnwrapping || isRedeemingStBTD || isRedeemingStBTB

  const getTitle = () => {
    if (step === 'withdraw') {
      return `Withdraw ${tokenSymbol}`
    }
    return `Convert to ${baseTokenSymbol}`
  }

  const getDescription = () => {
    if (step === 'withdraw') {
      return `Choose the token type to receive after withdrawal`
    }
    return `Converting ${tokenSymbol} to ${baseTokenSymbol}...`
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

            {step === 'withdraw' && (
              <>
                {/* Amount Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Withdraw Amount
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
                      onClick={() => setAmount(stakedAmount.toString())}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                      disabled={isProcessing}
                    >
                      All
                    </button>
                  </div>
                  {/* USD Value Display */}
                  {withdrawUSDValue > 0 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      ≈ ${withdrawUSDValue.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </div>
                  )}
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Staked: {stakedAmount.toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: getTokenDecimals(tokenSymbol)
                    })} {tokenSymbol}
                  </p>
                </div>

                {/* Output Choice */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Receive Token Type
                  </label>
                  <RadioGroup value={outputChoice} onChange={setOutputChoice}>
                    <div className="space-y-2">
                      <RadioGroup.Option value="wrapped" className="cursor-pointer">
                        {({ checked }) => (
                          <div
                            className={`relative flex items-center p-4 rounded-lg border-2 transition-colors ${
                              checked
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700'
                            }`}
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                Keep {tokenSymbol}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Withdraw directly (lower gas fee)
                              </p>
                            </div>
                            {checked && (
                              <CheckCircleIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                            )}
                          </div>
                        )}
                      </RadioGroup.Option>

                      <RadioGroup.Option value="unwrapped" className="cursor-pointer">
                        {({ checked }) => (
                          <div
                            className={`relative flex items-center p-4 rounded-lg border-2 transition-colors ${
                              checked
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700'
                            }`}
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                Convert to {baseTokenSymbol}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Auto-convert and withdraw (additional gas required)
                              </p>
                            </div>
                            {checked && (
                              <CheckCircleIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                            )}
                          </div>
                        )}
                      </RadioGroup.Option>
                    </div>
                  </RadioGroup>
                </div>
              </>
            )}

            {/* Step Status */}
            {step === 'convert' && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-green-800 dark:text-green-200">
                  ✅ Withdraw successful! Amount: {amount} {tokenSymbol}
                </p>
                <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                  Converting to {baseTokenSymbol}...
                </p>
              </div>
            )}

            {/* Success Message */}
            {(withdrawSuccess && outputChoice === 'wrapped') ||
              unwrapSuccess ||
              redeemStBTDSuccess ||
              redeemStBTBSuccess ? (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-green-800 dark:text-green-200">
                  ✅ Operation successful! Closing window...
                </p>
              </div>
            ) : null}
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
            {step === 'withdraw' ? (
              <button
                onClick={handleWithdraw}
                disabled={isProcessing || !amount || parseFloat(amount) <= 0}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {isProcessing ? 'Withdrawing...' : 'Confirm Withdraw'}
              </button>
            ) : (
              <button
                onClick={handleConvert}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {isProcessing ? 'Converting...' : 'Confirm Convert'}
              </button>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
