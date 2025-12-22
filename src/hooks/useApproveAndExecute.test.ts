import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { parseUnits } from 'viem'
import * as wagmi from 'wagmi'
import {
  useApproveAndExecute,
  useAllowance,
  useNeedsApproval,
} from './useApproveAndExecute'

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  usePublicClient: vi.fn(),
  useWalletClient: vi.fn(),
  useReadContract: vi.fn(),
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
  },
}))

describe('useApproveAndExecute', () => {
  const mockAccount = '0x1234567890123456789012345678901234567890' as `0x${string}`
  const mockTokenAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`
  const mockSpenderAddress = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`
  const mockHash = '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc' as `0x${string}`

  let mockPublicClient: any
  let mockWalletClient: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockPublicClient = {
      readContract: vi.fn(),
      waitForTransactionReceipt: vi.fn(),
    }

    mockWalletClient = {
      writeContract: vi.fn(),
    }

    vi.mocked(wagmi.useAccount).mockReturnValue({
      address: mockAccount,
    } as never)

    vi.mocked(wagmi.usePublicClient).mockReturnValue(mockPublicClient)
    vi.mocked(wagmi.useWalletClient).mockReturnValue({
      data: mockWalletClient,
    } as never)
  })

  describe('useApproveAndExecute', () => {
    it('should throw error when wallet is not connected', async () => {
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: undefined,
      } as never)

      const { result } = renderHook(() => useApproveAndExecute())

      await expect(
        result.current.approveAndExecute({
          tokenAddress: mockTokenAddress,
          spenderAddress: mockSpenderAddress,
          amount: '100',
          decimals: 18,
          actionName: 'stake',
          executeAction: vi.fn(),
        })
      ).rejects.toThrow('Wallet not connected')
    })

    it('should throw error when publicClient is not available', async () => {
      vi.mocked(wagmi.usePublicClient).mockReturnValue(undefined)

      const { result } = renderHook(() => useApproveAndExecute())

      await expect(
        result.current.approveAndExecute({
          tokenAddress: mockTokenAddress,
          spenderAddress: mockSpenderAddress,
          amount: '100',
          decimals: 18,
          actionName: 'stake',
          executeAction: vi.fn(),
        })
      ).rejects.toThrow('Wallet not connected')
    })

    it('should throw error when walletClient is not available', async () => {
      vi.mocked(wagmi.useWalletClient).mockReturnValue({
        data: undefined,
      } as never)

      const { result } = renderHook(() => useApproveAndExecute())

      await expect(
        result.current.approveAndExecute({
          tokenAddress: mockTokenAddress,
          spenderAddress: mockSpenderAddress,
          amount: '100',
          decimals: 18,
          actionName: 'stake',
          executeAction: vi.fn(),
        })
      ).rejects.toThrow('Wallet not connected')
    })

    it('should skip approval when allowance is sufficient', async () => {
      const executeAction = vi.fn().mockResolvedValue(undefined)

      // Mock sufficient allowance (200 > 100)
      mockPublicClient.readContract.mockResolvedValue(parseUnits('200', 18))

      const { result } = renderHook(() => useApproveAndExecute())

      await act(async () => {
        await result.current.approveAndExecute({
          tokenAddress: mockTokenAddress,
          spenderAddress: mockSpenderAddress,
          amount: '100',
          decimals: 18,
          actionName: 'stake',
          executeAction,
        })
      })

      // Should not call approve
      expect(mockWalletClient.writeContract).not.toHaveBeenCalled()
      // Should execute action
      expect(executeAction).toHaveBeenCalled()
    })

    it('should approve and execute when allowance is insufficient', async () => {
      const executeAction = vi.fn().mockResolvedValue(undefined)

      // Mock insufficient allowance (50 < 100)
      mockPublicClient.readContract.mockResolvedValue(parseUnits('50', 18))
      mockWalletClient.writeContract.mockResolvedValue(mockHash)
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({})

      const { result } = renderHook(() => useApproveAndExecute())

      await act(async () => {
        await result.current.approveAndExecute({
          tokenAddress: mockTokenAddress,
          spenderAddress: mockSpenderAddress,
          amount: '100',
          decimals: 18,
          actionName: 'stake',
          executeAction,
        })
      })

      expect(mockWalletClient.writeContract).toHaveBeenCalled()
      expect(executeAction).toHaveBeenCalled()
    })

    it('should set isProcessing state during execution', async () => {
      const executeAction = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      mockPublicClient.readContract.mockResolvedValue(parseUnits('200', 18))

      const { result } = renderHook(() => useApproveAndExecute())

      expect(result.current.isProcessing).toBe(false)

      await act(async () => {
        await result.current.approveAndExecute({
          tokenAddress: mockTokenAddress,
          spenderAddress: mockSpenderAddress,
          amount: '100',
          decimals: 18,
          actionName: 'stake',
          executeAction,
        })
      })

      expect(result.current.isProcessing).toBe(false)
    })

    it('should reset isProcessing even if execution fails', async () => {
      const executeAction = vi.fn().mockRejectedValue(new Error('Execution failed'))

      mockPublicClient.readContract.mockResolvedValue(parseUnits('200', 18))

      const { result } = renderHook(() => useApproveAndExecute())

      await expect(
        result.current.approveAndExecute({
          tokenAddress: mockTokenAddress,
          spenderAddress: mockSpenderAddress,
          amount: '100',
          decimals: 18,
          actionName: 'stake',
          executeAction,
        })
      ).rejects.toThrow('Execution failed')
      expect(result.current.isProcessing).toBe(false)
    })

    it('should handle different token decimals', async () => {
      const executeAction = vi.fn().mockResolvedValue(undefined)

      // WBTC with 8 decimals
      mockPublicClient.readContract.mockResolvedValue(parseUnits('1', 8))
      mockWalletClient.writeContract.mockResolvedValue(mockHash)
      mockPublicClient.waitForTransactionReceipt.mockResolvedValue({})

      const { result } = renderHook(() => useApproveAndExecute())

      await act(async () => {
        await result.current.approveAndExecute({
          tokenAddress: mockTokenAddress,
          spenderAddress: mockSpenderAddress,
          amount: '2',
          decimals: 8,
          actionName: 'stake',
          executeAction,
        })
      })

      expect(mockWalletClient.writeContract).toHaveBeenCalled()
    })
  })

  describe('useAllowance', () => {
    it('should return allowance data', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: parseUnits('100', 18),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() =>
        useAllowance(mockTokenAddress, mockSpenderAddress)
      )

      expect(result.current.allowance).toBe(parseUnits('100', 18))
      expect(result.current.allowanceFormatted).toBe(parseUnits('100', 18).toString())
      expect(result.current.hasAllowance).toBe(true)
      expect(result.current.isLoading).toBe(false)
    })

    it('should return 0n when allowance is undefined', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() =>
        useAllowance(mockTokenAddress, mockSpenderAddress)
      )

      expect(result.current.allowance).toBe(0n)
      expect(result.current.allowanceFormatted).toBe('0')
      expect(result.current.hasAllowance).toBe(false)
    })

    it('should handle missing addresses', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useAllowance(undefined, undefined))

      expect(result.current.allowance).toBe(0n)
    })

    it('should provide refetch function', () => {
      const mockRefetch = vi.fn()
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: parseUnits('100', 18),
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      } as never)

      const { result } = renderHook(() =>
        useAllowance(mockTokenAddress, mockSpenderAddress)
      )

      expect(result.current.refetch).toBe(mockRefetch)
    })

    it('should return loading state', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() =>
        useAllowance(mockTokenAddress, mockSpenderAddress)
      )

      expect(result.current.isLoading).toBe(true)
    })
  })

  describe('useNeedsApproval', () => {
    it('should return true when approval is needed', () => {
      // Allowance 50 < amount 100
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: parseUnits('50', 18),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() =>
        useNeedsApproval(mockTokenAddress, mockSpenderAddress, '100', 18)
      )

      expect(result.current).toBe(true)
    })

    it('should return false when approval is not needed', () => {
      // Allowance 200 > amount 100
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: parseUnits('200', 18),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() =>
        useNeedsApproval(mockTokenAddress, mockSpenderAddress, '100', 18)
      )

      expect(result.current).toBe(false)
    })

    it('should return false when amount is empty', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: parseUnits('50', 18),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() =>
        useNeedsApproval(mockTokenAddress, mockSpenderAddress, '', 18)
      )

      expect(result.current).toBe(false)
    })

    it('should return false when amount is "0"', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: parseUnits('50', 18),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() =>
        useNeedsApproval(mockTokenAddress, mockSpenderAddress, '0', 18)
      )

      expect(result.current).toBe(false)
    })

    it('should return false when isLoading', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() =>
        useNeedsApproval(mockTokenAddress, mockSpenderAddress, '100', 18)
      )

      expect(result.current).toBe(false)
    })

    it('should return false on parseUnits error', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: parseUnits('50', 18),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() =>
        useNeedsApproval(mockTokenAddress, mockSpenderAddress, 'invalid', 18)
      )

      expect(result.current).toBe(false)
    })
  })
})
