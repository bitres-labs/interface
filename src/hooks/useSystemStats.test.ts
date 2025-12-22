import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  useBTCPrice,
  useWBTCPrice,
  useBTDPrice,
  useBTBPrice,
  useBRSPrice,
  useIUSDPrice,
  useBTBMinPrice,
  useBTDAPR,
  useBTBAPR,
  useTotalSupply,
  useTokenBalance,
  useFarmingFundAddress,
  useTreasuryBalances,
  useTreasuryBalance,
  useCollateralRatio,
  useBRSMined,
  useBRSMaxSupply,
  useFarmingPoolLength,
  useTotalAllocPoint,
  usePoolInfo,
  useTotalTVL,
  useSystemMetrics,
} from './useSystemStats'
import { parseUnits } from 'viem'
import * as wagmi from 'wagmi'
import * as useFarmingPositions from './useFarmingPositions'

// Mock wagmi
vi.mock('wagmi', () => ({
  useReadContract: vi.fn(),
  useAccount: vi.fn(),
}))

// Mock farming positions (used by TVL)
vi.mock('./useFarmingPositions', () => ({
  useFarmingPositions: vi.fn(),
}))

describe('useSystemStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useFarmingPositions.useFarmingPositions).mockReturnValue({
      pools: [],
      poolsWithStake: [],
      topAPYPools: [],
      totalFarmingValue: 0,
      totalPendingRewards: 0,
      totalPendingValue: 0,
      isConnected: true,
    } as never)
  })

  describe('Price Hooks', () => {
    describe('useBTCPrice', () => {
      it('should return 0 when data is undefined', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: undefined,
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useBTCPrice())

        expect(result.current.btcPrice).toBe(0)
      })

      it('should parse BTC price correctly', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: parseUnits('100000', 18),
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useBTCPrice())

        expect(result.current.btcPrice).toBe(100000)
      })
    })

    describe('useWBTCPrice', () => {
      it('should parse WBTC price correctly', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: parseUnits('99500', 18),
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useWBTCPrice())

        expect(result.current.wbtcPrice).toBe(99500)
      })
    })

    describe('useBTDPrice', () => {
      it('should parse BTD price correctly', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: parseUnits('1.01', 18),
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useBTDPrice())

        expect(result.current.btdPrice).toBeCloseTo(1.01, 2)
      })
    })

    describe('useBTBPrice', () => {
      it('should parse BTB price correctly', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: parseUnits('0.95', 18),
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useBTBPrice())

        expect(result.current.btbPrice).toBeCloseTo(0.95, 2)
      })
    })

    describe('useBRSPrice', () => {
      it('should parse BRS price correctly', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: parseUnits('10.5', 18),
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useBRSPrice())

        expect(result.current.brsPrice).toBeCloseTo(10.5, 1)
      })
    })

    describe('useIUSDPrice', () => {
      it('should parse IUSD price correctly', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: parseUnits('1.02', 18),
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useIUSDPrice())

        expect(result.current.iusdPrice).toBeCloseTo(1.02, 2)
      })
    })
  })

  describe('Config Hooks', () => {
    describe('useBTBMinPrice', () => {
      it('should return 0 when data is undefined', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: undefined,
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useBTBMinPrice())

        expect(result.current.btbMinPrice).toBe(0)
      })

      it('should parse BTB min price correctly', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: parseUnits('0.8', 18),
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useBTBMinPrice())

        expect(result.current.btbMinPrice).toBeCloseTo(0.8, 1)
      })
    })

    describe('useBTDAPR', () => {
      it('should return 0 when pool data is undefined', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: undefined,
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useBTDAPR())

        expect(result.current.btdAPR).toBe(0)
      })

      it('should parse BTD APR correctly (200 basis points = 2%)', () => {
        const mockPool = [
          '0x1234567890123456789012345678901234567890',
          0n,
          0n,
          0n,
          200n, // APR in basis points (200 = 2%)
        ] as const

        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: mockPool,
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useBTDAPR())

        expect(result.current.btdAPR).toBe(2)
      })
    })

    describe('useBTBAPR', () => {
      it('should parse BTB APR correctly (500 basis points = 5%)', () => {
        const mockPool = [
          '0xABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCD',
          0n,
          0n,
          0n,
          500n, // APR in basis points (500 = 5%)
        ] as const

        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: mockPool,
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useBTBAPR())

        expect(result.current.btbAPR).toBe(5)
      })
    })
  })

  describe('Supply and Balance Hooks', () => {
    describe('useTotalSupply', () => {
      it('should return "0" when data is undefined', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: undefined,
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() =>
          useTotalSupply('0x1234567890123456789012345678901234567890', 18)
        )

        expect(result.current.totalSupply).toBe('0')
        expect(result.current.totalSupplyNum).toBe(0)
      })

      it('should parse total supply correctly (18 decimals)', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: parseUnits('1000000', 18),
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() =>
          useTotalSupply('0x1234567890123456789012345678901234567890', 18)
        )

        expect(result.current.totalSupply).toBe('1000000')
        expect(result.current.totalSupplyNum).toBe(1000000)
        expect(result.current.totalSupplyRaw).toBe(parseUnits('1000000', 18))
      })

      it('should parse total supply correctly (8 decimals - WBTC)', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: parseUnits('21', 8),
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useTotalSupply('0xWBTC_ADDRESS', 8))

        expect(result.current.totalSupply).toBe('21')
        expect(result.current.totalSupplyNum).toBe(21)
      })
    })

    describe('useTokenBalance', () => {
      it('should return 0 when ownerAddress is undefined', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: parseUnits('100', 18),
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useTokenBalance('0xTokenAddress', undefined, 18))

        expect(result.current.balance).toBe(0)
      })

      it('should parse token balance correctly when owner is provided', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: parseUnits('500.5', 18),
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() =>
          useTokenBalance('0xTokenAddress' as `0x${string}`, '0xOwner' as `0x${string}`, 18)
        )

        expect(result.current.balance).toBeCloseTo(500.5, 1)
        expect(result.current.balanceRaw).toBe(parseUnits('500.5', 18))
      })
    })

    describe('useFarmingFundAddress', () => {
      it('should return address correctly', () => {
        const mockAddress = '0x9876543210987654321098765432109876543210' as `0x${string}`

        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: mockAddress,
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useFarmingFundAddress(0))

        expect(result.current.address).toBe(mockAddress)
      })

      it('should handle different fund indices', () => {
        const mockAddress = '0xTREASURY_ADDRESS' as `0x${string}`

        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: mockAddress,
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useFarmingFundAddress(1))

        expect(result.current.address).toBe(mockAddress)
      })
    })

    describe('useTreasuryBalances', () => {
      it('should return 0 for all balances when data is undefined', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: undefined,
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useTreasuryBalances())

        expect(result.current.wbtcBalance).toBe(0)
        expect(result.current.brsBalance).toBe(0)
        expect(result.current.btdBalance).toBe(0)
      })

      it('should parse treasury balances correctly', () => {
        const mockBalances: [bigint, bigint, bigint] = [
          parseUnits('10', 8), // WBTC (8 decimals)
          parseUnits('50000', 18), // BRS (18 decimals)
          parseUnits('1000000', 18), // BTD (18 decimals)
        ]

        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: mockBalances,
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useTreasuryBalances())

        expect(result.current.wbtcBalance).toBe(10)
        expect(result.current.brsBalance).toBe(50000)
        expect(result.current.btdBalance).toBe(1000000)
      })
    })

    describe('useTreasuryBalance', () => {
      it('should return "0" when data is undefined', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: undefined,
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() =>
          useTreasuryBalance('0xTokenAddress' as `0x${string}`, 18)
        )

        expect(result.current.balance).toBe('0')
        expect(result.current.balanceNum).toBe(0)
      })

      it('should parse treasury balance correctly', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: parseUnits('25000', 18),
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useTreasuryBalance('0xBTD' as `0x${string}`, 18))

        expect(result.current.balance).toBe('25000')
        expect(result.current.balanceNum).toBe(25000)
        expect(result.current.balanceRaw).toBe(parseUnits('25000', 18))
      })
    })
  })

  describe('Minter Hooks', () => {
    describe('useCollateralRatio', () => {
      it('should return 0 when data is undefined', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: undefined,
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useCollateralRatio())

        expect(result.current.collateralRatio).toBe(0)
      })

      it('should parse collateral ratio correctly (150% = 1.5e18)', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: parseUnits('1.5', 18),
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useCollateralRatio())

        expect(result.current.collateralRatio).toBe(150)
      })
    })
  })

  describe('BRS Mining Hooks', () => {
    describe('useBRSMined', () => {
      it('should return 0 when data is undefined', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: undefined,
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useBRSMined())

        expect(result.current.minedAmount).toBe(0)
      })

      it('should parse mined amount correctly', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: parseUnits('50000', 18),
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useBRSMined())

        expect(result.current.minedAmount).toBe(50000)
      })
    })

    describe('useBRSMaxSupply', () => {
      it('should parse max supply correctly', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: parseUnits('2100000000', 18), // 2.1B BRS
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useBRSMaxSupply())

        expect(result.current.maxSupply).toBe(2100000000)
      })
    })

    describe('useFarmingPoolLength', () => {
      it('should return 0 when data is undefined', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: undefined,
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useFarmingPoolLength())

        expect(result.current.poolLength).toBe(0)
      })

      it('should parse pool length correctly', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: 9n,
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useFarmingPoolLength())

        expect(result.current.poolLength).toBe(9)
      })
    })

    describe('useTotalAllocPoint', () => {
      it('should parse total alloc point correctly', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: 1000n,
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useTotalAllocPoint())

        expect(result.current.totalAllocPoint).toBe(1000)
      })
    })

    describe('usePoolInfo', () => {
      it('should return pool info correctly', () => {
        const mockPoolInfo = {
          lpToken: '0x1234567890123456789012345678901234567890',
          allocPoint: 100n,
          lastRewardTime: 1700000000n,
          accRewardPerShare: parseUnits('0.5', 18),
          totalStaked: parseUnits('10000', 18),
        }

        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: mockPoolInfo,
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => usePoolInfo(0))

        expect(result.current.poolInfo).toEqual(mockPoolInfo)
      })
    })
  })

  describe('Combined Statistics Hooks', () => {
    describe('useTotalTVL', () => {
      beforeEach(() => {
        vi.clearAllMocks()
      })

      it('should calculate total TVL correctly', () => {
        let callCount = 0
        vi.mocked(wagmi.useReadContract).mockImplementation(() => {
          callCount++

          // 1st call: useTreasuryBalances (WBTC, BRS, BTD)
          if (callCount === 1) {
            return {
              data: [
                parseUnits('10', 8), // 10 WBTC
                parseUnits('50000', 18), // 50k BRS
                parseUnits('1000000', 18), // 1M BTD
              ],
              isLoading: false,
              error: null,
            } as never
          }

          // 2nd call: useWBTCPrice
          if (callCount === 2) {
            return {
              data: parseUnits('100000', 18), // $100k per WBTC
              isLoading: false,
              error: null,
            } as never
          }

          // 3rd call: useBRSPrice
          if (callCount === 3) {
            return {
              data: parseUnits('10', 18), // $10 per BRS
              isLoading: false,
              error: null,
            } as never
          }

          // 4th call: useBTDPrice
          if (callCount === 4) {
            return {
              data: parseUnits('1.01', 18), // $1.01 per BTD
              isLoading: false,
              error: null,
            } as never
          }

          return {
            data: undefined,
            isLoading: false,
            error: null,
          } as never
        })

        const { result } = renderHook(() => useTotalTVL())

        // TVL = 10 WBTC * $100k + 50k BRS * $10 + 1M BTD * $1.01
        //     = $1,000,000 + $500,000 + $1,010,000
        //     = $2,510,000
        expect(result.current.treasuryTVL).toBeCloseTo(2510000, -3)
        expect(result.current.farmingPoolTVL).toBe(0) // TODO implementation
        expect(result.current.totalTVL).toBeCloseTo(2510000, -3)
      })
    })

    describe('useSystemMetrics', () => {
      beforeEach(() => {
        vi.clearAllMocks()
      })

      it('should aggregate all system metrics', () => {
        let callCount = 0
        vi.mocked(wagmi.useReadContract).mockImplementation(() => {
          callCount++

          // 1st call: useCollateralRatio
          if (callCount === 1) {
            return {
              data: parseUnits('1.5', 18), // 150%
              isLoading: false,
              error: null,
            } as never
          }

          // 2nd call: useIUSDPrice
          if (callCount === 2) {
            return {
              data: parseUnits('1.02', 18),
              isLoading: false,
              error: null,
            } as never
          }

          // 3rd call: useBTDAPR
          if (callCount === 3) {
            return {
              data: ['0x0', 0n, 0n, 0n, 200n],
              isLoading: false,
              error: null,
            } as never
          }

          // 4th call: useBTBAPR
          if (callCount === 4) {
            return {
              data: ['0x0', 0n, 0n, 0n, 500n],
              isLoading: false,
              error: null,
            } as never
          }

          // 5th call: useBTBMinPrice
          if (callCount === 5) {
            return {
              data: parseUnits('0.8', 18),
              isLoading: false,
              error: null,
            } as never
          }

          // 6-9th calls: useTotalTVL dependencies
          if (callCount === 6) {
            // Treasury balances
            return {
              data: [parseUnits('10', 8), parseUnits('50000', 18), parseUnits('1000000', 18)],
              isLoading: false,
              error: null,
            } as never
          }

          if (callCount === 7) {
            // WBTC price
            return {
              data: parseUnits('100000', 18),
              isLoading: false,
              error: null,
            } as never
          }

          if (callCount === 8) {
            // BRS price
            return {
              data: parseUnits('10', 18),
              isLoading: false,
              error: null,
            } as never
          }

          if (callCount === 9) {
            // BTD price
            return {
              data: parseUnits('1.01', 18),
              isLoading: false,
              error: null,
            } as never
          }

          return {
            data: undefined,
            isLoading: false,
            error: null,
          } as never
        })

        const { result } = renderHook(() => useSystemMetrics())

        expect(result.current.collateralRatio).toBe(150)
        expect(result.current.iusdPrice).toBeCloseTo(1.02, 2)
        expect(result.current.btdAPR).toBe(2)
        expect(result.current.btbAPR).toBe(5)
        expect(result.current.btbMinPrice).toBeCloseTo(0.8, 1)
        expect(result.current.tvl).toBeCloseTo(2510000, -3)
        expect(result.current.userCount).toBe(0)
      })
    })
  })
})
