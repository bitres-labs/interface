import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { parseUnits } from 'viem'
import * as wagmi from 'wagmi'
import {
  useStakedBTD,
  useStakedBTB,
  useStakeBTD,
  useStakeBTB,
  useUnstakeBTD,
  useUnstakeBTB,
} from './useStaking'

const permitSignature = {
  deadline: 1234567890n,
  v: 27,
  r: '0x' + '0'.repeat(64),
  s: '0x' + '0'.repeat(64),
}

const mockSignPermit = vi.fn().mockResolvedValue(permitSignature)

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useReadContract: vi.fn(),
  useWriteContract: vi.fn(),
  useWaitForTransactionReceipt: vi.fn(),
}))

vi.mock('./usePermit', () => ({
  usePermit: () => ({
    signPermit: mockSignPermit,
  }),
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}))

describe('useStaking', () => {
  const mockAccount = '0x1234567890123456789012345678901234567890'
  const mockHash = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'

  beforeEach(() => {
    vi.clearAllMocks()
    mockSignPermit.mockClear()
    vi.mocked(wagmi.useAccount).mockReturnValue({
      address: mockAccount as `0x${string}`,
    } as never)

    vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
      isLoading: false,
      isSuccess: false,
    } as never)
  })

  // ============================================================================
  // READ FUNCTIONS - useStakedBTD
  // ============================================================================

  describe('useStakedBTD', () => {
    it('should return staked BTD amount (18 decimals)', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: parseUnits('1000', 18), // 1000 stBTD
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useStakedBTD())

      expect(result.current.staked).toBe('1000')
      expect(result.current.stakedRaw).toBe(parseUnits('1000', 18))
      expect(result.current.isLoading).toBe(false)
    })

    it('should return "0" when no staked amount', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useStakedBTD())

      expect(result.current.staked).toBe('0')
      expect(result.current.stakedRaw).toBeUndefined()
    })

    it('should call useReadContract with stBTD contract address', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: parseUnits('500', 18),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      renderHook(() => useStakedBTD())

      expect(wagmi.useReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'balanceOf',
          args: [mockAccount],
        })
      )
    })

    it('should handle loading state', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useStakedBTD())

      expect(result.current.isLoading).toBe(true)
    })

    it('should handle wallet disconnected', () => {
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: undefined,
      } as never)

      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useStakedBTD())

      expect(result.current.staked).toBe('0')
    })
  })

  // ============================================================================
  // READ FUNCTIONS - useStakedBTB
  // ============================================================================

  describe('useStakedBTB', () => {
    it('should return staked BTB amount (18 decimals)', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: parseUnits('2000', 18), // 2000 stBTB
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useStakedBTB())

      expect(result.current.staked).toBe('2000')
      expect(result.current.stakedRaw).toBe(parseUnits('2000', 18))
      expect(result.current.isLoading).toBe(false)
    })

    it('should return "0" when no staked amount', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useStakedBTB())

      expect(result.current.staked).toBe('0')
      expect(result.current.stakedRaw).toBeUndefined()
    })

    it('should call useReadContract with stBTB contract address', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: parseUnits('1500', 18),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      renderHook(() => useStakedBTB())

      expect(wagmi.useReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'balanceOf',
          args: [mockAccount],
        })
      )
    })

    it('should provide refetch function', () => {
      const mockRefetch = vi.fn()
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: parseUnits('1000', 18),
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      } as never)

      const { result } = renderHook(() => useStakedBTB())

      expect(result.current.refetch).toBe(mockRefetch)
    })
  })

  // ============================================================================
  // WRITE FUNCTIONS - STAKE BTD
  // ============================================================================

  describe('useStakeBTD', () => {
    let mockWriteContract: ReturnType<typeof vi.fn>

    beforeEach(() => {
      mockWriteContract = vi.fn()
      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        data: mockHash as `0x${string}`,
        isPending: false,
        error: null,
      } as never)
    })

    it('should call writeContract with correct deposit parameters', async () => {
      const { result } = renderHook(() => useStakeBTD())

      await act(async () => {
        await result.current.stakeBTD('100')
      })

      expect(mockWriteContract).toHaveBeenCalled()
    })

    it('should parse amount with correct decimals (18 for BTD)', async () => {
      const { result } = renderHook(() => useStakeBTD())

      await act(async () => {
        await result.current.stakeBTD('1.5')
      })

      expect(mockWriteContract).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [parseUnits('1.5', 18), mockAccount],
        })
      )
    })

    it('should throw error when wallet is not connected', async () => {
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: undefined,
      } as never)

      const { result } = renderHook(() => useStakeBTD())

      await expect(result.current.stakeBTD('100')).rejects.toThrow(
        'Wallet not connected'
      )
    })

    it('should return transaction states', () => {
      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        writeContract: vi.fn(),
        data: mockHash as `0x${string}`,
        isPending: true,
        error: null,
      } as never)

      vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
        isLoading: true,
        isSuccess: false,
      } as never)

      const { result } = renderHook(() => useStakeBTD())

      expect(result.current.isPending).toBe(true)
      expect(result.current.isConfirming).toBe(true)
      expect(result.current.isSuccess).toBe(false)
      expect(result.current.hash).toBe(mockHash)
    })

    it('should handle transaction success', () => {
      vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
        isLoading: false,
        isSuccess: true,
      } as never)

      const { result } = renderHook(() => useStakeBTD())

      expect(result.current.isSuccess).toBe(true)
      expect(result.current.isConfirming).toBe(false)
    })

    it('should handle transaction error', () => {
      const mockError = new Error('Transaction failed')
      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        writeContract: vi.fn(),
        data: undefined,
        isPending: false,
        error: mockError,
      } as never)

      const { result } = renderHook(() => useStakeBTD())

      expect(result.current.error).toBe(mockError)
    })
  })

  // ============================================================================
  // WRITE FUNCTIONS - STAKE BTB
  // ============================================================================

  describe('useStakeBTB', () => {
    let mockWriteContract: ReturnType<typeof vi.fn>

    beforeEach(() => {
      mockWriteContract = vi.fn()
      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        data: mockHash as `0x${string}`,
        isPending: false,
        error: null,
      } as never)
    })

    it('should call writeContract with correct deposit parameters', async () => {
      const { result } = renderHook(() => useStakeBTB())

      await act(async () => {
        await result.current.stakeBTB('200')
      })

      expect(mockWriteContract).toHaveBeenCalled()
      expect(mockSignPermit).toHaveBeenCalledWith({
        tokenAddress: expect.any(String),
        spenderAddress: expect.any(String),
        amount: '200',
        decimals: 18,
      })
    })

    it('should parse amount with correct decimals (18 for BTB)', async () => {
      const { result } = renderHook(() => useStakeBTB())

      await act(async () => {
        await result.current.stakeBTB('2.5')
      })

      const call = mockWriteContract.mock.calls[0]?.[0] as { args: [bigint, string] }
      expect(call.args[0]).toBe(parseUnits('2.5', 18))
    })

    it('should throw error when wallet is not connected', async () => {
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: undefined,
      } as never)

      const { result } = renderHook(() => useStakeBTB())

      await act(async () => {
        await expect(result.current.stakeBTB('200')).rejects.toThrow(
          'Wallet not connected'
        )
      })
    })

    it('should return transaction hash', () => {
      const { result } = renderHook(() => useStakeBTB())

      expect(result.current.hash).toBe(mockHash)
    })
  })

  // ============================================================================
  // WRITE FUNCTIONS - UNSTAKE BTD
  // ============================================================================

  describe('useUnstakeBTD', () => {
    let mockWriteContract: ReturnType<typeof vi.fn>

    beforeEach(() => {
      mockWriteContract = vi.fn()
      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        data: mockHash as `0x${string}`,
        isPending: false,
        error: null,
      } as never)
    })

    it('should call writeContract with correct redeem parameters', async () => {
      const { result } = renderHook(() => useUnstakeBTD())

      await result.current.unstakeBTD('50')

      expect(mockWriteContract).toHaveBeenCalled()
    })

    it('should parse amount with stBTD decimals (18)', async () => {
      const { result } = renderHook(() => useUnstakeBTD())

      await result.current.unstakeBTD('0.5')

      expect(mockWriteContract).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [parseUnits('0.5', 18), mockAccount, mockAccount],
        })
      )
    })

    it('should throw error when wallet is not connected', async () => {
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: undefined,
      } as never)

      const { result } = renderHook(() => useUnstakeBTD())

      await expect(result.current.unstakeBTD('50')).rejects.toThrow(
        'Wallet not connected'
      )
    })

    it('should return transaction states', () => {
      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        writeContract: vi.fn(),
        data: mockHash as `0x${string}`,
        isPending: true,
        error: null,
      } as never)

      vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
        isLoading: true,
        isSuccess: false,
      } as never)

      const { result } = renderHook(() => useUnstakeBTD())

      expect(result.current.isPending).toBe(true)
      expect(result.current.isConfirming).toBe(true)
      expect(result.current.isSuccess).toBe(false)
      expect(result.current.hash).toBe(mockHash)
    })

    it('should handle transaction success', () => {
      vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
        isLoading: false,
        isSuccess: true,
      } as never)

      const { result } = renderHook(() => useUnstakeBTD())

      expect(result.current.isSuccess).toBe(true)
      expect(result.current.isConfirming).toBe(false)
    })

    it('should handle transaction error', () => {
      const mockError = new Error('Unstake transaction failed')
      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        writeContract: vi.fn(),
        data: undefined,
        isPending: false,
        error: mockError,
      } as never)

      const { result } = renderHook(() => useUnstakeBTD())

      expect(result.current.error).toBe(mockError)
    })
  })

  // ============================================================================
  // WRITE FUNCTIONS - UNSTAKE BTB
  // ============================================================================

  describe('useUnstakeBTB', () => {
    let mockWriteContract: ReturnType<typeof vi.fn>

    beforeEach(() => {
      mockWriteContract = vi.fn()
      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        data: mockHash as `0x${string}`,
        isPending: false,
        error: null,
      } as never)
    })

    it('should call writeContract with correct redeem parameters', async () => {
      const { result } = renderHook(() => useUnstakeBTB())

      await result.current.unstakeBTB('100')

      expect(mockWriteContract).toHaveBeenCalled()
    })

    it('should parse amount with stBTB decimals (18)', async () => {
      const { result } = renderHook(() => useUnstakeBTB())

      await result.current.unstakeBTB('1.25')

      expect(mockWriteContract).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [parseUnits('1.25', 18), mockAccount, mockAccount],
        })
      )
    })

    it('should throw error when wallet is not connected', async () => {
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: undefined,
      } as never)

      const { result } = renderHook(() => useUnstakeBTB())

      await expect(result.current.unstakeBTB('100')).rejects.toThrow(
        'Wallet not connected'
      )
    })

    it('should return transaction hash', () => {
      const { result } = renderHook(() => useUnstakeBTB())

      expect(result.current.hash).toBe(mockHash)
    })

    it('should handle pending state correctly', () => {
      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        writeContract: vi.fn(),
        data: undefined,
        isPending: true,
        error: null,
      } as never)

      const { result } = renderHook(() => useUnstakeBTB())

      expect(result.current.isPending).toBe(true)
    })
  })
})
