import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { aprToApy, formatAPY, useTokenPrices, usePoolAPR, usePoolAPY } from './useAPY'
import * as useMinter from './useMinter'
import * as useFarming from './useFarming'
import * as useSystemStats from './useSystemStats'

// Mock dependent hooks
vi.mock('./useMinter', () => ({
  useBTCPrice: vi.fn(),
  useIUSDPrice: vi.fn(),
}))

vi.mock('./useFarming', () => ({
  useCurrentRewardPerSecond: vi.fn(),
  useTotalAllocPoint: vi.fn(),
}))

vi.mock('./useSystemStats', () => ({
  useBRSPrice: vi.fn(),
  useBTBPrice: vi.fn(),
  useBTDPrice: vi.fn(),
}))

describe('useAPY utilities', () => {
  describe('aprToApy', () => {
    it('should return 0 when APR is 0', () => {
      expect(aprToApy(0)).toBe(0)
    })

    it('should convert 10% APR to approximately 10.52% APY (daily compounding)', () => {
      const apy = aprToApy(10)
      expect(apy).toBeGreaterThan(10) // APY should be higher than APR
      expect(apy).toBeCloseTo(10.516, 2) // (1 + 0.1/365)^365 - 1
    })

    it('should convert 100% APR to approximately 171.46% APY', () => {
      const apy = aprToApy(100)
      expect(apy).toBeCloseTo(171.46, 1)
    })

    it('should convert 1000% APR to very high APY', () => {
      const apy = aprToApy(1000)
      expect(apy).toBeGreaterThan(1000000) // With daily compounding, 1000% APR is astronomical
      // (1 + 1000/100/365)^365 - 1 ≈ 1925283
      expect(apy).toBeCloseTo(1925283, -3) // Within 1000
    })

    it('should handle very small APR values', () => {
      const apy = aprToApy(0.1)
      expect(apy).toBeGreaterThan(0.1)
      expect(apy).toBeLessThan(0.11)
    })

    it('should handle very large APR values without returning Infinity', () => {
      const apy = aprToApy(100000)
      expect(apy).not.toBe(Infinity)
      expect(isFinite(apy)).toBe(true)
    })

    it('should return 0 for NaN or Infinity input', () => {
      expect(aprToApy(NaN)).toBe(0)
      expect(aprToApy(Infinity)).toBe(0)
    })

    it('should handle negative APR by returning 0 or negative APY', () => {
      const apy = aprToApy(-10)
      // Daily rate = -10/100/365 = -0.000274
      // (1 - 0.000274)^365 - 1 ≈ -9.52%
      expect(apy).toBeLessThan(0)
    })
  })

  describe('formatAPY', () => {
    it('should format 0% correctly', () => {
      expect(formatAPY(0)).toBe('0%')
    })

    it('should format small APY with 2 decimals by default', () => {
      expect(formatAPY(5.67)).toBe('5.67%')
      expect(formatAPY(10.12)).toBe('10.12%')
      expect(formatAPY(99.99)).toBe('99.99%')
    })

    it('should format APY with custom decimals', () => {
      expect(formatAPY(5.6789, 0)).toBe('6%')
      expect(formatAPY(5.6789, 2)).toBe('5.68%')
      expect(formatAPY(5.6789, 3)).toBe('5.679%')
    })

    it('should format APY >= 1000 with K suffix', () => {
      expect(formatAPY(1000)).toBe('1.00K%')
      expect(formatAPY(1234)).toBe('1.23K%')
      expect(formatAPY(5678)).toBe('5.68K%')
      expect(formatAPY(10000)).toBe('10.00K%')
      expect(formatAPY(999999)).toBe('1000.00K%')
    })

    it('should format APY >= 1M with M suffix', () => {
      expect(formatAPY(1000000)).toBe('1.00M%')
      expect(formatAPY(1234567)).toBe('1.23M%')
      expect(formatAPY(50000000)).toBe('50.00M%')
      expect(formatAPY(999999999)).toBe('1000.00M%')
    })

    it('should format APY >= 1B with B suffix', () => {
      expect(formatAPY(1000000000)).toBe('1.00B%')
      expect(formatAPY(1234567890)).toBe('1.23B%')
      expect(formatAPY(50000000000)).toBe('50.00B%')
      expect(formatAPY(999999999999)).toBe('1000.00B%')
    })

    it('should format APY >= 1T with T suffix', () => {
      expect(formatAPY(1000000000000)).toBe('1.00T%')
      expect(formatAPY(1234567890000)).toBe('1.23T%')
      expect(formatAPY(50000000000000)).toBe('50.00T%')
      expect(formatAPY(999999999999999)).toBe('1000.00T%')
    })

    it('should format APY >= 1000T with scientific notation', () => {
      expect(formatAPY(1000000000000000)).toBe('1.00e+15%')
      expect(formatAPY(1234567890000000)).toBe('1.23e+15%')
      expect(formatAPY(1e20)).toBe('1.00e+20%')
    })

    it('should format very small APY correctly', () => {
      expect(formatAPY(0.001)).toBe('0.00%')
      expect(formatAPY(0.05, 2)).toBe('0.05%')
      expect(formatAPY(0.123, 3)).toBe('0.123%')
    })

    it('should handle negative APY with K/M/B/T suffixes', () => {
      expect(formatAPY(-5.67)).toBe('-5.67%')
      expect(formatAPY(-1234)).toBe('-1.23K%')
      expect(formatAPY(-1234567)).toBe('-1.23M%')
      expect(formatAPY(-1234567890)).toBe('-1.23B%')
      expect(formatAPY(-1234567890000)).toBe('-1.23T%')
      expect(formatAPY(-1e16)).toBe('-1.00e+16%')
    })

    it('should return N/A for non-finite values', () => {
      expect(formatAPY(NaN)).toBe('N/A')
      expect(formatAPY(Infinity)).toBe('N/A')
      expect(formatAPY(-Infinity)).toBe('N/A')
    })
  })

  describe('useTokenPrices', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should return all token prices from hooks', () => {
      // Mock price hooks
      vi.mocked(useMinter.useBTCPrice).mockReturnValue({ btcPrice: 100000 } as never)
      vi.mocked(useMinter.useIUSDPrice).mockReturnValue({ iusdPrice: 1.02 } as never)
      vi.mocked(useSystemStats.useBRSPrice).mockReturnValue({ brsPrice: 10 } as never)
      vi.mocked(useSystemStats.useBTBPrice).mockReturnValue({ btbPrice: 0.98 } as never)
      vi.mocked(useSystemStats.useBTDPrice).mockReturnValue({ btdPrice: 1.01 } as never)

      const { result } = renderHook(() => useTokenPrices())

      expect(result.current.BTC).toBe(100000)
      expect(result.current.WBTC).toBe(100000) // Same as BTC
      expect(result.current.USDC).toBe(1.0)
      expect(result.current.USDT).toBe(1.0)
      expect(result.current.BTD).toBe(1.01)
      expect(result.current.BTB).toBe(0.98)
      expect(result.current.BRS).toBe(10)
    })

    it('should use IUSD price as fallback when BTD price is not available', () => {
      vi.mocked(useMinter.useBTCPrice).mockReturnValue({ btcPrice: 100000 } as never)
      vi.mocked(useMinter.useIUSDPrice).mockReturnValue({ iusdPrice: 1.05 } as never)
      vi.mocked(useSystemStats.useBRSPrice).mockReturnValue({ brsPrice: 10 } as never)
      vi.mocked(useSystemStats.useBTBPrice).mockReturnValue({ btbPrice: null } as never)
      vi.mocked(useSystemStats.useBTDPrice).mockReturnValue({ btdPrice: null } as never)

      const { result } = renderHook(() => useTokenPrices())

      expect(result.current.BTD).toBe(1.05) // Falls back to IUSD
      expect(result.current.BTB).toBe(1.05) // Falls back to resolved BTD price
    })

    it('should use 1 as fallback when both IUSD and BTD are unavailable', () => {
      vi.mocked(useMinter.useBTCPrice).mockReturnValue({ btcPrice: 100000 } as never)
      vi.mocked(useMinter.useIUSDPrice).mockReturnValue({ iusdPrice: null } as never)
      vi.mocked(useSystemStats.useBRSPrice).mockReturnValue({ brsPrice: 10 } as never)
      vi.mocked(useSystemStats.useBTBPrice).mockReturnValue({ btbPrice: null } as never)
      vi.mocked(useSystemStats.useBTDPrice).mockReturnValue({ btdPrice: null } as never)

      const { result } = renderHook(() => useTokenPrices())

      expect(result.current.BTD).toBe(1) // Falls back to 1
      expect(result.current.BTB).toBe(1) // Falls back to resolved BTD price
    })

    it('should return 0 for BRS when price is not available', () => {
      vi.mocked(useMinter.useBTCPrice).mockReturnValue({ btcPrice: 100000 } as never)
      vi.mocked(useMinter.useIUSDPrice).mockReturnValue({ iusdPrice: 1.0 } as never)
      vi.mocked(useSystemStats.useBRSPrice).mockReturnValue({ brsPrice: null } as never)
      vi.mocked(useSystemStats.useBTBPrice).mockReturnValue({ btbPrice: 1.0 } as never)
      vi.mocked(useSystemStats.useBTDPrice).mockReturnValue({ btdPrice: 1.0 } as never)

      const { result } = renderHook(() => useTokenPrices())

      expect(result.current.BRS).toBe(0)
    })

    it('should always return 1 for stablecoins (USDC, USDT)', () => {
      vi.mocked(useMinter.useBTCPrice).mockReturnValue({ btcPrice: 100000 } as never)
      vi.mocked(useMinter.useIUSDPrice).mockReturnValue({ iusdPrice: 1.0 } as never)
      vi.mocked(useSystemStats.useBRSPrice).mockReturnValue({ brsPrice: 10 } as never)
      vi.mocked(useSystemStats.useBTBPrice).mockReturnValue({ btbPrice: 1.0 } as never)
      vi.mocked(useSystemStats.useBTDPrice).mockReturnValue({ btdPrice: 1.0 } as never)

      const { result } = renderHook(() => useTokenPrices())

      expect(result.current.USDC).toBe(1.0)
      expect(result.current.USDT).toBe(1.0)
    })
  })

  describe('usePoolAPR', () => {
    beforeEach(() => {
      vi.clearAllMocks()

      // Setup default mocks
      vi.mocked(useMinter.useBTCPrice).mockReturnValue({ btcPrice: 100000 } as never)
      vi.mocked(useMinter.useIUSDPrice).mockReturnValue({ iusdPrice: 1.0 } as never)
      vi.mocked(useSystemStats.useBRSPrice).mockReturnValue({ brsPrice: 10 } as never)
      vi.mocked(useSystemStats.useBTBPrice).mockReturnValue({ btbPrice: 1.0 } as never)
      vi.mocked(useSystemStats.useBTDPrice).mockReturnValue({ btdPrice: 1.0 } as never)
    })

    it('should calculate APR correctly for a pool', () => {
      // Mock farming data
      // rewardPerSecond = 1 BRS/s = 31,536,000 BRS/year
      // BRS price = $10
      // Total alloc = 1000
      // Pool alloc = 100 (10% of total)
      // Annual pool rewards = 31,536,000 * 10% = 3,153,600 BRS
      // Reward value = 3,153,600 * $10 = $31,536,000
      // Staked value = 1000 LP * $1000/LP = $1,000,000
      // APR = ($31,536,000 / $1,000,000) * 100 = 3153.6%

      vi.mocked(useFarming.useCurrentRewardPerSecond).mockReturnValue({
        rewardPerSecond: '1',
      } as never)
      vi.mocked(useFarming.useTotalAllocPoint).mockReturnValue({
        totalAllocPoint: 1000n,
      } as never)

      const { result } = renderHook(() =>
        usePoolAPR(
          0, // poolId
          100n, // allocPoint (10%)
          '1000', // totalStaked (1000 LP tokens)
          1000 // lpTokenPrice ($1000 per LP)
        )
      )

      // APR should be around 3153.6%
      expect(result.current.value).toBeGreaterThan(3100)
      expect(result.current.value).toBeLessThan(3200)
      expect(result.current.value).toBeCloseTo(3153.6, 0)
      expect(result.current.rewardPriceMissing).toBe(false)
    })

    it('should return 0 when rewardPerSecond is not available', () => {
      vi.mocked(useFarming.useCurrentRewardPerSecond).mockReturnValue({
        rewardPerSecond: null,
      } as never)
      vi.mocked(useFarming.useTotalAllocPoint).mockReturnValue({
        totalAllocPoint: 1000n,
      } as never)

      const { result } = renderHook(() => usePoolAPR(0, 100n, '1000', 1000))

      expect(result.current.value).toBe(0)
    })

    it('should return 0 when totalStaked is 0', () => {
      vi.mocked(useFarming.useCurrentRewardPerSecond).mockReturnValue({
        rewardPerSecond: '1',
      } as never)
      vi.mocked(useFarming.useTotalAllocPoint).mockReturnValue({
        totalAllocPoint: 1000n,
      } as never)

      const { result } = renderHook(() => usePoolAPR(0, 100n, '0', 1000))

      expect(result.current.value).toBe(0)
    })

    it('should return 0 when lpTokenPrice is 0', () => {
      vi.mocked(useFarming.useCurrentRewardPerSecond).mockReturnValue({
        rewardPerSecond: '1',
      } as never)
      vi.mocked(useFarming.useTotalAllocPoint).mockReturnValue({
        totalAllocPoint: 1000n,
      } as never)

      const { result } = renderHook(() => usePoolAPR(0, 100n, '1000', 0))

      expect(result.current.value).toBe(0)
    })

    it('should return 0 when BRS price is 0', () => {
      vi.mocked(useFarming.useCurrentRewardPerSecond).mockReturnValue({
        rewardPerSecond: '1',
      } as never)
      vi.mocked(useFarming.useTotalAllocPoint).mockReturnValue({
        totalAllocPoint: 1000n,
      } as never)
      vi.mocked(useSystemStats.useBRSPrice).mockReturnValue({
        brsPrice: 0,
      } as never)

      const { result } = renderHook(() => usePoolAPR(0, 100n, '1000', 1000))

      expect(result.current.value).toBe(0)
      expect(result.current.rewardPriceMissing).toBe(true)
    })

    it('should return 0 when totalAllocPoint is 0', () => {
      vi.mocked(useFarming.useCurrentRewardPerSecond).mockReturnValue({
        rewardPerSecond: '1',
      } as never)
      vi.mocked(useFarming.useTotalAllocPoint).mockReturnValue({
        totalAllocPoint: 0n,
      } as never)

      const { result } = renderHook(() => usePoolAPR(0, 100n, '1000', 1000))

      expect(result.current.value).toBe(0)
    })

    it('should handle small pool allocation correctly', () => {
      // Pool with 1% allocation (10/1000)
      vi.mocked(useFarming.useCurrentRewardPerSecond).mockReturnValue({
        rewardPerSecond: '1',
      } as never)
      vi.mocked(useFarming.useTotalAllocPoint).mockReturnValue({
        totalAllocPoint: 1000n,
      } as never)

      const { result } = renderHook(() => usePoolAPR(0, 10n, '1000', 1000))

      // APR should be around 315.36% (1/10 of the 10% allocation case)
      expect(result.current.value).toBeGreaterThan(310)
      expect(result.current.value).toBeLessThan(320)
      expect(result.current.value).toBeCloseTo(315.36, 0)
    })

    it('should handle very high APR values without returning Infinity', () => {
      // Very high reward rate with small staked value
      vi.mocked(useFarming.useCurrentRewardPerSecond).mockReturnValue({
        rewardPerSecond: '1000', // 1000 BRS/s
      } as never)
      vi.mocked(useFarming.useTotalAllocPoint).mockReturnValue({
        totalAllocPoint: 100n,
      } as never)

      const { result } = renderHook(
        () => usePoolAPR(0, 100n, '1', 1) // Small staked value
      )

      expect(isFinite(result.current.value)).toBe(true)
      expect(result.current.value).not.toBe(Infinity)
    })
  })

  describe('usePoolAPY', () => {
    beforeEach(() => {
      vi.clearAllMocks()

      // Setup default mocks
      vi.mocked(useMinter.useBTCPrice).mockReturnValue({ btcPrice: 100000 } as never)
      vi.mocked(useMinter.useIUSDPrice).mockReturnValue({ iusdPrice: 1.0 } as never)
      vi.mocked(useSystemStats.useBRSPrice).mockReturnValue({ brsPrice: 10 } as never)
      vi.mocked(useSystemStats.useBTBPrice).mockReturnValue({ btbPrice: 1.0 } as never)
      vi.mocked(useSystemStats.useBTDPrice).mockReturnValue({ btdPrice: 1.0 } as never)
      vi.mocked(useFarming.useCurrentRewardPerSecond).mockReturnValue({
        rewardPerSecond: '1',
      } as never)
      vi.mocked(useFarming.useTotalAllocPoint).mockReturnValue({
        totalAllocPoint: 1000n,
      } as never)
    })

    it('should return APR, APY, and formatted values', () => {
      const { result } = renderHook(() => usePoolAPY(0, 100n, '1000', 1000))

      // APR should be around 3153.6%
      expect(result.current.apr).toBeCloseTo(3153.6, 0)

      // APY should be significantly higher due to compounding
      expect(result.current.apy).toBeGreaterThan(result.current.apr)

      // Formatted values should have % suffix
      expect(result.current.aprFormatted).toContain('%')
      expect(result.current.apyFormatted).toContain('%')
    })

    it('should format high APR/APY with K suffix', () => {
      const { result } = renderHook(() => usePoolAPY(0, 100n, '1000', 1000))

      // APR ~3153% should be formatted as "3.15K%"
      expect(result.current.aprFormatted).toMatch(/\d+\.\d+K%/)

      // APY should be much higher and also use K/M/B formatting
      expect(result.current.apyFormatted).toMatch(/[KMB]%/)
    })

    it('should return 0% when APR is 0', () => {
      vi.mocked(useFarming.useCurrentRewardPerSecond).mockReturnValue({
        rewardPerSecond: null,
      } as never)

      const { result } = renderHook(() => usePoolAPY(0, 100n, '1000', 1000))

      expect(result.current.apr).toBe(0)
      expect(result.current.apy).toBe(0)
      expect(result.current.aprFormatted).toBe('0%')
      expect(result.current.apyFormatted).toBe('0%')
    })

    it('should calculate APY correctly for moderate APR (100%)', () => {
      // Setup to get 100% APR
      // rewardPerSecond = 0.03168808781 (chosen to get 100% APR)
      // Calculation: 0.03168808781 * 31536000 * 0.1 * 10 / 1000000 * 100 = 100%
      vi.mocked(useFarming.useCurrentRewardPerSecond).mockReturnValue({
        rewardPerSecond: '0.03168808781',
      } as never)

      const { result } = renderHook(() => usePoolAPY(0, 100n, '1000', 1000))

      // APR should be close to 100%
      expect(result.current.apr).toBeCloseTo(100, 0)

      // APY with daily compounding should be ~171.46%
      expect(result.current.apy).toBeCloseTo(171.46, 0)
    })

    it('should handle low APR values (<100%)', () => {
      // Very small reward per second to get low APR
      vi.mocked(useFarming.useCurrentRewardPerSecond).mockReturnValue({
        rewardPerSecond: '0.0001',
      } as never)

      const { result } = renderHook(() => usePoolAPY(0, 100n, '100000', 1000))

      // APR should be low (< 10%)
      expect(result.current.apr).toBeLessThan(10)

      // APY should be slightly higher than APR
      expect(result.current.apy).toBeGreaterThan(result.current.apr)

      // Should not use K/M/B formatting
      expect(result.current.aprFormatted).not.toMatch(/[KMB]/)
      expect(result.current.apyFormatted).not.toMatch(/[KMB]/)
    })
  })
})
