'use client'

import { useState, useEffect, useCallback } from 'react'
import { Droplets, Info, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useQueryClient } from '@tanstack/react-query'
import { CONTRACTS } from '@/config/contracts'
import { Faucet_ABI } from '@/abis'
import { useWBTCBalance, useUSDCBalance, useUSDTBalance } from '@/hooks/useBalances'
import { formatTokenAmount } from '@/utils/format'

function FaucetPage() {
  const { address, isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const queryClient = useQueryClient()
  const [countdown, setCountdown] = useState<number>(0)

  // Balances
  const { balance: wbtcBalance, refetch: refetchWBTC } = useWBTCBalance()
  const { balance: usdcBalance, refetch: refetchUSDC } = useUSDCBalance()
  const { balance: usdtBalance, refetch: refetchUSDT } = useUSDTBalance()

  // Read faucet status
  const { data: canClaimData, refetch: refetchCanClaim } = useReadContract({
    address: CONTRACTS.Faucet as `0x${string}`,
    abi: Faucet_ABI,
    functionName: 'canClaim',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!CONTRACTS.Faucet,
    },
  })

  const { data: remainingCooldown, refetch: refetchCooldown } = useReadContract({
    address: CONTRACTS.Faucet as `0x${string}`,
    abi: Faucet_ABI,
    functionName: 'getRemainingCooldown',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!CONTRACTS.Faucet,
    },
  })

  const { data: faucetBalances } = useReadContract({
    address: CONTRACTS.Faucet as `0x${string}`,
    abi: Faucet_ABI,
    functionName: 'getFaucetBalances',
    query: {
      enabled: !!CONTRACTS.Faucet,
    },
  })

  // Write contract
  const { writeContract, data: txHash, isPending, reset } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  const canClaim = canClaimData === true

  // Update countdown timer
  useEffect(() => {
    if (remainingCooldown && typeof remainingCooldown === 'bigint') {
      setCountdown(Number(remainingCooldown))
    } else {
      setCountdown(0)
    }
  }, [remainingCooldown])

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          refetchCanClaim()
          refetchCooldown()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [countdown, refetchCanClaim, refetchCooldown])

  // Refresh after successful claim
  useEffect(() => {
    if (isSuccess) {
      refetchWBTC()
      refetchUSDC()
      refetchUSDT()
      refetchCanClaim()
      refetchCooldown()
      queryClient.invalidateQueries()
      reset()
    }
  }, [isSuccess, refetchWBTC, refetchUSDC, refetchUSDT, refetchCanClaim, refetchCooldown, queryClient, reset])

  const handleClaim = useCallback(async () => {
    if (!isConnected && openConnectModal) {
      openConnectModal()
      return
    }

    if (!CONTRACTS.Faucet) {
      alert('Faucet contract not configured')
      return
    }

    writeContract({
      address: CONTRACTS.Faucet as `0x${string}`,
      abi: Faucet_ABI,
      functionName: 'claim',
    })
  }, [isConnected, openConnectModal, writeContract])

  // Format countdown
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Check if faucet is configured (not zero address)
  const isFaucetConfigured = !!CONTRACTS.Faucet &&
    CONTRACTS.Faucet !== '0x0000000000000000000000000000000000000000'

  // Faucet balances display
  const faucetWBTC = faucetBalances ? Number(faucetBalances[0]) / 1e8 : 0
  const faucetUSDC = faucetBalances ? Number(faucetBalances[1]) / 1e6 : 0
  const faucetUSDT = faucetBalances ? Number(faucetBalances[2]) / 1e6 : 0

  // Token list to display
  const tokens = [
    {
      symbol: 'WBTC',
      amount: '0.0001',
      description: 'Wrapped Bitcoin',
      balance: wbtcBalance,
      faucetBalance: faucetWBTC,
      color: 'bg-orange-500',
    },
    {
      symbol: 'USDC',
      amount: '10',
      description: 'USD Coin',
      balance: usdcBalance,
      faucetBalance: faucetUSDC,
      color: 'bg-blue-500',
    },
    {
      symbol: 'USDT',
      amount: '10',
      description: 'Tether USD',
      balance: usdtBalance,
      faucetBalance: faucetUSDT,
      color: 'bg-green-500',
    },
  ]

  const isProcessing = isPending || isConfirming

  const buttonText = !isConnected
    ? 'Connect Wallet'
    : !isFaucetConfigured
      ? 'Faucet Not Available'
      : isProcessing
        ? isConfirming
          ? 'Confirming...'
          : 'Claiming...'
        : !canClaim
          ? `Cooldown: ${formatCountdown(countdown)}`
          : 'Claim Tokens'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="card">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
            <Droplets className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Faucet</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Get test tokens for the Bitres testnet
            </p>
          </div>
        </div>

        {/* Token List */}
        <div className="space-y-3 mb-6">
          {tokens.map((token) => (
            <div
              key={token.symbol}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/60 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${token.color} rounded-full flex items-center justify-center`}>
                  <span className="text-white font-bold text-sm">
                    {token.symbol.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {token.amount} {token.symbol}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {token.description}
                  </div>
                </div>
              </div>
              {isConnected && (
                <div className="text-right">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Your Balance</div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {formatTokenAmount(Number(token.balance), token.symbol)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Cooldown Status */}
        {isConnected && !canClaim && countdown > 0 && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg mb-4">
            <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm text-yellow-800 dark:text-yellow-200">
              Next claim available in {formatCountdown(countdown)}
            </span>
          </div>
        )}

        {/* Success Message */}
        {isSuccess && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg mb-4">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-800 dark:text-green-200">
              Tokens claimed successfully!
            </span>
          </div>
        )}

        {/* Faucet Not Configured Warning */}
        {!isFaucetConfigured && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="text-sm text-red-800 dark:text-red-200">
              Faucet contract is not yet deployed on this network.
            </span>
          </div>
        )}

        {/* Claim Button */}
        <button
          onClick={handleClaim}
          disabled={
            (!isConnected && !openConnectModal) ||
            !isFaucetConfigured ||
            isProcessing ||
            (!canClaim && isConnected)
          }
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {buttonText}
        </button>

        {!isConnected && (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
            Connect your wallet to claim test tokens.
          </p>
        )}

        {/* Info Box */}
        <div className="card bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 text-sm text-primary-900 dark:text-blue-100 flex gap-3 mt-6">
          <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold mb-1">Test Token Faucet</p>
            <p className="text-primary-800 dark:text-blue-200">
              This faucet provides test tokens for the Bitres testnet. Each address can claim once
              every 10 minutes. These tokens have no real value and are for testing purposes only.
            </p>
          </div>
        </div>

        {/* Faucet Balances */}
        {isFaucetConfigured && faucetBalances && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/60 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Faucet Reserves
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <div className="text-gray-500 dark:text-gray-400">WBTC</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {faucetWBTC.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                </div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">USDC</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {faucetUSDC.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">USDT</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {faucetUSDT.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FaucetPage
