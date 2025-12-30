import { useMemo } from 'react'
import { logger } from '@/utils/logger'
import { useIUSDPrice } from './useMinter'
import { useCurrentRewardPerSecond, useTotalAllocPoint } from './useFarming'
import {
  useBRSPrice,
  useBTBPrice,
  useBTDPrice,
  useWETHPrice,
  useUSDCPrice,
  useUSDTPrice,
  useChainlinkBTCPrice,
} from './useSystemStats'

/**
 * Token prices for APY calculation
 * All prices from Chainlink feeds (for display purposes):
 * - BTC/WBTC: from Chainlink BTC/USD
 * - ETH/WETH: from Chainlink ETH/USD
 * - USDC: from Chainlink USDC/USD (fallback $1 on Sepolia)
 * - USDT: from Chainlink USDT/USD (fallback $1 on Sepolia)
 * - BTD/BTB/BRS: from PriceOracle (LP spot prices)
 */
export function useTokenPrices() {
  const { btcPrice } = useChainlinkBTCPrice()
  const { wethPrice } = useWETHPrice()
  const { usdcPrice } = useUSDCPrice()
  const { usdtPrice } = useUSDTPrice()
  const { iusdPrice } = useIUSDPrice()
  const { brsPrice } = useBRSPrice()
  const { btbPrice } = useBTBPrice()
  const { btdPrice } = useBTDPrice()

  const resolvedBTDPrice = useMemo(() => {
    const fallback = iusdPrice || 1
    return btdPrice || fallback
  }, [btdPrice, iusdPrice])

  const result = {
    BTC: btcPrice,
    WBTC: btcPrice,
    ETH: wethPrice,
    WETH: wethPrice,
    USDC: usdcPrice,
    USDT: usdtPrice,
    BTD: resolvedBTDPrice,
    BTB: btbPrice || resolvedBTDPrice,
    BRS: brsPrice || 0,
  }

  console.log('[Token Prices]', result)

  return result
}

/**
 * Calculate pool APR based on farming rewards
 * APR = (rewardPerSecond * secondsPerYear * rewardTokenPrice * poolAllocation) / (totalStaked * lpTokenPrice) * 100
 */
type PoolAPRResult = {
  value: number
  rewardPriceMissing: boolean
}

export function usePoolAPR(
  poolId: number,
  allocPoint: bigint,
  totalStaked: string,
  lpTokenPrice: number
) {
  const { rewardPerSecond } = useCurrentRewardPerSecond()
  const { totalAllocPoint } = useTotalAllocPoint()
  const prices = useTokenPrices()

  const aprResult = useMemo<PoolAPRResult>(() => {
    // Debug logging
    if (poolId === 6 || poolId === 7) {
      logger.log(`[Pool ${poolId}] APR Calculation:`, {
        rewardPerSecond,
        totalAllocPoint,
        allocPoint: allocPoint.toString(),
        totalStaked,
        lpTokenPrice,
        brsPrice: prices.BRS,
      })
    }

    // Check for missing values
    const totalStakedNum = parseFloat(totalStaked || '0')
    const rewardTokenPrice = prices.BRS || 0
    if (
      !rewardPerSecond ||
      totalAllocPoint === 0 ||
      totalStakedNum === 0 ||
      lpTokenPrice === 0 ||
      rewardTokenPrice === 0
    ) {
      logger.warn(`[Pool ${poolId}] APR = 0 due to missing values`)
      return {
        value: 0,
        rewardPriceMissing: rewardTokenPrice === 0,
      }
    }

    try {
      const secondsPerYear = 365 * 24 * 60 * 60
      const rewardPerSecondNum = parseFloat(rewardPerSecond)
      const totalAllocPointNum = Number(totalAllocPoint)

      // Pool's share of total rewards
      const poolWeight = Number(allocPoint) / totalAllocPointNum

      // Annual BRS rewards for this pool
      const annualRewards = rewardPerSecondNum * secondsPerYear * poolWeight

      // Value of annual rewards in USD
      const rewardValue = annualRewards * rewardTokenPrice

      // Value of total staked LP tokens in USD
      const stakedValue = totalStakedNum * lpTokenPrice

      // APR as percentage
      const calculatedAPR = (rewardValue / stakedValue) * 100

      if (poolId === 6 || poolId === 7) {
        logger.log(`[Pool ${poolId}] APR Result:`, {
          poolWeight: (poolWeight * 100).toFixed(2) + '%',
          annualRewards: annualRewards.toFixed(2),
          rewardValue: rewardValue.toFixed(2),
          stakedValue: stakedValue.toFixed(2),
          apr: calculatedAPR.toFixed(2) + '%',
        })
      }

      const safeAPR = isNaN(calculatedAPR) || !isFinite(calculatedAPR) ? 0 : calculatedAPR
      return {
        value: safeAPR,
        rewardPriceMissing: false,
      }
    } catch (error) {
      logger.error(`[Pool ${poolId}] Error calculating APR:`, error)
      return {
        value: 0,
        rewardPriceMissing: false,
      }
    }
  }, [
    poolId,
    rewardPerSecond,
    totalAllocPoint,
    allocPoint,
    totalStaked,
    lpTokenPrice,
    prices.BRS,
  ])

  return aprResult
}

/**
 * Convert APR to APY (compound daily)
 * APY = (1 + APR/365)^365 - 1
 *
 * @param apr Annual Percentage Rate
 * @returns Annual Percentage Yield with daily compounding
 *
 * Note:
 * - Always attempts to calculate true APY, even for very high APR values
 * - If calculation overflows to Infinity, returns Number.MAX_VALUE
 * - Returns the actual computed value, no matter how large
 * - Use formatAPY() to display large values in scientific notation
 */
export function aprToApy(apr: number): number {
  if (!Number.isFinite(apr) || apr === 0) return 0

  const dailyRate = apr / 100 / 365

  // If daily rate cannot be calculated, return 0 directly
  if (!Number.isFinite(dailyRate)) {
    return 0
  }

  // Calculate actual APY
  const apy = (Math.pow(1 + dailyRate, 365) - 1) * 100

  // Check for NaN
  if (isNaN(apy)) {
    return 0
  }

  // If overflow to Infinity, return Number.MAX_VALUE
  if (apy === Infinity) {
    return Number.MAX_VALUE
  }

  return apy
}

/**
 * Format APR/APY percentage for display
 * @param apy APY value to format
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted APY string with appropriate notation
 *
 * Display rules:
 * - 0: "0%"
 * - < 1,000: "123.45%" (2 decimal places)
 * - 1,000 - 999,999: "1.23K%" (K with 2 decimals)
 * - 1,000,000 - 999,999,999: "1.23M%" (M with 2 decimals)
 * - 1,000,000,000 - 999,999,999,999: "1.23B%" (B with 2 decimals)
 * - 1,000,000,000,000 - 999,999,999,999,999: "1.23T%" (T with 2 decimals)
 * - >= 1,000,000,000,000,000 (1000T+): "1.23e+15%" (scientific notation)
 * - Non-finite (NaN, Infinity): "N/A"
 */
export function formatAPY(apy: number, decimals: number = 2): string {
  if (apy === 0) return '0%'
  if (!Number.isFinite(apy)) return 'N/A'

  const isNegative = apy < 0
  const abs = Math.abs(apy)
  const sign = isNegative ? '-' : ''

  // >= 1000 trillion (1 quadrillion): use scientific notation
  if (abs >= 1_000_000_000_000_000) {
    return `${sign}${abs.toExponential(decimals)}%`
  }

  // >= 1 trillion: use T suffix
  if (abs >= 1_000_000_000_000) {
    return `${sign}${(abs / 1_000_000_000_000).toFixed(decimals)}T%`
  }

  // >= 1 billion: use B suffix
  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(decimals)}B%`
  }

  // >= 1 million: use M suffix
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(decimals)}M%`
  }

  // >= 1 thousand: use K suffix
  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(decimals)}K%`
  }

  // Default: keep decimals decimal places
  return `${sign}${abs.toFixed(decimals)}%`
}

/**
 * Hook to get complete APR/APY data for a pool
 */
export function usePoolAPY(
  poolId: number,
  allocPoint: bigint,
  totalStaked: string,
  lpTokenPrice: number
) {
  const { value: apr, rewardPriceMissing } = usePoolAPR(
    poolId,
    allocPoint,
    totalStaked,
    lpTokenPrice
  )
  const apy = rewardPriceMissing ? 0 : aprToApy(apr)

  const warningLabel = 'BRS price unavailable'
  const aprFormatted = rewardPriceMissing ? warningLabel : formatAPY(apr)
  const apyFormatted = rewardPriceMissing ? warningLabel : formatAPY(apy)

  return {
    apr,
    apy,
    aprFormatted,
    apyFormatted,
    rewardPriceMissing,
  }
}
