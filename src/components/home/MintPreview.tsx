/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from 'react'
import { logger } from '@/utils/logger'
import { ArrowDown, Info, Clock } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import {
  useCollateralRatio,
  useBTCPrice,
  useIUSDPrice,
  useMintFee,
  useRedeemFee,
  useMintBTD,
  useRedeemBTD,
  useRedeemBTB,
  calculateMintOutput,
  calculateRedeemOutput,
} from '@/hooks/useMinter'
import { useWBTCBalance, useBTDBalance, useBTBBalance } from '@/hooks/useBalances'
import { useBTBPrice, useBRSPrice, useBTDPrice } from '@/hooks/useSystemStats'
import { CONTRACTS, TOKEN_DECIMALS } from '@/config/contracts'
import { blockInvalidNumberInput } from '@/utils/input'
import { useApproveAndExecute, useNeedsApproval } from '@/hooks/useApproveAndExecute'
import { formatTokenAmount } from '@/utils/format'
import { useCooldown, formatCooldownTime } from '@/hooks/useCooldown'

// Minimum value constant (from contract MIN_MINT_VALUE and MIN_REDEEM_VALUE = 1e15 = $0.001 USD)
const MIN_VALUE_USD = 0.001

interface MintPreviewProps {
  embedded?: boolean
}

function MintPreview({ embedded = false }: MintPreviewProps = {}) {
  const { isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()

  // Always start with 'mint' mode when component mounts
  const [mode, setMode] = useState<'mint' | 'redeemBTD' | 'redeemBTB'>('mint')
  const [inputAmount, setInputAmount] = useState('')
  const [showMetaMaskWarning, setShowMetaMaskWarning] = useState(false)
  const pendingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Contract data
  const { collateralRatio } = useCollateralRatio()
  const { btcPrice } = useBTCPrice()
  const { iusdPrice } = useIUSDPrice()
  const { btbPrice } = useBTBPrice()
  const { brsPrice } = useBRSPrice()
  const { btdPrice } = useBTDPrice()
  const { mintFeeBP } = useMintFee()
  const { redeemFeeBP } = useRedeemFee()
  const isPricingReady = btcPrice > 0 && iusdPrice > 0

  // Balances
  const { balance: wbtcBalance, refetch: refetchWBTCBalance } = useWBTCBalance()
  const { balance: btdBalance, refetch: refetchBTDBalance } = useBTDBalance()
  const { balance: btbBalance, refetch: refetchBTBBalance } = useBTBBalance()

  const [pendingResult, setPendingResult] = useState<{ type: string; output: string } | null>(null)

  // Cooldown timers for each operation
  const mintCooldown = useCooldown('mint')
  const redeemBTDCooldown = useCooldown('redeemBTD')
  const redeemBTBCooldown = useCooldown('redeemBTB')

  // Get current operation's cooldown
  const getCurrentCooldown = () => {
    if (mode === 'mint') return mintCooldown
    if (mode === 'redeemBTD') return redeemBTDCooldown
    return redeemBTBCooldown
  }

  const currentCooldown = getCurrentCooldown()

  // Calculate minimum input amounts
  const getMinInputAmount = () => {
    if (mode === 'mint' && btcPrice > 0) {
      // Minimum WBTC = $0.001 / WBTC price
      return (MIN_VALUE_USD / btcPrice).toFixed(8)
    } else if (mode === 'redeemBTD' && iusdPrice > 0) {
      // Minimum BTD = $0.001 / IUSD price
      return (MIN_VALUE_USD / iusdPrice).toFixed(6)
    } else if (mode === 'redeemBTB' && iusdPrice > 0) {
      // Minimum BTB = $0.001 / IUSD price
      return (MIN_VALUE_USD / iusdPrice).toFixed(6)
    }
    return '0'
  }

  // Calculate BTB and BRS compensation for redeem BTD when CR < 100%
  // Fee is deducted from input BTD first, then remaining amount is used for redemption
  const calculateRedeemCompensation = (btdAmount: string) => {
    if (!btdAmount || mode !== 'redeemBTD') return { wbtcOut: '0', btbOut: '0', brsOut: '0' }

    const btd = Number(btdAmount)
    if (Number.isNaN(btd) || btd === 0) return { wbtcOut: '0', btbOut: '0', brsOut: '0' }

    // Apply redemption fee first
    const feeMultiplier = 1 - redeemFeeBP / 10000
    const effectiveBTD = btd * feeMultiplier

    const usdValue = effectiveBTD * iusdPrice
    const cr = collateralRatio / 100 // Convert from percentage to decimal

    if (cr >= 1) {
      // Full redemption (CR >= 100%)
      const wbtcOut = (usdValue / btcPrice).toFixed(8)
      return { wbtcOut, btbOut: '0', brsOut: '0' }
    } else {
      // Partial redemption (CR < 100%)
      const wbtcValue = usdValue * cr
      const wbtcOut = (wbtcValue / btcPrice).toFixed(8)

      const lossValue = usdValue - wbtcValue
      const minBTBPriceInBTD = 0.5 // minBTBPrice constant (0.5 BTD)
      const minPriceInUSD = minBTBPriceInBTD * btdPrice

      let btbOut = 0
      let brsOut = 0

      if (lossValue > 0) {
        if (btbPrice >= minPriceInUSD) {
          // BTB price is normal, compensate with BTB only
          btbOut = lossValue / btbPrice
        } else {
          // BTB price is too low (< 0.5 BTD), calculate BTB at min price and compensate difference with BRS
          btbOut = lossValue / minPriceInUSD
          const extraLoss = (lossValue * (minPriceInUSD - btbPrice)) / minPriceInUSD
          brsOut = extraLoss / brsPrice
        }
      }

      return {
        wbtcOut,
        btbOut: btbOut.toFixed(6),
        brsOut: brsOut.toFixed(6),
      }
    }
  }

  // Calculate amounts
  const redemptionOutputs =
    mode === 'redeemBTD'
      ? calculateRedeemCompensation(inputAmount)
      : { wbtcOut: '0', btbOut: '0', brsOut: '0' }

  const outputAmount =
    mode === 'mint'
      ? calculateMintOutput(inputAmount, btcPrice, iusdPrice, mintFeeBP)
      : mode === 'redeemBTD'
        ? redemptionOutputs.wbtcOut
        : inputAmount // redeemBTB: 1:1 conversion to BTD

  // Calculate USD value for input
  const calculateInputUSDValue = () => {
    const amount = Number(inputAmount)
    if (!amount || !Number.isFinite(amount)) return 0

    if (mode === 'mint') {
      return amount * btcPrice // WBTC price
    } else if (mode === 'redeemBTD') {
      return amount * iusdPrice // BTD price (iUSD)
    } else {
      return amount * iusdPrice // BTB price (iUSD, 1:1 with BTD)
    }
  }

  const inputUSDValue = calculateInputUSDValue()

  // Get minimum input amount
  const minInputAmount = getMinInputAmount()

  // Mint/Redeem hooks
  const { mintBTD, isPending: isMinting, isSuccess: mintSuccess, hash: mintHash } = useMintBTD()
  const {
    redeemBTD,
    isPending: isRedeemingBTD,
    isSigningPermit: isSigningRedeemBTD,
    isSuccess: redeemBTDSuccess,
    hash: redeemBTDHash,
  } = useRedeemBTD()
  const {
    redeemBTB,
    isPending: isRedeemingBTB,
    isSigningPermit: isSigningRedeemBTB,
    isSuccess: redeemBTBSuccess,
    hash: redeemBTBHash,
  } = useRedeemBTB()

  // Unified approve+execute hook
  const { approveAndExecute, isProcessing } = useApproveAndExecute()

  // Check if WBTC approval is needed for minting BTD
  const needsWBTCApproval = useNeedsApproval(
    mode === 'mint' ? CONTRACTS.WBTC : undefined,
    mode === 'mint' ? CONTRACTS.Minter : undefined,
    inputAmount,
    TOKEN_DECIMALS.WBTC
  )

  // Detect if we're on mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  const isMetaMaskBrowser =
    typeof window !== 'undefined' &&
    (window as unknown as { ethereum?: { isMetaMask?: boolean; isBraveWallet?: boolean } }).ethereum?.isMetaMask &&
    !(window as unknown as { ethereum?: { isMetaMask?: boolean; isBraveWallet?: boolean } }).ethereum?.isBraveWallet

  // Show success message
  /* eslint-disable no-alert */
  useEffect(() => {
    if (mintSuccess && pendingResult?.type === 'mint') {
      const amount = pendingResult.output || '0'
      alert(`✅ Successfully minted ${amount} BTD!

⚠️ Note: If MetaMask shows "0 GO" or "failed", ignore it.
This is a known MetaMask bug with Hardhat local network.
Your transaction actually succeeded - check your balance!`)
      setInputAmount('')
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPendingResult(null)
      refetchWBTCBalance()
      refetchBTDBalance()
      // Immediately refresh cooldown status
      mintCooldown.refetch?.()
    }
  }, [mintSuccess, pendingResult, refetchWBTCBalance, refetchBTDBalance, mintCooldown])

  useEffect(() => {
    if (redeemBTDSuccess && pendingResult?.type === 'redeemBTD') {
      const wbtcAmount = pendingResult.output || '0'
      alert(`✅ Successfully redeemed BTD for ${wbtcAmount} WBTC!

⚠️ Note: Ignore MetaMask "0 GO" or "failed" errors.
Your transaction succeeded - check your balance!`)
      setInputAmount('')
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPendingResult(null)
      refetchWBTCBalance()
      refetchBTDBalance()
      // Immediately refresh cooldown status
      redeemBTDCooldown.refetch?.()
    }
  }, [redeemBTDSuccess, pendingResult, refetchWBTCBalance, refetchBTDBalance, redeemBTDCooldown])

  useEffect(() => {
    if (redeemBTBSuccess && pendingResult?.type === 'redeemBTB') {
      const btdAmount = pendingResult.output || '0'
      alert(`✅ Successfully converted BTB to ${btdAmount} BTD!

ℹ️ BTB bonds have been converted to BTD stablecoin.
You can now use BTD or redeem it for WBTC.

⚠️ Note: Ignore MetaMask "0 GO" or "failed" errors.
Your transaction succeeded - check your balance!`)
      setInputAmount('')
      setPendingResult(null)
      refetchBTDBalance()
      refetchBTBBalance()
      // Immediately refresh cooldown status
      redeemBTBCooldown.refetch?.()
    }
  }, [redeemBTBSuccess, pendingResult, refetchBTDBalance, refetchBTBBalance, redeemBTBCooldown])

  // Monitor for stuck pending state (MetaMask not opening)
  useEffect(() => {
    const isPending =
      isMinting ||
      isRedeemingBTD ||
      isRedeemingBTB ||
      isProcessing ||
      isSigningRedeemBTD
    const hasHash = mintHash || redeemBTDHash || redeemBTBHash

    if (isPending && !hasHash) {
      // Transaction is pending but no hash yet - might be waiting for MetaMask
      logger.log('[MintPreview] Transaction pending without hash - MetaMask should open')

      // Clear existing timeout
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current)
      }

      // Set timeout to show warning
      pendingTimeoutRef.current = setTimeout(() => {
        logger.warn('[MintPreview] MetaMask did not open after 5 seconds')
        setShowMetaMaskWarning(true)
      }, 5000) // 5 seconds
    } else {
      // Clear timeout if we got a hash or no longer pending
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current)
        pendingTimeoutRef.current = null
      }
      setShowMetaMaskWarning(false)
    }

    return () => {
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current)
      }
    }
  }, [
    isMinting,
    isRedeemingBTD,
    isRedeemingBTB,
    isProcessing,
    isSigningRedeemBTD,
    mintHash,
    redeemBTDHash,
    redeemBTBHash,
  ])

  const handleMaxClick = () => {
    if (mode === 'mint') {
      setInputAmount(wbtcBalance)
    } else if (mode === 'redeemBTD') {
      setInputAmount(btdBalance)
    } else {
      setInputAmount(btbBalance)
    }
  }

  const hasInsufficientBalance = () => {
    if (!inputAmount || inputAmount === '0') return false
    try {
      const amount = Number(inputAmount)
      if (mode === 'mint') {
        return amount > Number(wbtcBalance)
      } else if (mode === 'redeemBTD') {
        return amount > Number(btdBalance)
      } else {
        return amount > Number(btbBalance)
      }
    } catch {
      return false
    }
  }

  const isButtonDisabled = () => {
    if (isMinting || isRedeemingBTD || isRedeemingBTB || isProcessing) return true
    if (mode === 'redeemBTD' && isSigningRedeemBTD) return true

    if (!isConnected) {
      return !openConnectModal
    }

    // Cooldown check
    if (currentCooldown.isInCooldown) return true

    if (!inputAmount || inputAmount === '0') return true

    if (hasInsufficientBalance()) return true

    if (!isPricingReady) return true

    // BTB can only be redeemed when CR >= 100%
    if (mode === 'redeemBTB' && collateralRatio < 100) return true

    return false
  }

  const handleAction = async () => {
    logger.log('[MintPreview] handleAction called', { isConnected, mode, inputAmount })

    if (!isConnected) {
      logger.log('[MintPreview] Not connected, opening connect modal')
      openConnectModal?.()
      return
    }

    if (!inputAmount || inputAmount === '0') {
      alert('⚠️ Please enter an amount')
      return
    }

    if (!isPricingReady) {
      alert('⏳ Price data is still loading. Please try again in a moment.')
      return
    }

    try {
      const expectedOutput =
        mode === 'mint'
          ? calculateMintOutput(inputAmount, btcPrice, iusdPrice, mintFeeBP)
          : calculateRedeemOutput(inputAmount, btcPrice, iusdPrice, redeemFeeBP)

      logger.log('[MintPreview] Expected output:', expectedOutput)

      setPendingResult({
        type: mode,
        output: expectedOutput,
      })

      if (mode === 'mint') {
        await approveAndExecute({
          tokenAddress: CONTRACTS.WBTC,
          spenderAddress: CONTRACTS.Minter,
          amount: inputAmount,
          decimals: TOKEN_DECIMALS.WBTC,
          actionName: 'mint',
          executeAction: async () => {
            logger.log('[MintPreview] Executing mint transaction')
            await mintBTD(inputAmount)
          },
        })
        logger.log('[MintPreview] Mint transaction completed successfully')
        return
      }

      if (mode === 'redeemBTD') {
        logger.log('[MintPreview] Redeeming BTD with permit...')
        await redeemBTD(inputAmount)
        logger.log('[MintPreview] Redeem transaction submitted')
        return
      }

      logger.log('[MintPreview] Redeeming BTB with permit...')
      await redeemBTB(inputAmount)
      logger.log('[MintPreview] BTB conversion submitted')
    } catch (error: any) {
      const message = (error?.message || '').toLowerCase()
      if (message.includes('wallet not connected') || message.includes('walletclient')) {
        openConnectModal?.()
        return
      }

      logger.error('[MintPreview] Transaction error:', error)
      logger.error('[MintPreview] Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      })

      // Parse specific error messages
      let errorMessage = '❌ Transaction failed'
      let errorDetails = ''

      if (error.message) {
        const msg = error.message.toLowerCase()

        // Rate limit / Too frequent
        if (msg.includes('too frequent') || msg.includes('cooldown')) {
          errorMessage = 'Operation Cooldown'
          const intervalSec = currentCooldown.interval
          errorDetails = `To prevent malicious attacks and protect system security, each operation requires a ${intervalSec} second cooldown period.

Please wait for the countdown to finish and try again.

Cooldown is part of the system's security mechanism.`
        }
        // Price volatility check
        else if (msg.includes('wbtc price mismatch') || msg.includes('price mismatch >1%')) {
          errorMessage = 'BTC Price Volatility Too High'
          errorDetails = `Due to market price fluctuation exceeding 1%, the system has paused mint operations to protect user assets.

This is a normal security mechanism.

Please try again later, or contact admin to update price data.

Technical details: Chainlink price and Uniswap pool price difference >1%`
        }
        // Insufficient balance
        else if (msg.includes('insufficient') || msg.includes('exceeds balance')) {
          errorMessage = 'Insufficient Balance'
          errorDetails = `Please check:
1. WBTC balance is sufficient
2. ETH balance is enough to pay for gas`
        }
        // Not approved
        else if (msg.includes('allowance') || msg.includes('not approved')) {
          errorMessage = 'Not Approved'
          errorDetails = `Token approval failed`
        }
        // Gas estimation failed
        else if (msg.includes('gas') && msg.includes('fail')) {
          errorMessage = 'Gas Estimation Failed'
          errorDetails = `Transaction may fail, please check:
1. Contract state is normal
2. Input parameters are correct
3. Account balance is sufficient`
        }
        // Generic error
        else {
          errorDetails = `${error.message}\n\nPlease check:
1. Sufficient balance
2. Token is approved
3. Network connection
4. MetaMask is unlocked`
        }
      }

      alert(`${errorMessage}\n\n${errorDetails}`)
    }
  }

  const getButtonText = () => {
    if (!isConnected) {
      if (mode === 'mint') return 'Connect Wallet to Mint'
      if (mode === 'redeemBTD') return 'Connect Wallet to Redeem BTD'
      return 'Connect Wallet to Redeem BTB'
    }

    // Cooldown check - show countdown
    if (currentCooldown.isInCooldown) {
      const timeStr = formatCooldownTime(currentCooldown.remainingSeconds)
      if (mode === 'mint') return `Cooldown: ${timeStr}`
      if (mode === 'redeemBTD') return `Cooldown: ${timeStr}`
      return `Cooldown: ${timeStr}`
    }

    // Check insufficient balance first
    if (hasInsufficientBalance()) {
      if (mode === 'mint') return 'Insufficient WBTC Balance'
      if (mode === 'redeemBTD') return 'Insufficient BTD Balance'
      return 'Insufficient BTB Balance'
    }

    // BTB can only be redeemed when CR >= 100%
    if (mode === 'redeemBTB' && collateralRatio < 100) {
      return `CR ${collateralRatio.toFixed(1)}% < 100%, BTB Not Redeemable`
    }

    if (mode === 'redeemBTD' && isSigningRedeemBTD) return 'Signing Permit...'
    if (mode === 'redeemBTB' && isSigningRedeemBTB) return 'Signing Permit...'
    if (isProcessing) return 'Processing...'
    if (isMinting) return 'Confirming Mint...'
    if (isRedeemingBTD) return 'Confirming Redeem BTD...'
    if (isRedeemingBTB) return 'Converting BTB to BTD...'

    if (!isPricingReady) return 'Waiting for prices...'

    if (mode === 'mint') {
      return needsWBTCApproval ? 'Approve WBTC & Mint BTD' : 'Mint BTD'
    }
    if (mode === 'redeemBTD') {
      return 'Redeem BTD'
    }
    return 'Convert BTB to BTD'
  }

  const handleButtonClick = () => {
    if (!isConnected) {
      openConnectModal?.()
    } else {
      handleAction()
    }
  }

  return (
    <div className="space-y-4">
      {/* Mode Tabs */}
      {embedded ? (
        // Embedded mode: original border-bottom style
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            onClick={() => setMode('mint')}
            className={`px-6 py-3 font-medium transition-colors ${
              mode === 'mint'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Mint BTD
          </button>
          <button
            onClick={() => setMode('redeemBTD')}
            className={`px-6 py-3 font-medium transition-colors ${
              mode === 'redeemBTD'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Redeem BTD
          </button>
          <button
            onClick={() => setMode('redeemBTB')}
            className={`px-6 py-3 font-medium transition-colors ${
              mode === 'redeemBTB'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Redeem BTB
          </button>
        </div>
      ) : (
        // Standalone mode: highlighted grid style
        <div className="grid grid-cols-3 gap-3 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg mb-6">
          <button
            onClick={() => setMode('mint')}
            className={`px-6 py-3 rounded-lg font-semibold text-base transition-all ${
              mode === 'mint'
                ? 'bg-primary-600 text-white shadow-md hover:bg-primary-700'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            Mint BTD
          </button>
          <button
            onClick={() => setMode('redeemBTD')}
            className={`px-6 py-3 rounded-lg font-semibold text-base transition-all ${
              mode === 'redeemBTD'
                ? 'bg-primary-600 text-white shadow-md hover:bg-primary-700'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            Redeem BTD
          </button>
          <button
            onClick={() => setMode('redeemBTB')}
            className={`px-6 py-3 rounded-lg font-semibold text-base transition-all ${
              mode === 'redeemBTB'
                ? 'bg-primary-600 text-white shadow-md hover:bg-primary-700'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            Redeem BTB
          </button>
        </div>
      )}

      {/* Input Section */}
      <div className="space-y-0">
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-1 min-h-[100px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">From</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Balance:{' '}
              {mode === 'mint' ? formatTokenAmount(Number(wbtcBalance), 'WBTC') : mode === 'redeemBTD' ? formatTokenAmount(Number(btdBalance), 'BTD') : formatTokenAmount(Number(btbBalance), 'BTB')}
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <div className="flex-1 min-w-0">
              <input
                type="number"
                min={minInputAmount}
                step="any"
                value={inputAmount}
                onKeyDown={blockInvalidNumberInput}
                onChange={e => {
                  const value = e.target.value
                  if (!value || Number(value) >= 0) {
                    setInputAmount(value)
                  }
                }}
                onBlur={e => {
                  // Auto-adjust to minimum value on blur
                  const value = e.target.value
                  if (value && Number(value) > 0 && Number(value) < Number(minInputAmount)) {
                    setInputAmount(minInputAmount)
                  }
                }}
                placeholder="0.0"
                className="w-full bg-transparent text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white outline-none"
              />
              {/* USD value display */}
              {inputAmount && Number(inputAmount) > 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  ≈ ${inputUSDValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
              {/* Minimum value hint */}
              {!inputAmount && minInputAmount !== '0' && (
                <div className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">
                  min {minInputAmount}
                </div>
              )}
            </div>
            <button
              onClick={handleMaxClick}
              className="px-2 py-1 text-xs sm:text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/20 rounded-lg transition-colors flex-shrink-0"
            >
              MAX
            </button>
            <div className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex-shrink-0 min-h-[2.25rem] sm:min-h-0">
              {mode === 'mint' ? (
                <>
                  <img src="/tokens/wbtc.png" alt="WBTC" className="w-5 h-5 rounded-full" />
                  <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                    WBTC
                  </span>
                </>
              ) : mode === 'redeemBTD' ? (
                <>
                  <div className="w-5 h-5 bg-btd-DEFAULT rounded-full" />
                  <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                    BTD
                  </span>
                </>
              ) : (
                <>
                  <div className="w-5 h-5 bg-btb-DEFAULT rounded-full" />
                  <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                    BTB
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center -my-4 relative z-10">
          <div className="w-10 h-10 bg-white dark:bg-gray-800 border-4 border-gray-50 dark:border-gray-900 rounded-full flex items-center justify-center shadow-md">
            <ArrowDown className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </div>
        </div>

        {/* Output Section */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mt-1 min-h-[100px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">To (estimated)</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Balance:{' '}
              {mode === 'mint' ? formatTokenAmount(Number(btdBalance), 'BTD') : mode === 'redeemBTD' ? formatTokenAmount(Number(wbtcBalance), 'WBTC') : formatTokenAmount(Number(btdBalance), 'BTD')}
            </span>
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
                if (mode === 'mint') {
                  usdValue = amount * btdPrice
                } else if (mode === 'redeemBTD') {
                  usdValue = amount * btcPrice
                } else if (mode === 'redeemBTB') {
                  usdValue = amount * btdPrice
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
            <div className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex-shrink-0 min-h-[2.25rem] sm:min-h-0">
              {mode === 'mint' ? (
                <>
                  <div className="w-5 h-5 bg-btd-DEFAULT rounded-full" />
                  <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                    BTD
                  </span>
                </>
              ) : mode === 'redeemBTD' ? (
                <>
                  <img src="/tokens/wbtc.png" alt="WBTC" className="w-5 h-5 rounded-full" />
                  <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                    WBTC
                  </span>
                </>
              ) : (
                <>
                  <div className="w-5 h-5 bg-btd-DEFAULT rounded-full" />
                  <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                    BTD
                  </span>
                </>
              )}
            </div>
          </div>

          {/* BTB Compensation (when CR < 100%) */}
          {mode === 'redeemBTD' && Number(redemptionOutputs.btbOut) > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">+ BTB Compensation</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-3">
                <div className="flex-1">
                  <div className="text-lg sm:text-xl font-semibold text-btb-DEFAULT">
                    {redemptionOutputs.btbOut}
                  </div>
                  {/* BTB USD value display */}
                  {(() => {
                    const btbAmount = Number(redemptionOutputs.btbOut)
                    const btbUsdValue = btbAmount * btbPrice
                    return btbUsdValue > 0 ? (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        ≈ ${btbUsdValue.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </div>
                    ) : null
                  })()}
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex-shrink-0">
                  <div className="w-5 h-5 bg-btb-DEFAULT rounded-full" />
                  <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                    BTB
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* BRS Compensation (when CR < 100% and BTB price < 0.5) */}
          {mode === 'redeemBTD' && Number(redemptionOutputs.brsOut) > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">+ BRS Compensation</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-3">
                <div className="flex-1">
                  <div className="text-lg sm:text-xl font-semibold text-brs-DEFAULT">
                    {redemptionOutputs.brsOut}
                  </div>
                  {/* BRS USD value display */}
                  {(() => {
                    const brsAmount = Number(redemptionOutputs.brsOut)
                    const brsUsdValue = brsAmount * brsPrice
                    return brsUsdValue > 0 ? (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        ≈ ${brsUsdValue.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </div>
                    ) : null
                  })()}
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex-shrink-0">
                  <div className="w-5 h-5 bg-brs-DEFAULT rounded-full" />
                  <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                    BRS
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">BTC Price</span>
          <span className="font-medium text-gray-900 dark:text-white">
            ${btcPrice.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">IUSD Price</span>
          <span className="font-medium text-gray-900 dark:text-white">${iusdPrice.toFixed(4)}</span>
        </div>
        {mode === 'redeemBTB' && (
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Collateral Ratio</span>
            <span
              className={`font-medium ${collateralRatio >= 100 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
            >
              {collateralRatio.toFixed(2)}%
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Exchange Rate</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {mode === 'mint'
              ? `1 WBTC = ${(btcPrice / iusdPrice).toFixed(2)} BTD`
              : mode === 'redeemBTD'
                ? `1 BTD = ${(iusdPrice / btcPrice).toFixed(6)} WBTC`
                : `1 BTB = 1 BTD`}
          </span>
        </div>
      </div>

      {/* MetaMask Warning (Mobile) */}
      {showMetaMaskWarning && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1 text-sm">
              <p className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                MetaMask did not open
              </p>
              <p className="text-yellow-700 dark:text-yellow-300 mb-3">
                {isMobile && !isMetaMaskBrowser ? (
                  <>
                    <strong>Recommendation:</strong> Use MetaMask's built-in browser for the best
                    experience.
                  </>
                ) : (
                  <>The transaction is waiting for MetaMask to open.</>
                )}
              </p>
              <div className="space-y-2">
                {isMobile && !isMetaMaskBrowser && (
                  <div className="text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/40 rounded p-2">
                    <p className="font-semibold mb-1">📱 How to use MetaMask Browser:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Open MetaMask App</li>
                      <li>Tap "Browser" at bottom</li>
                      <li>Enter: http://192.168.2.151:3000</li>
                      <li>Try mint again</li>
                    </ol>
                  </div>
                )}
                <div className="text-xs text-yellow-700 dark:text-yellow-300">
                  <p className="font-semibold mb-1">Or try these:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Switch to MetaMask app manually</li>
                    <li>Check if MetaMask is unlocked</li>
                    <li>Refresh page and try again</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval Info */}
      {isConnected && inputAmount && mode === 'mint' && needsWBTCApproval && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <Info className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm flex-1">
            <p className="font-medium text-yellow-900 dark:text-yellow-100">First-time approval required</p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              You'll approve WBTC spending once. Future mints won't need approval.
            </p>
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                <span className="w-4 h-4 rounded-full bg-yellow-200 dark:bg-yellow-800 text-xs flex items-center justify-center font-bold">
                  1
                </span>
                <span className="text-xs">Approve WBTC</span>
              </div>
              <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                <span className="w-4 h-4 rounded-full bg-yellow-200 dark:bg-yellow-800 text-xs flex items-center justify-center font-bold">
                  2
                </span>
                <span className="text-xs">Mint BTD</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cooldown Warning */}
      {isConnected && currentCooldown.isInCooldown && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm flex-1">
            <p className="font-medium text-blue-900 dark:text-blue-100">Operation Cooldown Active</p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              {mode === 'mint' && 'Minting'}
              {mode === 'redeemBTD' && 'Redeeming BTD'}
              {mode === 'redeemBTB' && 'Redeeming BTB'}
              {' '}has a {currentCooldown.interval} second cooldown to prevent rapid operations.
              Next operation available in <strong>{formatCooldownTime(currentCooldown.remainingSeconds)}</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handleButtonClick}
        disabled={isButtonDisabled()}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {getButtonText()}
      </button>

      {/* Mint BTD Info */}
      {mode === 'mint' && (
        <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-3 text-sm">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
            <div className="text-primary-900 dark:text-blue-100">
              <p className="font-semibold mb-1">About Minting BTD</p>
              <p className="text-primary-800 dark:text-blue-200 text-xs">
                Convert WBTC (Wrapped Bitcoin) into BTD stablecoin at current market rate. This is a
                conversion, not collateralization - your BTC value becomes BTD value based on BTC/IUSD
                exchange rate. BTD maintains parity with IUSD (CPI-adjusted purchasing power).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Redeem BTD Info */}
      {mode === 'redeemBTD' && (
        <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-3 text-sm">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
            <div className="text-primary-900 dark:text-blue-100">
              <p className="font-semibold mb-1">About Redeeming BTD</p>
              <p className="text-primary-800 dark:text-blue-200 text-xs">
                Redeem your BTD stablecoin for WBTC. When CR ≥ 100%, you receive full WBTC value.
                When CR &lt; 100%, you receive partial WBTC plus BTB bond compensation (and BRS if
                BTB price is low). This ensures fair value distribution during market stress.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* BTB Redemption Info */}
      {mode === 'redeemBTB' && (
        <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-3 text-sm">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
            <div className="text-primary-900 dark:text-blue-100">
              <p className="font-semibold mb-1">About BTB Redemption</p>
              <p className="text-primary-800 dark:text-blue-200 text-xs">
                BTB bonds can only be converted to BTD when the Collateral Ratio (CR) ≥ 100%. The
                conversion rate is 1:1 (1 BTB = 1 BTD). After conversion, you can redeem BTD for
                WBTC.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Browser Hint */}
      {isMobile && !isMetaMaskBrowser && !showMetaMaskWarning && (
        <div className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
          💡 Tip: Use MetaMask's built-in browser for better mobile experience
        </div>
      )}
    </div>
  )
}

export default MintPreview
