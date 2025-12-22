import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import * as wagmi from 'wagmi'
import * as useFarming from './useFarming'
import * as useAPY from './useAPY'
import * as useLPTokenPrice from './useLPTokenPrice'
import * as useLocalReward from './useLocalRewardCalculation'
import { useFarmingPositions } from './useFarmingPositions'

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useReadContract: vi.fn(),
  useReadContracts: vi.fn(),
}))

vi.mock('./useFarming', () => ({
  useUserInfo: vi.fn(),
  usePoolInfo: vi.fn(),
  usePendingReward: vi.fn(),
  useTotalAllocPoint: vi.fn(),
}))

vi.mock('./useAPY', () => ({
  useTokenPrices: vi.fn(),
  usePoolAPY: vi.fn(),
}))

vi.mock('./useLPTokenPrice', () => ({
  useAllLPTokenPrices: vi.fn(),
}))

vi.mock('./useLocalRewardCalculation', () => ({
  useLocalRewardCalculation: vi.fn(),
}))

vi.mock('@/utils/numbers', () => ({
  toNumber: (value: string) => parseFloat(value),
}))

describe('useFarmingPositions', () => {
  const mockPrices = {
    WBTC: 100000,
    BRS: 10,
    BTD: 1.01,
    BTB: 1.0,
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Default: wallet connected
    vi.mocked(wagmi.useAccount).mockReturnValue({
      isConnected: true,
    } as never)

    // Default local reward is 0 (override in specific test cases)
    vi.mocked(useLocalReward.useLocalRewardCalculation).mockReturnValue({ reward: 0 } as never)

    // Default LP prices for three LP pools
    vi.mocked(useLPTokenPrice.useAllLPTokenPrices).mockReturnValue({
      0: 5.505, // BRS/BTD LP (precomputed demo price)
      1: 2.5, // BTD/USDC LP
      2: 1.5, // BTB/BTD LP
    } as never)

    // Default prices
    vi.mocked(useAPY.useTokenPrices).mockReturnValue(mockPrices)

    // Default total alloc point
    vi.mocked(useFarming.useTotalAllocPoint).mockReturnValue({
      totalAllocPoint: 1000,
    })
  })

  describe('when wallet is disconnected', () => {
    beforeEach(() => {
      // Mock all hooks even when disconnected (React rules of hooks)
      vi.mocked(useFarming.useUserInfo).mockReturnValue({
        stakedAmount: '0',
      })

      vi.mocked(useFarming.usePoolInfo).mockReturnValue({
        allocPoint: 0n,
        totalStaked: '0',
        decimals: 18,
      })

      vi.mocked(useFarming.usePendingReward).mockReturnValue({
        pendingReward: '0',
      })

      vi.mocked(useAPY.usePoolAPY).mockReturnValue({
        apr: 0,
        apy: 0,
      })
    })

    it('should return empty pools array', () => {
      vi.mocked(wagmi.useAccount).mockReturnValue({
        isConnected: false,
      } as never)

      const { result } = renderHook(() => useFarmingPositions())

      expect(result.current.pools).toHaveLength(10)
      expect(result.current.pools.every(p => p.userInfo.stakedAmount === 0)).toBe(true)
      expect(result.current.poolsWithStake).toEqual([])
      expect(result.current.topAPYPools.length).toBeGreaterThan(0)
      expect(result.current.topAPYPools.every(p => p.apy.apy === 0)).toBe(true)
      expect(result.current.totalFarmingValue).toBe(0)
      expect(result.current.totalPendingRewards).toBe(0)
      expect(result.current.totalPendingValue).toBe(0)
      expect(result.current.isConnected).toBe(false)
    })
  })

  describe('when wallet is connected', () => {
    beforeEach(() => {
      // Mock useUserInfo for all 10 pools
      vi.mocked(useFarming.useUserInfo).mockImplementation((poolId: number) => {
        const stakes: Record<number, string> = {
          0: '100', // BRS/BTD LP
          1: '200', // BTD/USDC LP
          2: '0',   // BTB/BTD LP (no stake)
          3: '1000', // USDC
          4: '0',   // USDT (no stake)
          5: '0.5', // WBTC
          6: '500', // WETH single token
          7: '500', // stBTD
          8: '0',   // stBTB (no stake)
          9: '1000', // BRS
        }
        return {
          stakedAmount: stakes[poolId] || '0',
        }
      })

      // Mock usePoolInfo for all 10 pools
      vi.mocked(useFarming.usePoolInfo).mockImplementation((poolId: number) => {
        const allocPoints: Record<number, bigint> = {
          0: 200n,
          1: 150n,
          2: 100n,
          3: 100n,
          4: 50n,
          5: 150n,
          6: 100n,
          7: 100n,
          8: 50n,
          9: 100n,
        }
        const totalStaked: Record<number, string> = {
          0: '10000',
          1: '20000',
          2: '15000',
          3: '100000',
          4: '50000',
          5: '10',
          6: '200',
          7: '50000',
          8: '50000',
          9: '100000',
        }
        return {
          allocPoint: allocPoints[poolId] || 0n,
          totalStaked: totalStaked[poolId] || '0',
          decimals: [8, 18, 18, 6, 6, 8, 18, 18, 18, 18][poolId],
        }
      })

      // Mock usePendingReward + local incremental rewards
      const rewards: Record<number, string> = {
        0: '10',
        1: '20',
        2: '0',
        3: '15',
        4: '0',
        5: '5',
        6: '30',
        7: '10',
        8: '0',
        9: '25',
      }

      vi.mocked(useFarming.usePendingReward).mockImplementation((poolId: number) => {
        return {
          pendingReward: rewards[poolId] || '0',
        }
      })

      vi.mocked(useLocalReward.useLocalRewardCalculation).mockImplementation(
        (poolId: number) => ({
          reward: Number(rewards[poolId] || '0'),
        })
      )

      // Mock usePoolAPY for all 9 pools
      vi.mocked(useAPY.usePoolAPY).mockImplementation(() => {
        return {
          apr: 100,
          apy: 150,
        }
      })
    })

    it('should return 10 pools', () => {
      const { result } = renderHook(() => useFarmingPositions())

      expect(result.current.pools).toHaveLength(10)
    })

    it('should include pool metadata', () => {
      const { result } = renderHook(() => useFarmingPositions())

      expect(result.current.pools[0]).toMatchObject({
        id: 0,
        name: 'BRS/BTD',
        type: 'LP',
      })

      expect(result.current.pools[3]).toMatchObject({
        id: 3,
        name: 'USDC',
        type: 'Single',
      })

      expect(result.current.pools[9]).toMatchObject({
        id: 9,
        name: 'BRS',
        type: 'Single',
      })
    })

    it('should include user staked amount and value', () => {
      const { result } = renderHook(() => useFarmingPositions())

      const pool0 = result.current.pools[0]
      expect(pool0.userInfo.stakedAmount).toBe(100)
      expect(pool0.userInfo.stakedValue).toBeGreaterThan(0)
    })

    it('should calculate LP price correctly', () => {
      const { result } = renderHook(() => useFarmingPositions())

      const pool0 = result.current.pools[0] // BRS/BTD LP
      expect(pool0.lpPrice).toBeCloseTo(5.505, 3)
    })

    it('should use correct token prices for single-token pools', () => {
      const { result } = renderHook(() => useFarmingPositions())

      expect(result.current.pools[3].lpPrice).toBe(1.0) // USDC
      expect(result.current.pools[4].lpPrice).toBe(1.0) // USDT
      expect(result.current.pools[5].lpPrice).toBe(100000) // WBTC
      expect(result.current.pools[6].lpPrice).toBe(3000) // WETH hard-coded fallback
      expect(result.current.pools[9].lpPrice).toBe(10) // BRS
    })

    it('should include pool info with allocation', () => {
      const { result } = renderHook(() => useFarmingPositions())

      const pool0 = result.current.pools[0]
      expect(pool0.poolInfo.totalStaked).toBe(10000)
      expect(pool0.poolInfo.allocPoint).toBe(200)
      expect(pool0.poolInfo.allocation).toBe('20.0%') // 200/1000 * 100 = 20%
    })

    it('should include pending rewards', () => {
      const { result } = renderHook(() => useFarmingPositions())

      const pool0 = result.current.pools[0]
      expect(pool0.pending.amount).toBe(10)
      expect(pool0.pending.value).toBe(10 * 10) // 10 BRS * $10 = $100
    })

    it('should include APY data', () => {
      const { result } = renderHook(() => useFarmingPositions())

      const pool0 = result.current.pools[0]
      expect(pool0.apy.apr).toBe(100)
      expect(pool0.apy.apy).toBe(150)
    })

    it('should calculate TVL correctly', () => {
      const { result } = renderHook(() => useFarmingPositions())

      const pool0 = result.current.pools[0]
      // TVL = totalStaked * lpPrice
      // = 10000 * 5.505 = 55050
      expect(pool0.tvl).toBeCloseTo(55050, 0)
    })

    it('should calculate total farming value', () => {
      const { result } = renderHook(() => useFarmingPositions())

      // Sum of all staked values
      expect(result.current.totalFarmingValue).toBeGreaterThan(0)
    })

    it('should calculate total pending rewards', () => {
      const { result } = renderHook(() => useFarmingPositions())

      // Sum of all pending rewards
      expect(result.current.totalPendingRewards).toBeGreaterThan(0)
    })

    it('should calculate total pending value', () => {
      const { result } = renderHook(() => useFarmingPositions())

      expect(result.current.totalPendingValue).toBeGreaterThan(0)
    })

    it('should filter pools with stake', () => {
      const { result } = renderHook(() => useFarmingPositions())

      const expectedIds = result.current.poolsWithStake.map(p => p.id)
      expect(expectedIds.length).toBeGreaterThan(0)
      expect(expectedIds).toContain(0)
      expect(expectedIds).toContain(9)
    })

    it('should return top 3 APY pools sorted by APY', () => {
      // Override APY mocks to have different values
      vi.mocked(useAPY.usePoolAPY).mockImplementation((poolId: number) => {
        const apys: Record<number, number> = {
          0: 100,
          1: 300,
          2: 150,
          3: 200,
          4: 50,
          5: 400,
          6: 250,
          7: 175,
          8: 125,
        }
        return {
          apr: apys[poolId] || 0,
          apy: apys[poolId] || 0,
        }
      })

      const { result } = renderHook(() => useFarmingPositions())

      expect(result.current.topAPYPools).toHaveLength(3)
      // Should be sorted by APY descending: Pool 5 (400), Pool 1 (300), Pool 6 (250)
      expect(result.current.topAPYPools[0].id).toBe(5)
      expect(result.current.topAPYPools[1].id).toBe(1)
      expect(result.current.topAPYPools[2].id).toBe(6)
    })

    it('should include decimals for each pool', () => {
      const { result } = renderHook(() => useFarmingPositions())

      expect(result.current.pools[0].poolInfo.decimals).toBe(8) // Pool 0
      expect(result.current.pools[1].poolInfo.decimals).toBe(18) // Pool 1
      expect(result.current.pools[3].poolInfo.decimals).toBe(6) // Pool 3 (USDC)
    })

    it('should handle zero total alloc point', () => {
      vi.mocked(useFarming.useTotalAllocPoint).mockReturnValue({
        totalAllocPoint: 0,
      })

      const { result } = renderHook(() => useFarmingPositions())

      const pool0 = result.current.pools[0]
      expect(pool0.poolInfo.allocation).toBe('0%')
    })

    it('should handle missing pool info fields gracefully', () => {
      vi.mocked(useFarming.usePoolInfo).mockReturnValue({
        allocPoint: undefined,
        totalStaked: '0',
        decimals: undefined,
      } as never)

      const { result } = renderHook(() => useFarmingPositions())

      const pool = result.current.pools[0]
      expect(pool.poolInfo.allocPoint).toBe(0)
      expect(pool.poolInfo.decimals).toBe(18) // Default
    })

    it('should update when dependencies change', () => {
      const { result, rerender } = renderHook(() => useFarmingPositions())

      const initialTotal = result.current.totalFarmingValue

      // Change BRS price
      vi.mocked(useAPY.useTokenPrices).mockReturnValue({
        ...mockPrices,
        BRS: 20, // Double the BRS price
      })

      rerender()

      // Total farming value should change when prices change
      expect(result.current.totalFarmingValue).not.toBe(initialTotal)
    })

    it('should include all required pool data fields', () => {
      const { result } = renderHook(() => useFarmingPositions())

      const pool = result.current.pools[0]
      expect(pool).toHaveProperty('id')
      expect(pool).toHaveProperty('name')
      expect(pool).toHaveProperty('type')
      expect(pool).toHaveProperty('userInfo')
      expect(pool).toHaveProperty('poolInfo')
      expect(pool).toHaveProperty('pending')
      expect(pool).toHaveProperty('apy')
      expect(pool).toHaveProperty('tvl')
      expect(pool).toHaveProperty('lpPrice')
    })

    it('should handle pool with zero staked amount', () => {
      const { result } = renderHook(() => useFarmingPositions())

      const pool2 = result.current.pools[2] // BTB/BTD LP (no stake)
      expect(pool2.userInfo.stakedAmount).toBe(0)
      expect(pool2.userInfo.stakedValue).toBe(0)
      expect(pool2.pending.amount).toBe(0)
    })
  })
})
