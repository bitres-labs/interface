import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { parseUnits } from 'viem'
import * as wagmi from 'wagmi'
import {
  useETHBalance,
  useWBTCBalance,
  useUSDCBalance,
  useUSDTBalance,
  useBTDBalance,
  useBTBBalance,
  useBRSBalance,
  useStBTDBalance,
  useStBTBBalance,
  useAllBalances,
  useTokenAllowance,
} from './useBalances'

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useReadContract: vi.fn(),
  useBalance: vi.fn(),
}))

describe('useBalances', () => {
  const mockAccount = '0x1234567890123456789012345678901234567890'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(wagmi.useAccount).mockReturnValue({
      address: mockAccount as `0x${string}`,
    } as never)
  })

  describe('useETHBalance', () => {
    it('should return ETH balance when wallet is connected', () => {
      vi.mocked(wagmi.useBalance).mockReturnValue({
        data: {
          value: parseUnits('1.5', 18),
          decimals: 18,
          formatted: '1.5',
          symbol: 'ETH',
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useETHBalance())

      expect(result.current.balance).toBe('1.5')
      expect(result.current.balanceRaw).toBe(parseUnits('1.5', 18))
      expect(result.current.isLoading).toBe(false)
      expect(wagmi.useBalance).toHaveBeenCalledWith({
        address: mockAccount,
        query: { staleTime: 15000, refetchInterval: 30000 },
      })
    })

    it('should return "0" when wallet is disconnected', () => {
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: undefined,
      } as never)

      vi.mocked(wagmi.useBalance).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useETHBalance())

      expect(result.current.balance).toBe('0')
      expect(result.current.balanceRaw).toBeUndefined()
    })

    it('should return loading state', () => {
      vi.mocked(wagmi.useBalance).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useETHBalance())

      expect(result.current.isLoading).toBe(true)
    })
  })

  describe('useWBTCBalance', () => {
    it('should return WBTC balance (8 decimals)', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: parseUnits('0.5', 8), // 0.5 WBTC
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useWBTCBalance())

      expect(result.current.balance).toBe('0.5')
      expect(result.current.balanceRaw).toBe(parseUnits('0.5', 8))
      expect(result.current.isLoading).toBe(false)
    })

    it('should return "0" when no balance data', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useWBTCBalance())

      expect(result.current.balance).toBe('0')
      expect(result.current.balanceRaw).toBeUndefined()
    })

    it('should call useReadContract with correct parameters', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: parseUnits('1', 8),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      renderHook(() => useWBTCBalance())

      expect(wagmi.useReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'balanceOf',
          args: [mockAccount],
        })
      )
    })
  })

  describe('useUSDCBalance', () => {
    it('should return USDC balance (6 decimals)', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: parseUnits('1000', 6), // 1000 USDC
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useUSDCBalance())

      expect(result.current.balance).toBe('1000')
      expect(result.current.balanceRaw).toBe(parseUnits('1000', 6))
    })

    it('should return "0" when wallet is disconnected', () => {
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: undefined,
      } as never)

      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useUSDCBalance())

      expect(result.current.balance).toBe('0')
    })
  })

  describe('useUSDTBalance', () => {
    it('should return USDT balance (6 decimals)', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: parseUnits('500', 6), // 500 USDT
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useUSDTBalance())

      expect(result.current.balance).toBe('500')
      expect(result.current.balanceRaw).toBe(parseUnits('500', 6))
    })
  })

  describe('useBTDBalance', () => {
    it('should return BTD balance (18 decimals)', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: parseUnits('10000', 18), // 10000 BTD
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useBTDBalance())

      expect(result.current.balance).toBe('10000')
      expect(result.current.balanceRaw).toBe(parseUnits('10000', 18))
    })

    it('should handle small BTD amounts', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: parseUnits('0.000000000000000001', 18), // 1 wei
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useBTDBalance())

      expect(result.current.balance).toBe('0.000000000000000001')
    })
  })

  describe('useBTBBalance', () => {
    it('should return BTB balance (18 decimals)', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: parseUnits('5000', 18), // 5000 BTB
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useBTBBalance())

      expect(result.current.balance).toBe('5000')
      expect(result.current.balanceRaw).toBe(parseUnits('5000', 18))
    })
  })

  describe('useBRSBalance', () => {
    it('should return BRS balance (18 decimals)', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: parseUnits('25000', 18), // 25000 BRS
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useBRSBalance())

      expect(result.current.balance).toBe('25000')
      expect(result.current.balanceRaw).toBe(parseUnits('25000', 18))
    })

    it('should handle loading state', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useBRSBalance())

      expect(result.current.isLoading).toBe(true)
      expect(result.current.balance).toBe('0')
    })
  })

  describe('useStBTDBalance', () => {
    it('should return stBTD balance (18 decimals)', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: parseUnits('8000', 18), // 8000 stBTD
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useStBTDBalance())

      expect(result.current.balance).toBe('8000')
      expect(result.current.balanceRaw).toBe(parseUnits('8000', 18))
    })
  })

  describe('useStBTBBalance', () => {
    it('should return stBTB balance (18 decimals)', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: parseUnits('3000', 18), // 3000 stBTB
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useStBTBBalance())

      expect(result.current.balance).toBe('3000')
      expect(result.current.balanceRaw).toBe(parseUnits('3000', 18))
    })

    it('should handle error state', () => {
      const mockError = new Error('Contract read failed')
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: mockError,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useStBTBBalance())

      expect(result.current.error).toBe(mockError)
      expect(result.current.balance).toBe('0')
    })
  })

  describe('useAllBalances', () => {
    beforeEach(() => {
      // Mock all individual balance hooks
      let callCount = 0
      vi.mocked(wagmi.useReadContract).mockImplementation(() => {
        callCount++
        // Different balances for different tokens
        const balances = [
          parseUnits('0.5', 8),    // WBTC (8 decimals)
          parseUnits('1000', 6),    // USDC (6 decimals)
          parseUnits('500', 6),     // USDT (6 decimals)
          parseUnits('10000', 18),  // BTD (18 decimals)
          parseUnits('5000', 18),   // BTB (18 decimals)
          parseUnits('25000', 18),  // BRS (18 decimals)
          parseUnits('8000', 18),   // stBTD (18 decimals)
          parseUnits('3000', 18),   // stBTB (18 decimals)
        ]

        return {
          data: balances[callCount - 1] || parseUnits('0', 18),
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        } as never
      })

      vi.mocked(wagmi.useBalance).mockReturnValue({
        data: {
          value: parseUnits('1.5', 18),
          decimals: 18,
          formatted: '1.5',
          symbol: 'ETH',
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)
    })

    it('should return all token balances as strings', () => {
      const { result } = renderHook(() => useAllBalances())

      expect(result.current.balances).toEqual({
        ETH: '1.5',
        WBTC: '0.5',
        USDC: '1000',
        USDT: '500',
        BTD: '10000',
        BTB: '5000',
        BRS: '25000',
        stBTD: '8000',
        stBTB: '3000',
      })
    })

    it('should include isLoading and refetchAll', () => {
      const { result } = renderHook(() => useAllBalances())

      expect(result.current.isLoading).toBe(false)
      expect(typeof result.current.refetchAll).toBe('function')
    })

    it('should return all balances as "0" when wallet is disconnected', () => {
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: undefined,
      } as never)

      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      vi.mocked(wagmi.useBalance).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useAllBalances())

      expect(result.current.balances.ETH).toBe('0')
      expect(result.current.balances.WBTC).toBe('0')
      expect(result.current.balances.BTD).toBe('0')
    })
  })

  describe('useTokenAllowance', () => {
    const tokenAddress = '0x1111111111111111111111111111111111111111' as `0x${string}`
    const spenderAddress = '0x2222222222222222222222222222222222222222' as `0x${string}`

    it('should return token allowance as bigint', () => {
      const allowanceValue = parseUnits('1000', 18)
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: allowanceValue,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() =>
        useTokenAllowance(tokenAddress, spenderAddress)
      )

      expect(result.current.allowance).toBe(allowanceValue)
      expect(result.current.isLoading).toBe(false)
    })

    it('should call useReadContract with correct parameters', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: parseUnits('500', 18),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      renderHook(() => useTokenAllowance(tokenAddress, spenderAddress))

      expect(wagmi.useReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: tokenAddress,
          functionName: 'allowance',
          args: [mockAccount, spenderAddress],
        })
      )
    })

    it('should return undefined when wallet is disconnected', () => {
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: undefined,
      } as never)

      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() =>
        useTokenAllowance(tokenAddress, spenderAddress)
      )

      expect(result.current.allowance).toBeUndefined()
    })

    it('should handle different allowance values', () => {
      const smallAllowance = parseUnits('100', 6)
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: smallAllowance,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() =>
        useTokenAllowance(tokenAddress, spenderAddress)
      )

      expect(result.current.allowance).toBe(smallAllowance)
    })

    it('should provide refetch function', () => {
      const mockRefetch = vi.fn()
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: parseUnits('1000', 18),
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      } as never)

      const { result } = renderHook(() =>
        useTokenAllowance(tokenAddress, spenderAddress)
      )

      expect(result.current.refetch).toBe(mockRefetch)
    })

    it('should handle loading state', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() =>
        useTokenAllowance(tokenAddress, spenderAddress)
      )

      expect(result.current.isLoading).toBe(true)
      expect(result.current.allowance).toBeUndefined()
    })

    it('should handle error state', () => {
      const mockError = new Error('Allowance read failed')
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: mockError,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() =>
        useTokenAllowance(tokenAddress, spenderAddress)
      )

      expect(result.current.error).toBe(mockError)
      expect(result.current.allowance).toBeUndefined()
    })

    it('should handle zero allowance', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: 0n,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() =>
        useTokenAllowance(tokenAddress, spenderAddress)
      )

      expect(result.current.allowance).toBe(0n)
    })
  })
})
