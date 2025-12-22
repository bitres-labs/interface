import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { parseUnits } from 'viem'
import * as wagmi from 'wagmi'
import {
  getPairAddress,
  calculateAmountOut,
  usePairReserves,
  usePairToken0,
  usePairToken1,
  useSwapQuote,
  useSwap,
  useSwapPathExists,
  useAvailablePairs,
} from './useSwap'

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useReadContract: vi.fn(),
  useWriteContract: vi.fn(),
  useWaitForTransactionReceipt: vi.fn(),
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

describe('useSwap', () => {
  const mockAccount = '0x1234567890123456789012345678901234567890'
  const mockPairAddress = '0x1111111111111111111111111111111111111111' as `0x${string}`
  const mockToken0 = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`
  const mockToken1 = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(wagmi.useAccount).mockReturnValue({
      address: mockAccount as `0x${string}`,
    } as never)

    vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
      isLoading: false,
      isSuccess: false,
    } as never)
  })

  // ============================================================================
  // PURE FUNCTIONS
  // ============================================================================

  describe('getPairAddress', () => {
    it('should return pair address for BRS-BTD', () => {
      const pairAddress = getPairAddress('BRS', 'BTD')
      expect(pairAddress).toBeTruthy()
      expect(pairAddress).toMatch(/^0x[a-fA-F0-9]{40}$/)
    })

    it('should return same pair for BTD-BRS (reversed)', () => {
      const pair1 = getPairAddress('BRS', 'BTD')
      const pair2 = getPairAddress('BTD', 'BRS')
      expect(pair1).toBe(pair2)
    })

    it('should return pair address for BTD-USDC', () => {
      const pairAddress = getPairAddress('BTD', 'USDC')
      expect(pairAddress).toBeTruthy()
    })

    it('should return pair address for WBTC-USDC', () => {
      const pairAddress = getPairAddress('WBTC', 'USDC')
      expect(pairAddress).toBeTruthy()
    })

    it('should return null for non-existent pair', () => {
      const pairAddress = getPairAddress('BRS', 'WBTC')
      expect(pairAddress).toBeNull()
    })

    it('should return null for invalid tokens', () => {
      const pairAddress = getPairAddress('INVALID1', 'INVALID2')
      expect(pairAddress).toBeNull()
    })
  })

  describe('calculateAmountOut', () => {
    it('should calculate correct output amount', () => {
      // Reserves: 1000 token0, 2000 token1
      // Input: 100 token0
      // Fee: 0.3% (30 bp)
      const amountIn = parseUnits('100', 18)
      const reserveIn = parseUnits('1000', 18)
      const reserveOut = parseUnits('2000', 18)

      const amountOut = calculateAmountOut(amountIn, reserveIn, reserveOut, 30)

      // Expected calculation:
      // amountInWithFee = 100 * 9970 = 997000
      // numerator = 997000 * 2000 = 1994000000
      // denominator = 1000 * 10000 + 997000 = 10997000
      // amountOut = 1994000000 / 10997000 ≈ 181.36...
      expect(Number(amountOut)).toBeGreaterThan(parseFloat(parseUnits('181', 18).toString()))
      expect(Number(amountOut)).toBeLessThan(parseFloat(parseUnits('182', 18).toString()))
    })

    it('should return 0 when amountIn is 0', () => {
      const amountOut = calculateAmountOut(
        BigInt(0),
        parseUnits('1000', 18),
        parseUnits('2000', 18)
      )
      expect(amountOut).toBe(BigInt(0))
    })

    it('should return 0 when reserveIn is 0', () => {
      const amountOut = calculateAmountOut(
        parseUnits('100', 18),
        BigInt(0),
        parseUnits('2000', 18)
      )
      expect(amountOut).toBe(BigInt(0))
    })

    it('should return 0 when reserveOut is 0', () => {
      const amountOut = calculateAmountOut(
        parseUnits('100', 18),
        parseUnits('1000', 18),
        BigInt(0)
      )
      expect(amountOut).toBe(BigInt(0))
    })

    it('should handle different fee values', () => {
      const amountIn = parseUnits('100', 18)
      const reserveIn = parseUnits('1000', 18)
      const reserveOut = parseUnits('1000', 18)

      const amountOut30 = calculateAmountOut(amountIn, reserveIn, reserveOut, 30) // 0.3% fee
      const amountOut50 = calculateAmountOut(amountIn, reserveIn, reserveOut, 50) // 0.5% fee

      // Higher fee should result in less output
      expect(amountOut30).toBeGreaterThan(amountOut50)
    })

    it('should handle large amounts', () => {
      const amountIn = parseUnits('1000000', 18)
      const reserveIn = parseUnits('10000000', 18)
      const reserveOut = parseUnits('20000000', 18)

      const amountOut = calculateAmountOut(amountIn, reserveIn, reserveOut)

      expect(amountOut).toBeGreaterThan(BigInt(0))
    })
  })

  // ============================================================================
  // READ HOOKS
  // ============================================================================

  describe('usePairReserves', () => {
    it('should return reserves when pair exists', () => {
      const mockReserves = [
        parseUnits('1000', 18), // reserve0
        parseUnits('2000', 18), // reserve1
        1234567890, // blockTimestampLast
      ]

      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: mockReserves,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => usePairReserves(mockPairAddress))

      expect(result.current.reserve0).toBe(parseUnits('1000', 18))
      expect(result.current.reserve1).toBe(parseUnits('2000', 18))
      expect(result.current.blockTimestampLast).toBe(1234567890)
      expect(result.current.isLoading).toBe(false)
    })

    it('should return zero reserves when no data', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => usePairReserves(mockPairAddress))

      expect(result.current.reserve0).toBe(BigInt(0))
      expect(result.current.reserve1).toBe(BigInt(0))
      expect(result.current.blockTimestampLast).toBe(0)
    })

    it('should return zero reserves when pairAddress is null', () => {
      const { result } = renderHook(() => usePairReserves(null))

      expect(result.current.reserve0).toBe(BigInt(0))
      expect(result.current.reserve1).toBe(BigInt(0))
    })

    it('should handle loading state', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => usePairReserves(mockPairAddress))

      expect(result.current.isLoading).toBe(true)
    })

    it('should provide refetch function', () => {
      const mockRefetch = vi.fn()
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      } as never)

      const { result } = renderHook(() => usePairReserves(mockPairAddress))

      expect(result.current.refetch).toBe(mockRefetch)
    })
  })

  describe('usePairToken0', () => {
    it('should return token0 address', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: mockToken0,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => usePairToken0(mockPairAddress))

      expect(result.current).toBe(mockToken0)
    })

    it('should return undefined when no data', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => usePairToken0(mockPairAddress))

      expect(result.current).toBeUndefined()
    })
  })

  describe('usePairToken1', () => {
    it('should return token1 address', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: mockToken1,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => usePairToken1(mockPairAddress))

      expect(result.current).toBe(mockToken1)
    })

    it('should return undefined when no data', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => usePairToken1(mockPairAddress))

      expect(result.current).toBeUndefined()
    })
  })

  describe('useSwapQuote', () => {
    beforeEach(() => {
      // Mock multiple useReadContract calls in sequence
      let callCount = 0
      vi.mocked(wagmi.useReadContract).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // First call: usePairToken0
          return { data: mockToken0, isLoading: false, error: null, refetch: vi.fn() } as never
        } else {
          // Second call: usePairReserves
          return {
            data: [
              parseUnits('1000', 18), // reserve0
              parseUnits('2000', 18), // reserve1
              1234567890,
            ],
            isLoading: false,
            error: null,
            refetch: vi.fn(),
          } as never
        }
      })
    })

    it('should calculate swap quote correctly', () => {
      const { result } = renderHook(() => useSwapQuote('BRS', 'BTD', '100'))

      expect(parseFloat(result.current.amountOut)).toBeGreaterThan(0)
      expect(result.current.pairAddress).toBeTruthy()
      expect(result.current.isLoading).toBe(false)
    })

    it('should return "0" amountOut when amountIn is empty', () => {
      const { result } = renderHook(() => useSwapQuote('BRS', 'BTD', ''))

      expect(result.current.amountOut).toBe('0')
    })

    it('should return "0" amountOut when amountIn is "0"', () => {
      const { result } = renderHook(() => useSwapQuote('BRS', 'BTD', '0'))

      expect(result.current.amountOut).toBe('0')
    })

    it('should calculate price impact', () => {
      const { result } = renderHook(() => useSwapQuote('BRS', 'BTD', '100'))

      expect(parseFloat(result.current.priceImpact)).toBeGreaterThanOrEqual(0)
    })

    it('should calculate exchange rate', () => {
      const { result } = renderHook(() => useSwapQuote('BRS', 'BTD', '100'))

      expect(parseFloat(result.current.exchangeRate)).toBeGreaterThan(0)
    })

    it('should handle token order (token0 vs token1)', () => {
      const { result } = renderHook(() => useSwapQuote('BRS', 'BTD', '50'))

      // isToken0 should be determined correctly
      expect(typeof result.current.isToken0).toBe('boolean')
    })
  })

  // ============================================================================
  // WRITE HOOK
  // ============================================================================

  describe('useSwap', () => {
    it('should throw error when swap is called (not implemented)', async () => {
      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        writeContract: vi.fn(),
        data: undefined,
        isPending: false,
        error: null,
      } as never)

      const { result } = renderHook(() => useSwap())

      await expect(
        result.current.swap('BRS', 'BTD', '100', '95')
      ).rejects.toThrow('Direct pair swap not fully implemented')
    })

    it('should throw error when wallet is not connected', async () => {
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: undefined,
      } as never)

      const { result } = renderHook(() => useSwap())

      await expect(
        result.current.swap('BRS', 'BTD', '100', '95')
      ).rejects.toThrow('Wallet not connected')
    })

    it('should return transaction states', () => {
      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        writeContract: vi.fn(),
        data: undefined,
        isPending: true,
        error: null,
      } as never)

      const { result } = renderHook(() => useSwap())

      expect(result.current.isPending).toBe(true)
      expect(result.current.isSuccess).toBe(false)
    })

    it('should combine isPending and isConfirming', () => {
      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        writeContract: vi.fn(),
        data: undefined,
        isPending: false,
        error: null,
      } as never)

      vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
        isLoading: true,
        isSuccess: false,
      } as never)

      const { result } = renderHook(() => useSwap())

      expect(result.current.isPending).toBe(true)
    })

    it('should handle transaction error', () => {
      const mockError = new Error('Transaction failed')
      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        writeContract: vi.fn(),
        data: undefined,
        isPending: false,
        error: mockError,
      } as never)

      const { result } = renderHook(() => useSwap())

      expect(result.current.error).toBe(mockError)
    })
  })

  // ============================================================================
  // HELPER HOOKS
  // ============================================================================

  describe('useSwapPathExists', () => {
    it('should return true for existing pair BRS-BTD', () => {
      const { result } = renderHook(() => useSwapPathExists('BRS', 'BTD'))

      expect(result.current.exists).toBe(true)
      expect(result.current.pairAddress).toBeTruthy()
    })

    it('should return true for reversed pair BTD-BRS', () => {
      const { result } = renderHook(() => useSwapPathExists('BTD', 'BRS'))

      expect(result.current.exists).toBe(true)
      expect(result.current.pairAddress).toBeTruthy()
    })

    it('should return false for non-existent pair', () => {
      const { result } = renderHook(() => useSwapPathExists('BRS', 'WBTC'))

      expect(result.current.exists).toBe(false)
      expect(result.current.pairAddress).toBeNull()
    })

    it('should return false for invalid tokens', () => {
      const { result } = renderHook(() => useSwapPathExists('INVALID1', 'INVALID2'))

      expect(result.current.exists).toBe(false)
    })
  })

  describe('useAvailablePairs', () => {
    it('should return available pairs for BRS', () => {
      const { result } = renderHook(() => useAvailablePairs('BRS'))

      expect(result.current.availablePairs).toContain('BTD')
      expect(result.current.availablePairs).not.toContain('BRS')
    })

    it('should return available pairs for BTD', () => {
      const { result } = renderHook(() => useAvailablePairs('BTD'))

      expect(result.current.availablePairs.length).toBeGreaterThan(0)
      expect(result.current.availablePairs).toContain('BRS')
      expect(result.current.availablePairs).toContain('USDC')
      expect(result.current.availablePairs).toContain('BTB')
    })

    it('should not include the token itself', () => {
      const { result } = renderHook(() => useAvailablePairs('BRS'))

      expect(result.current.availablePairs).not.toContain('BRS')
    })

    it('should return empty array for token with no pairs', () => {
      const { result } = renderHook(() => useAvailablePairs('USDT'))

      expect(result.current.availablePairs).toEqual([])
    })

    it('should handle WBTC pairs', () => {
      const { result } = renderHook(() => useAvailablePairs('WBTC'))

      expect(result.current.availablePairs).toContain('USDC')
    })
  })
})
