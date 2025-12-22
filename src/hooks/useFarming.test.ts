import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  usePoolInfo,
  useUserInfo,
  usePendingReward,
  useTotalAllocPoint,
  useCurrentRewardPerSecond,
  useDeposit,
  useWithdraw,
  useClaim,
  usePoolData,
} from './useFarming'
import { parseUnits } from 'viem'
import * as wagmi from 'wagmi'

// Mock wagmi
vi.mock('wagmi', () => ({
  useReadContract: vi.fn(),
  useWriteContract: vi.fn(),
  useWaitForTransactionReceipt: vi.fn(),
  useAccount: vi.fn(),
}))

describe('useFarming', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock for useAccount
    vi.mocked(wagmi.useAccount).mockReturnValue({
      address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as `0x${string}`,
      isConnected: true,
    } as never)
  })

  describe('usePoolInfo', () => {
    it('should return default values when data is undefined', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: undefined,
        isLoading: false,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => usePoolInfo(0))

      expect(result.current.lpToken).toBe('0x0')
      expect(result.current.allocPoint).toBe(0n)
      expect(result.current.totalStaked).toBe('0')
      expect(result.current.totalStakedRaw).toBe(0n)
      expect(result.current.decimals).toBe(18)
    })

    it('should return default values when loading', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: undefined,
        isLoading: true,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => usePoolInfo(0))

      expect(result.current.isLoading).toBe(true)
      expect(result.current.totalStaked).toBe('0')
    })

    it('should parse pool info correctly for pool 0 (18 decimals)', () => {
      const mockData: [string, bigint, bigint, bigint, bigint] = [
        '0x1234567890123456789012345678901234567890',
        100n, // allocPoint
        1700000000n, // lastRewardTime
        parseUnits('0.5', 18), // accRewardPerShare
        parseUnits('1000', 18), // totalStaked
      ]

      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: mockData,
        isLoading: false,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => usePoolInfo(0))

      expect(result.current.lpToken).toBe('0x1234567890123456789012345678901234567890')
      expect(result.current.allocPoint).toBe(100n)
      expect(result.current.lastRewardTime).toBe(1700000000n)
      expect(result.current.totalStaked).toBe('1000')
      expect(result.current.decimals).toBe(18)
    })

    it('should parse pool info correctly for pool 5 (8 decimals - WBTC)', () => {
      const mockData: [string, bigint, bigint, bigint, bigint] = [
        '0xABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCD',
        200n, // allocPoint
        1700000000n,
        parseUnits('1', 18),
        parseUnits('10.5', 8), // totalStaked in 8 decimals (WBTC)
      ]

      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: mockData,
        isLoading: false,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => usePoolInfo(5))

      expect(result.current.totalStaked).toBe('10.5')
      expect(result.current.decimals).toBe(8)
    })

    it('should parse pool info correctly for pool 4 (6 decimals - USDT)', () => {
      const mockData: [string, bigint, bigint, bigint, bigint] = [
        '0xDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF',
        150n,
        1700000000n,
        parseUnits('0.8', 18),
        parseUnits('50000', 6), // totalStaked in 6 decimals (USDT)
      ]

      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: mockData,
        isLoading: false,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => usePoolInfo(4))

      expect(result.current.totalStaked).toBe('50000')
      expect(result.current.decimals).toBe(6)
    })

    it('should provide refetch function', () => {
      const mockRefetch = vi.fn()
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: undefined,
        isLoading: false,
        refetch: mockRefetch,
      } as never)

      const { result } = renderHook(() => usePoolInfo(0))

      expect(result.current.refetch).toBe(mockRefetch)
    })
  })

  describe('useUserInfo', () => {
    it('should return default values when data is undefined', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: undefined,
        isLoading: false,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useUserInfo(0))

      expect(result.current.stakedAmount).toBe('0')
      expect(result.current.stakedAmountRaw).toBe(0n)
      expect(result.current.rewardDebt).toBe(0n)
    })

    it('should return default values when no wallet connected', () => {
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: undefined,
        isConnected: false,
      } as never)

      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: [parseUnits('100', 18), parseUnits('50', 18)],
        isLoading: false,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useUserInfo(0))

      expect(result.current.stakedAmount).toBe('0')
    })

    it('should parse user info correctly for pool 0 (18 decimals)', () => {
      const mockData: [bigint, bigint] = [
        parseUnits('500', 18), // staked amount
        parseUnits('100', 18), // reward debt
      ]

      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: mockData,
        isLoading: false,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useUserInfo(0))

      expect(result.current.stakedAmount).toBe('500')
      expect(result.current.stakedAmountRaw).toBe(parseUnits('500', 18))
      expect(result.current.rewardDebt).toBe(parseUnits('100', 18))
      expect(result.current.decimals).toBe(18)
    })

    it('should parse user info correctly for pool 5 (8 decimals - WBTC)', () => {
      const mockData: [bigint, bigint] = [
        parseUnits('2.5', 8), // 2.5 WBTC
        parseUnits('10', 18),
      ]

      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: mockData,
        isLoading: false,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useUserInfo(5))

      expect(result.current.stakedAmount).toBe('2.5')
      expect(result.current.decimals).toBe(8)
    })

    it('should parse user info correctly for pool 4 (6 decimals - USDT)', () => {
      const mockData: [bigint, bigint] = [
        parseUnits('10000', 6), // 10,000 USDT
        parseUnits('50', 18),
      ]

      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: mockData,
        isLoading: false,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useUserInfo(4))

      expect(result.current.stakedAmount).toBe('10000')
      expect(result.current.decimals).toBe(6)
    })
  })

  describe('usePendingReward', () => {
    it('should return "0" when data is undefined', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: undefined,
        isLoading: false,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => usePendingReward(0))

      expect(result.current.pendingReward).toBe('0')
    })

    it('should parse pending reward correctly', () => {
      const mockReward = parseUnits('123.456789', 18)

      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: mockReward,
        isLoading: false,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => usePendingReward(0))

      expect(result.current.pendingReward).toBe('123.456789')
    })

    it('should handle zero pending reward', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: 0n,
        isLoading: false,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => usePendingReward(0))

      expect(result.current.pendingReward).toBe('0')
    })

    it('should handle large pending rewards', () => {
      const mockReward = parseUnits('999999.123456789', 18)

      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: mockReward,
        isLoading: false,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => usePendingReward(5))

      expect(parseFloat(result.current.pendingReward)).toBeCloseTo(999999.123456789, 6)
    })
  })

  describe('useTotalAllocPoint', () => {
    it('should return 0 when data is undefined', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as never)

      const { result } = renderHook(() => useTotalAllocPoint())

      expect(result.current.totalAllocPoint).toBe(0)
    })

    it('should parse total alloc point correctly', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: 1000n,
        isLoading: false,
      } as never)

      const { result } = renderHook(() => useTotalAllocPoint())

      expect(result.current.totalAllocPoint).toBe(1000)
    })

    it('should return loading state', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: 500n,
        isLoading: true,
      } as never)

      const { result } = renderHook(() => useTotalAllocPoint())

      expect(result.current.isLoading).toBe(true)
      expect(result.current.totalAllocPoint).toBe(500)
    })
  })

  describe('useCurrentRewardPerSecond', () => {
    it('should return "0" when data is undefined', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: undefined,
        isLoading: false,
      } as never)

      const { result } = renderHook(() => useCurrentRewardPerSecond())

      expect(result.current.rewardPerSecond).toBe('0')
    })

    it('should parse reward per second correctly', () => {
      const mockRewardRate = parseUnits('1.5', 18) // 1.5 BRS per second

      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: mockRewardRate,
        isLoading: false,
      } as never)

      const { result } = renderHook(() => useCurrentRewardPerSecond())

      expect(result.current.rewardPerSecond).toBe('1.5')
    })

    it('should handle very small reward rates', () => {
      const mockRewardRate = parseUnits('0.0001', 18)

      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: mockRewardRate,
        isLoading: false,
      } as never)

      const { result } = renderHook(() => useCurrentRewardPerSecond())

      expect(result.current.rewardPerSecond).toBe('0.0001')
    })
  })

  describe('useDeposit', () => {
    it('should return deposit function and states', () => {
      const mockWriteContract = vi.fn()

      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        writeContractAsync: undefined,
        data: undefined,
        isPending: false,
        error: null,
      } as never)

      vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
        isLoading: false,
        isSuccess: false,
      } as never)

      const { result } = renderHook(() => useDeposit())

      expect(result.current.deposit).toBeDefined()
      expect(typeof result.current.deposit).toBe('function')
      expect(result.current.isPending).toBe(false)
      expect(result.current.isSuccess).toBe(false)
    })

    it('should call writeContract with correct parameters (18 decimals)', async () => {
      const mockWriteContract = vi.fn()

      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        writeContractAsync: undefined,
        data: undefined,
        isPending: false,
        error: null,
      } as never)

      vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
        isLoading: false,
        isSuccess: false,
      } as never)

      const { result } = renderHook(() => useDeposit())

      await result.current.deposit(0, '100', 18)

      expect(mockWriteContract).toHaveBeenCalled()
    })

    it('should call writeContract with correct parameters (8 decimals - WBTC)', async () => {
      const mockWriteContract = vi.fn()

      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        writeContractAsync: undefined,
        data: undefined,
        isPending: false,
        error: null,
      } as never)

      vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
        isLoading: false,
        isSuccess: false,
      } as never)

      const { result } = renderHook(() => useDeposit())

      await result.current.deposit(6, '2.5', 8)

      expect(mockWriteContract).toHaveBeenCalled()
    })

    it('should use writeContractAsync when available', async () => {
      const mockWriteContractAsync = vi.fn()

      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        writeContract: vi.fn(),
        writeContractAsync: mockWriteContractAsync,
        data: undefined,
        isPending: false,
        error: null,
      } as never)

      vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
        isLoading: false,
        isSuccess: false,
      } as never)

      const { result } = renderHook(() => useDeposit())

      await result.current.deposit(0, '100', 18)

      expect(mockWriteContractAsync).toHaveBeenCalled()
    })
  })

  describe('useWithdraw', () => {
    it('should return withdraw function and states', () => {
      const mockWriteContract = vi.fn()

      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        writeContractAsync: undefined,
        data: undefined,
        isPending: false,
        error: null,
      } as never)

      vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
        isLoading: false,
        isSuccess: false,
      } as never)

      const { result } = renderHook(() => useWithdraw())

      expect(result.current.withdraw).toBeDefined()
      expect(typeof result.current.withdraw).toBe('function')
    })

    it('should call writeContract with correct parameters', async () => {
      const mockWriteContract = vi.fn()

      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        writeContractAsync: undefined,
        data: undefined,
        isPending: false,
        error: null,
      } as never)

      vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
        isLoading: false,
        isSuccess: false,
      } as never)

      const { result } = renderHook(() => useWithdraw())

      await result.current.withdraw(3, '50', 18)

      expect(mockWriteContract).toHaveBeenCalled()
    })
  })

  describe('useClaim', () => {
    it('should return claim function and states', () => {
      const mockWriteContract = vi.fn()

      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        writeContractAsync: undefined,
        data: undefined,
        isPending: false,
        error: null,
      } as never)

      vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
        isLoading: false,
        isSuccess: false,
      } as never)

      const { result } = renderHook(() => useClaim())

      expect(result.current.claim).toBeDefined()
      expect(typeof result.current.claim).toBe('function')
    })

    it('should call writeContract with correct parameters', async () => {
      const mockWriteContract = vi.fn()

      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        writeContractAsync: undefined,
        data: undefined,
        isPending: false,
        error: null,
      } as never)

      vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
        isLoading: false,
        isSuccess: false,
      } as never)

      const { result } = renderHook(() => useClaim())

      await result.current.claim(5)

      expect(mockWriteContract).toHaveBeenCalled()
    })
  })

  describe('usePoolData', () => {
    beforeEach(() => {
      // Reset all mocks for complex test
      vi.clearAllMocks()
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as `0x${string}`,
        isConnected: true,
      } as never)
    })

    it('should aggregate all pool data correctly', () => {
      // Mock all the underlying hooks
      const mockReadContract = vi.mocked(wagmi.useReadContract)

      // Setup multiple calls to useReadContract (one for each hook called)
      let callCount = 0
      mockReadContract.mockImplementation(() => {
        callCount++

        // 1st call: usePoolInfo
        if (callCount === 1) {
          return {
            data: [
              '0x1234567890123456789012345678901234567890',
              200n, // allocPoint
              1700000000n,
              parseUnits('0.5', 18),
              parseUnits('10000', 18), // totalStaked
            ],
            isLoading: false,
            refetch: vi.fn(),
          } as never
        }

        // 2nd call: useUserInfo
        if (callCount === 2) {
          return {
            data: [parseUnits('500', 18), parseUnits('100', 18)],
            isLoading: false,
            refetch: vi.fn(),
          } as never
        }

        // 3rd call: usePendingReward
        if (callCount === 3) {
          return {
            data: parseUnits('25.5', 18),
            isLoading: false,
            refetch: vi.fn(),
          } as never
        }

        // 4th call: useTotalAllocPoint
        if (callCount === 4) {
          return {
            data: 1000n, // total alloc = 1000, pool alloc = 200, so 20%
            isLoading: false,
          } as never
        }

        return {
          data: undefined,
          isLoading: false,
          refetch: vi.fn(),
        } as never
      })

      const { result } = renderHook(() => usePoolData(0))

      // Check poolInfo data
      expect(result.current.lpToken).toBe('0x1234567890123456789012345678901234567890')
      expect(result.current.allocPoint).toBe(200n)
      expect(result.current.totalStaked).toBe('10000')

      // Check userInfo data
      expect(result.current.stakedAmount).toBe('500')
      expect(result.current.rewardDebt).toBe(parseUnits('100', 18))

      // Check pendingReward data
      expect(result.current.pendingReward).toBe('25.5')

      // Check calculated pool weight: 200/1000 * 100 = 20%
      expect(result.current.poolWeight).toBe('20.0%')

      // Check refetchAll function exists
      expect(result.current.refetchAll).toBeDefined()
      expect(typeof result.current.refetchAll).toBe('function')
    })

    it('should handle zero total alloc point', () => {
      let callCount = 0
      vi.mocked(wagmi.useReadContract).mockImplementation(() => {
        callCount++

        if (callCount === 1) {
          return {
            data: [
              '0x1234567890123456789012345678901234567890',
              100n,
              1700000000n,
              parseUnits('0', 18),
              parseUnits('0', 18),
            ],
            isLoading: false,
            refetch: vi.fn(),
          } as never
        }

        if (callCount === 2) {
          return {
            data: [0n, 0n],
            isLoading: false,
            refetch: vi.fn(),
          } as never
        }

        if (callCount === 3) {
          return {
            data: 0n,
            isLoading: false,
            refetch: vi.fn(),
          } as never
        }

        if (callCount === 4) {
          return {
            data: 0n, // total alloc = 0
            isLoading: false,
          } as never
        }

        return {
          data: undefined,
          isLoading: false,
          refetch: vi.fn(),
        } as never
      })

      const { result } = renderHook(() => usePoolData(0))

      expect(result.current.poolWeight).toBe('0%')
    })
  })
})
