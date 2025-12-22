import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { logger } from '@/utils/logger'
import { parseUnits, formatUnits } from 'viem'
import { CONTRACTS, TOKEN_DECIMALS } from '@/config/contracts'
import { Minter_ABI as MinterABI } from '@/abis'
import { PriceOracle_ABI as PriceOracleABI } from '@/abis'
import { Config_ABI as ConfigABI } from '@/abis'
import { REFETCH_CONFIG_BY_TYPE } from '@/config/refetch'
import { useApproveAndExecute, useNeedsApproval } from './useApproveAndExecute'
import { usePermit } from './usePermit'
import { useState } from 'react'

// Default fee rate in basis points (0.5% = 50bp)
const DEFAULT_FEE_BP = 50

// Read collateral ratio
export function useCollateralRatio() {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.Minter,
    abi: MinterABI,
    functionName: 'getCollateralRatio',
    query: REFETCH_CONFIG_BY_TYPE.stats, // 12 second refresh
  })

  return {
    collateralRatio: data ? Number(formatUnits(data as bigint, 18)) * 100 : 0,
    isLoading,
    error,
  }
}

// Read BTC price from oracle
export function useBTCPrice() {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.PriceOracle,
    abi: PriceOracleABI,
    functionName: 'getWBTCPrice',
    query: REFETCH_CONFIG_BY_TYPE.price, // 6 second refresh for price data
  })

  return {
    btcPrice: data ? Number(formatUnits(data as bigint, 18)) : 0, // 18 decimals (not 8!)
    isLoading,
    error,
  }
}

// Read IUSD price
export function useIUSDPrice() {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.PriceOracle,
    abi: PriceOracleABI,
    functionName: 'getIUSDPrice',
    query: REFETCH_CONFIG_BY_TYPE.price, // 6 second refresh for price data
  })

  return {
    iusdPrice: data ? Number(formatUnits(data as bigint, 18)) : 0,
    isLoading,
    error,
  }
}

// Read mint fee rate (basis points)
export function useMintFee() {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.ConfigGov,
    abi: ConfigABI,
    functionName: 'mintFeeBP',
    query: REFETCH_CONFIG_BY_TYPE.config, // 30 second refresh for config data
  })

  return {
    mintFeeBP: data ? Number(data as bigint) : DEFAULT_FEE_BP,
    isLoading,
    error,
  }
}

// Read redeem fee rate (basis points)
export function useRedeemFee() {
  const { data, isLoading, error } = useReadContract({
    address: CONTRACTS.ConfigGov,
    abi: ConfigABI,
    functionName: 'redeemFeeBP',
    query: REFETCH_CONFIG_BY_TYPE.config, // 30 second refresh for config data
  })

  return {
    redeemFeeBP: data ? Number(data as bigint) : DEFAULT_FEE_BP,
    isLoading,
    error,
  }
}

// Mint BTD (with automatic WBTC approval)
export function useMintBTD() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { approveAndExecute, isProcessing: isApproving } = useApproveAndExecute()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const mintBTD = async (wbtcAmount: string) => {
    try {
      await approveAndExecute({
        tokenAddress: CONTRACTS.WBTC,
        spenderAddress: CONTRACTS.Minter,
        amount: wbtcAmount,
        decimals: TOKEN_DECIMALS.WBTC,
        actionName: 'Mint BTD',
        executeAction: async () => {
          const amount = parseUnits(wbtcAmount, TOKEN_DECIMALS.WBTC)

          writeContract({
            address: CONTRACTS.Minter,
            abi: MinterABI,
            functionName: 'mintBTD',
            args: [amount],
          })
        },
      })
    } catch (err) {
      logger.error('Mint BTD error:', err)
      throw err
    }
  }

  return {
    mintBTD,
    isPending: isPending || isApproving,
    isConfirming,
    isSuccess,
    error,
    hash,
  }
}

// Check if WBTC approval is needed for minting
export function useNeedsWBTCApproval(wbtcAmount: string) {
  return useNeedsApproval(CONTRACTS.WBTC, CONTRACTS.Minter, wbtcAmount, TOKEN_DECIMALS.WBTC)
}

// Redeem BTD
export function useRedeemBTD() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { signPermit } = usePermit()
  const [isSigningPermit, setIsSigningPermit] = useState(false)

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const redeemBTD = async (btdAmount: string) => {
    try {
      setIsSigningPermit(true)

      const permitSig = await signPermit({
        tokenAddress: CONTRACTS.BTD,
        spenderAddress: CONTRACTS.Minter,
        amount: btdAmount,
        decimals: TOKEN_DECIMALS.BTD,
      })

      setIsSigningPermit(false)

      const amount = parseUnits(btdAmount, TOKEN_DECIMALS.BTD)

      writeContract({
        address: CONTRACTS.Minter,
        abi: MinterABI,
        functionName: 'redeemBTDWithPermit',
        args: [amount, permitSig.deadline, permitSig.v, permitSig.r, permitSig.s],
      })
    } catch (err) {
      setIsSigningPermit(false)
      logger.error('Redeem BTD with permit error:', err)
      throw err
    }
  }

  return {
    redeemBTD,
    isPending: isPending || isSigningPermit,
    isSigningPermit,
    isConfirming,
    isSuccess,
    error,
    hash,
  }
}

// Redeem BTB
export function useRedeemBTB() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { signPermit } = usePermit()
  const [isSigningPermit, setIsSigningPermit] = useState(false)

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const redeemBTB = async (btbAmount: string) => {
    try {
      setIsSigningPermit(true)

      const permitSig = await signPermit({
        tokenAddress: CONTRACTS.BTB,
        spenderAddress: CONTRACTS.Minter,
        amount: btbAmount,
        decimals: TOKEN_DECIMALS.BTB,
      })

      setIsSigningPermit(false)

      const amount = parseUnits(btbAmount, TOKEN_DECIMALS.BTB)

      writeContract({
        address: CONTRACTS.Minter,
        abi: MinterABI,
        functionName: 'redeemBTBWithPermit',
        args: [amount, permitSig.deadline, permitSig.v, permitSig.r, permitSig.s],
      })
    } catch (err) {
      setIsSigningPermit(false)
      logger.error('Redeem BTB with permit error:', err)
      throw err
    }
  }

  return {
    redeemBTB,
    isPending: isPending || isSigningPermit,
    isSigningPermit,
    isConfirming,
    isSuccess,
    error,
    hash,
  }
}

/**
 * Calculate mint output (BTD amount after fee deduction)
 * @param wbtcAmount WBTC input amount
 * @param btcPrice BTC price in USD
 * @param iusdPrice IUSD price in USD
 * @param feeBP Fee rate in basis points (50 = 0.5%)
 * @param decimals Output decimal places
 * @returns BTD amount user will receive after fee
 */
export function calculateMintOutput(
  wbtcAmount: string,
  btcPrice: number,
  iusdPrice: number,
  feeBP: number = DEFAULT_FEE_BP,
  decimals: number = 2
): string {
  if (!wbtcAmount || !btcPrice || !iusdPrice) return '0'

  const wbtc = Number(wbtcAmount)
  if (Number.isNaN(wbtc)) return '0'

  // Gross BTD amount (before fee)
  const btdGross = (wbtc * btcPrice) / iusdPrice

  // Fee deduction: user receives = gross * (1 - feeBP/10000)
  const feeMultiplier = 1 - feeBP / 10000
  const btdNet = btdGross * feeMultiplier

  return btdNet.toFixed(decimals)
}

/**
 * Calculate redeem output (WBTC amount after fee deduction)
 * @param btdAmount BTD input amount
 * @param btcPrice BTC price in USD
 * @param iusdPrice IUSD price in USD
 * @param feeBP Fee rate in basis points (50 = 0.5%)
 * @param decimals Output decimal places
 * @returns WBTC amount user will receive after fee
 */
export function calculateRedeemOutput(
  btdAmount: string,
  btcPrice: number,
  iusdPrice: number,
  feeBP: number = DEFAULT_FEE_BP,
  decimals: number = 8
): string {
  if (!btdAmount || !btcPrice || !iusdPrice) return '0'

  const btd = Number(btdAmount)
  if (Number.isNaN(btd)) return '0'

  // Fee is deducted from input BTD first
  const feeMultiplier = 1 - feeBP / 10000
  const effectiveBTD = btd * feeMultiplier

  // WBTC output based on effective BTD amount
  const wbtcAmount = (effectiveBTD * iusdPrice) / btcPrice

  return wbtcAmount.toFixed(decimals)
}
