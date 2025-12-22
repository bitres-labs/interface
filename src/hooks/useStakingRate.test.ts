import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useBTDStakeRate, useBTBStakeRate, useCalculateStakeOutput } from './useStakingRate'
import * as wagmi from 'wagmi'

// Mock wagmi
vi.mock('wagmi', () => ({
  useReadContract: vi.fn(),
}))

describe('useStakingRate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useBTDStakeRate', () => {
    it('should return default exchange rate of 1 when data is undefined', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: undefined,
        isError: false,
        isLoading: false,
      } as never)

      const { result } = renderHook(() => useBTDStakeRate())

      expect(result.current.exchangeRate).toBe(1)
      expect(result.current.inverseRate).toBe(1)
    })

    it('should calculate exchange rate from contract data', () => {
      // Mock convertToAssets returning 1.1 BTD per stBTD (10% interest earned)
      const mockAssetsFor1Share = 1100000000000000000n // 1.1 * 10^18

      vi.mocked(wagmi.useReadContract)
        .mockReturnValueOnce({
          data: 1000000000000000000n, // sharesFor1Token (1:1 for first call)
          isError: false,
          isLoading: false,
        } as never)
        .mockReturnValueOnce({
          data: mockAssetsFor1Share, // assetsFor1Share
          isError: false,
          isLoading: false,
        } as never)

      const { result } = renderHook(() => useBTDStakeRate())

      // 1 stBTD = 1.1 BTD
      expect(result.current.exchangeRate).toBeCloseTo(1.1, 6)
    })

    it('should calculate inverse rate correctly', () => {
      // Mock convertToShares returning 0.909.. stBTD per BTD
      const mockSharesFor1Token = 909090909090909090n // ~0.909 * 10^18

      vi.mocked(wagmi.useReadContract)
        .mockReturnValueOnce({
          data: mockSharesFor1Token,
          isError: false,
          isLoading: false,
        } as never)
        .mockReturnValueOnce({
          data: 1000000000000000000n,
          isError: false,
          isLoading: false,
        } as never)

      const { result } = renderHook(() => useBTDStakeRate())

      // 1 BTD = ~0.909 stBTD
      expect(result.current.inverseRate).toBeCloseTo(0.909, 2)
    })
  })

  describe('useBTBStakeRate', () => {
    it('should return default exchange rate of 1 when data is undefined', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: undefined,
        isError: false,
        isLoading: false,
      } as never)

      const { result } = renderHook(() => useBTBStakeRate())

      expect(result.current.exchangeRate).toBe(1)
      expect(result.current.inverseRate).toBe(1)
    })

    it('should calculate exchange rate from contract data', () => {
      const mockAssetsFor1Share = 1050000000000000000n // 1.05 * 10^18

      vi.mocked(wagmi.useReadContract)
        .mockReturnValueOnce({
          data: 1000000000000000000n,
          isError: false,
          isLoading: false,
        } as never)
        .mockReturnValueOnce({
          data: mockAssetsFor1Share,
          isError: false,
          isLoading: false,
        } as never)

      const { result } = renderHook(() => useBTBStakeRate())

      expect(result.current.exchangeRate).toBeCloseTo(1.05, 6)
    })
  })

  describe('useCalculateStakeOutput', () => {
    beforeEach(() => {
      // Setup mock rates for calculation
      vi.mocked(wagmi.useReadContract)
        .mockReturnValueOnce({
          data: 1000000000000000000n, // sharesFor1Token = 1
          isError: false,
          isLoading: false,
        } as never)
        .mockReturnValueOnce({
          data: 1100000000000000000n, // assetsFor1Share = 1.1
          isError: false,
          isLoading: false,
        } as never)
    })

    it('should return "0" for empty input', () => {
      const { result } = renderHook(() => useCalculateStakeOutput('', true, 'BTD'))

      expect(result.current).toBe('0')
    })

    it('should return "0" for zero input', () => {
      const { result } = renderHook(() => useCalculateStakeOutput('0', true, 'BTD'))

      expect(result.current).toBe('0')
    })

    it('should return "0" for negative input', () => {
      const { result } = renderHook(() => useCalculateStakeOutput('-10', true, 'BTD'))

      expect(result.current).toBe('0')
    })

    it('should calculate deposit amount (BTD → stBTD)', () => {
      const { result } = renderHook(() => useCalculateStakeOutput('100', true, 'BTD'))

      // 100 BTD * 1.0 inverseRate = 100 stBTD
      const output = parseFloat(result.current)
      expect(output).toBeGreaterThan(0)
      expect(output).toBeLessThanOrEqual(100)
    })

    it('should calculate withdrawal amount (stBTD → BTD)', () => {
      const { result } = renderHook(() => useCalculateStakeOutput('100', false, 'BTD'))

      // 100 stBTD * 1.1 exchangeRate = 110 BTD
      const output = parseFloat(result.current)
      expect(output).toBeGreaterThanOrEqual(100)
    })

    it('should handle BTB token type', () => {
      const { result } = renderHook(() => useCalculateStakeOutput('50', true, 'BTB'))

      const output = parseFloat(result.current)
      expect(output).toBeGreaterThan(0)
    })

    it('should format output to 6 decimals', () => {
      const { result } = renderHook(() => useCalculateStakeOutput('1.23456789', true, 'BTD'))

      // Should have at most 6 decimal places (after removing trailing zeros)
      const parts = result.current.split('.')
      if (parts.length === 2) {
        expect(parts[1].length).toBeLessThanOrEqual(6)
      }
    })

    it('should handle invalid numeric input', () => {
      const { result } = renderHook(() => useCalculateStakeOutput('invalid', true, 'BTD'))

      expect(result.current).toBe('0')
    })

    it('should handle NaN input', () => {
      const { result } = renderHook(() => useCalculateStakeOutput(NaN.toString(), true, 'BTD'))

      expect(result.current).toBe('0')
    })
  })
})
