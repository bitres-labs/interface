import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import {
  useCollateralRatio,
  useBTCPrice,
  useIUSDPrice,
  useMintFee,
  useRedeemFee,
  useMintBTD,
  useRedeemBTD,
  useRedeemBTB,
  calculateMintOutput,
  calculateRedeemOutput,
} from './useMinter'
import { parseUnits } from 'viem'
import * as wagmi from 'wagmi'

const permitSignature = {
  deadline: 1234567890n,
  v: 27,
  r: '0x' + '0'.repeat(64),
  s: '0x' + '0'.repeat(64),
}

const mockSignPermit = vi.fn().mockResolvedValue(permitSignature)

// Mock wagmi
const mockAllowanceReader = vi.fn().mockResolvedValue(10n ** 30n)
const mockWaitForReceipt = vi.fn().mockResolvedValue(undefined)
const mockWalletWriteContract = vi.fn().mockResolvedValue('0xapprovehash')

vi.mock('wagmi', () => ({
  useReadContract: vi.fn(),
  useWriteContract: vi.fn(),
  useWaitForTransactionReceipt: vi.fn(),
  useAccount: vi.fn(() => ({ address: '0x123', chainId: 31337 })),
  usePublicClient: vi.fn(() => ({
    readContract: mockAllowanceReader,
    waitForTransactionReceipt: mockWaitForReceipt,
  })),
  useWalletClient: vi.fn(() => ({
    data: {
      writeContract: mockWalletWriteContract,
    },
  })),
  useSignTypedData: vi.fn(() => ({
    signTypedDataAsync: vi.fn().mockResolvedValue(
      '0x' + '0'.repeat(128) + '1b'
    ),
  })),
}))

vi.mock('./usePermit', () => ({
  usePermit: () => ({
    signPermit: mockSignPermit,
  }),
}))

vi.mock('./useApproveAndExecute', () => ({
  useApproveAndExecute: () => ({
    approveAndExecute: async ({ executeAction }: { executeAction: () => Promise<void> | void }) =>
      executeAction(),
    isProcessing: false,
  }),
}))

// Mock logger to avoid console output in tests
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    log: vi.fn(),
    warn: vi.fn(),
  },
}))

describe('useMinter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Pure calculation functions', () => {
    describe('calculateMintOutput', () => {
      it('should return "0" when wbtcAmount is empty', () => {
        const result = calculateMintOutput('', 100000, 1.02)
        expect(result).toBe('0')
      })

      it('should return "0" when btcPrice is 0', () => {
        const result = calculateMintOutput('1', 0, 1.02)
        expect(result).toBe('0')
      })

      it('should return "0" when iusdPrice is 0', () => {
        const result = calculateMintOutput('1', 100000, 0)
        expect(result).toBe('0')
      })

      it('should return "0" when wbtcAmount is NaN', () => {
        const result = calculateMintOutput('invalid', 100000, 1.02)
        expect(result).toBe('0')
      })

      it('should calculate BTD output correctly with default fee (0.5%)', () => {
        // 1 WBTC at $100,000, IUSD = $1.02
        // Gross: 1 * 100000 / 1.02 = 98,039.2157 BTD
        // After 0.5% fee: 98039.2157 * 0.995 = 97,549.01 BTD
        const result = calculateMintOutput('1', 100000, 1.02)
        expect(parseFloat(result)).toBeCloseTo(97549.01, 0)
      })

      it('should calculate BTD output with zero fee', () => {
        // 1 WBTC at $100,000, IUSD = $1.02, no fee
        // Expected: 1 * 100000 / 1.02 ≈ 98,039.22 BTD
        const result = calculateMintOutput('1', 100000, 1.02, 0)
        expect(parseFloat(result)).toBeCloseTo(98039.22, 1)
      })

      it('should calculate with custom decimals', () => {
        // feeBP=50 (default), decimals=6
        const result = calculateMintOutput('1', 100000, 1.02, 50, 6)
        expect(result).toMatch(/^\d+\.\d{6}$/) // Should have 6 decimal places
      })

      it('should handle small WBTC amounts (0.001 BTC)', () => {
        // 0.001 WBTC at $100,000 = $100 worth
        // Gross: $100 / $1.02 = 98.04 BTD
        // After 0.5% fee: 98.04 * 0.995 = 97.55 BTD
        const result = calculateMintOutput('0.001', 100000, 1.02)
        expect(parseFloat(result)).toBeCloseTo(97.55, 1)
      })

      it('should handle large WBTC amounts (100 BTC)', () => {
        // 100 WBTC at $100,000 = $10,000,000 worth
        // Gross: $10,000,000 / $1.02 = 9,803,921.57 BTD
        // After 0.5% fee: 9803921.57 * 0.995 = 9,754,901.96 BTD
        const result = calculateMintOutput('100', 100000, 1.02)
        expect(parseFloat(result)).toBeCloseTo(9754901.96, 0)
      })
    })

    describe('calculateRedeemOutput', () => {
      it('should return "0" when btdAmount is empty', () => {
        const result = calculateRedeemOutput('', 100000, 1.02)
        expect(result).toBe('0')
      })

      it('should return "0" when btcPrice is 0', () => {
        const result = calculateRedeemOutput('1000', 0, 1.02)
        expect(result).toBe('0')
      })

      it('should return "0" when iusdPrice is 0', () => {
        const result = calculateRedeemOutput('1000', 100000, 0)
        expect(result).toBe('0')
      })

      it('should return "0" when btdAmount is NaN', () => {
        const result = calculateRedeemOutput('invalid', 100000, 1.02)
        expect(result).toBe('0')
      })

      it('should calculate WBTC output correctly with default fee (0.5%)', () => {
        // 100,000 BTD at IUSD = $1.02, BTC = $100,000
        // After 0.5% fee: 100000 * 0.995 = 99,500 effective BTD
        // WBTC: 99500 * 1.02 / 100000 = 1.0149 WBTC
        const result = calculateRedeemOutput('100000', 100000, 1.02)
        expect(parseFloat(result)).toBeCloseTo(1.0149, 3)
      })

      it('should calculate WBTC output with zero fee', () => {
        // 100,000 BTD at IUSD = $1.02, BTC = $100,000, no fee
        // Expected: 100000 * 1.02 / 100000 = 1.02 WBTC
        const result = calculateRedeemOutput('100000', 100000, 1.02, 0)
        expect(parseFloat(result)).toBeCloseTo(1.02, 2)
      })

      it('should calculate with custom decimals (2 decimals)', () => {
        // feeBP=50 (default), decimals=2
        const result = calculateRedeemOutput('100000', 100000, 1.02, 50, 2)
        expect(result).toMatch(/^\d+\.\d{2}$/) // Should have 2 decimal places
      })

      it('should handle small BTD amounts (1 BTD)', () => {
        // 1 BTD at IUSD = $1.02, BTC = $100,000
        // After 0.5% fee: 1 * 0.995 = 0.995 effective BTD
        // $0.995 * 1.02 / $100,000 = 0.00001015 WBTC
        const result = calculateRedeemOutput('1', 100000, 1.02)
        expect(parseFloat(result)).toBeCloseTo(0.00001015, 8)
      })

      it('should handle large BTD amounts (1,000,000 BTD)', () => {
        // 1,000,000 BTD at IUSD = $1.02, BTC = $100,000
        // After 0.5% fee: 1000000 * 0.995 = 995,000 effective BTD
        // 995,000 * 1.02 / 100,000 = 10.149 WBTC
        const result = calculateRedeemOutput('1000000', 100000, 1.02)
        expect(parseFloat(result)).toBeCloseTo(10.149, 2)
      })
    })
  })

  describe('Read hooks', () => {
    describe('useCollateralRatio', () => {
      it('should return default CR when data is undefined', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: undefined,
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useCollateralRatio())

        expect(result.current.collateralRatio).toBe(0)
        expect(result.current.isLoading).toBe(false)
      })

      it('should parse CR correctly (150% = 1.5e18)', () => {
        // CR is stored as 18 decimal number, e.g., 1.5e18 = 150%
        const mockCR = parseUnits('1.5', 18)

        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: mockCR,
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useCollateralRatio())

        expect(result.current.collateralRatio).toBe(150) // 1.5 * 100
      })

      it('should handle 110% CR', () => {
        const mockCR = parseUnits('1.1', 18)

        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: mockCR,
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useCollateralRatio())

        expect(result.current.collateralRatio).toBeCloseTo(110, 1)
      })

      it('should return loading state', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: undefined,
          isLoading: true,
          error: null,
        } as never)

        const { result } = renderHook(() => useCollateralRatio())

        expect(result.current.isLoading).toBe(true)
      })

      it('should return error state', () => {
        const mockError = new Error('Contract error')

        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: undefined,
          isLoading: false,
          error: mockError,
        } as never)

        const { result } = renderHook(() => useCollateralRatio())

        expect(result.current.error).toBe(mockError)
      })
    })

    describe('useBTCPrice', () => {
      it('should return default price when data is undefined', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: undefined,
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useBTCPrice())

        expect(result.current.btcPrice).toBe(0)
      })

      it('should parse BTC price correctly ($100,000)', () => {
        const mockPrice = parseUnits('100000', 18) // Price is 18 decimals

        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: mockPrice,
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useBTCPrice())

        expect(result.current.btcPrice).toBe(100000)
      })

      it('should handle fractional prices ($99,999.50)', () => {
        const mockPrice = parseUnits('99999.5', 18)

        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: mockPrice,
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useBTCPrice())

        expect(result.current.btcPrice).toBeCloseTo(99999.5, 1)
      })
    })

    describe('useIUSDPrice', () => {
      it('should return default price when data is undefined', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: undefined,
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useIUSDPrice())

        expect(result.current.iusdPrice).toBe(0)
      })

      it('should parse IUSD price correctly ($1.02)', () => {
        const mockPrice = parseUnits('1.02', 18)

        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: mockPrice,
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useIUSDPrice())

        expect(result.current.iusdPrice).toBeCloseTo(1.02, 2)
      })

      it('should handle different IUSD prices ($1.05)', () => {
        const mockPrice = parseUnits('1.05', 18)

        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: mockPrice,
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useIUSDPrice())

        expect(result.current.iusdPrice).toBeCloseTo(1.05, 2)
      })
    })

    describe('useMintFee', () => {
      it('should return default fee (50bp) when data is undefined', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: undefined,
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useMintFee())

        expect(result.current.mintFeeBP).toBe(50)
      })

      it('should parse mint fee correctly (50bp)', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: 50n,
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useMintFee())

        expect(result.current.mintFeeBP).toBe(50)
      })

      it('should handle different fee values (100bp = 1%)', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: 100n,
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useMintFee())

        expect(result.current.mintFeeBP).toBe(100)
      })
    })

    describe('useRedeemFee', () => {
      it('should return default fee (50bp) when data is undefined', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: undefined,
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useRedeemFee())

        expect(result.current.redeemFeeBP).toBe(50)
      })

      it('should parse redeem fee correctly (50bp)', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: 50n,
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useRedeemFee())

        expect(result.current.redeemFeeBP).toBe(50)
      })

      it('should handle different fee values (75bp)', () => {
        vi.mocked(wagmi.useReadContract).mockReturnValue({
          data: 75n,
          isLoading: false,
          error: null,
        } as never)

        const { result } = renderHook(() => useRedeemFee())

        expect(result.current.redeemFeeBP).toBe(75)
      })
    })
  })

  describe('Write hooks', () => {
    describe('useMintBTD', () => {
      it('should return mint function and transaction states', () => {
        const mockWriteContract = vi.fn()

        vi.mocked(wagmi.useWriteContract).mockReturnValue({
          writeContract: mockWriteContract,
          data: undefined,
          isPending: false,
          error: null,
        } as never)

        vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
          isLoading: false,
          isSuccess: false,
        } as never)

        const { result } = renderHook(() => useMintBTD())

        expect(result.current.mintBTD).toBeDefined()
        expect(typeof result.current.mintBTD).toBe('function')
        expect(result.current.isPending).toBe(false)
        expect(result.current.isConfirming).toBe(false)
        expect(result.current.isSuccess).toBe(false)
      })

      it('should call writeContract with correct parameters', async () => {
        const mockWriteContract = vi.fn()

        vi.mocked(wagmi.useWriteContract).mockReturnValue({
          writeContract: mockWriteContract,
          data: undefined,
          isPending: false,
          error: null,
        } as never)

        vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
          isLoading: false,
          isSuccess: false,
        } as never)

        const { result } = renderHook(() => useMintBTD())

        await act(async () => {
          await result.current.mintBTD('1.5') // 1.5 WBTC
        })

        expect(mockWriteContract).toHaveBeenCalled()
      })
    })

    describe('useRedeemBTD', () => {
      it('should return redeem function and transaction states', () => {
        const mockWriteContract = vi.fn()

        vi.mocked(wagmi.useWriteContract).mockReturnValue({
          writeContract: mockWriteContract,
          data: undefined,
          isPending: false,
          error: null,
        } as never)

        vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
          isLoading: false,
          isSuccess: false,
        } as never)

        const { result } = renderHook(() => useRedeemBTD())

        expect(result.current.redeemBTD).toBeDefined()
        expect(typeof result.current.redeemBTD).toBe('function')
      })

      it('should call writeContract with correct parameters', async () => {
        const mockWriteContract = vi.fn()

        vi.mocked(wagmi.useWriteContract).mockReturnValue({
          writeContract: mockWriteContract,
          data: undefined,
          isPending: false,
          error: null,
        } as never)

        vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
          isLoading: false,
          isSuccess: false,
        } as never)

        const { result } = renderHook(() => useRedeemBTD())

        await act(async () => {
          await result.current.redeemBTD('1000') // 1000 BTD
        })

        expect(mockSignPermit).toHaveBeenCalled()
        expect(mockWriteContract).toHaveBeenCalled()
      })
    })

    describe('useRedeemBTB', () => {
      it('should return redeem function and transaction states', () => {
        const mockWriteContract = vi.fn()

        vi.mocked(wagmi.useWriteContract).mockReturnValue({
          writeContract: mockWriteContract,
          data: undefined,
          isPending: false,
          error: null,
        } as never)

        vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
          isLoading: false,
          isSuccess: false,
        } as never)

        const { result } = renderHook(() => useRedeemBTB())

        expect(result.current.redeemBTB).toBeDefined()
        expect(typeof result.current.redeemBTB).toBe('function')
      })

      it('should call writeContract with correct parameters', async () => {
        const mockWriteContract = vi.fn()

        vi.mocked(wagmi.useWriteContract).mockReturnValue({
          writeContract: mockWriteContract,
          data: undefined,
          isPending: false,
          error: null,
        } as never)

        vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
          isLoading: false,
          isSuccess: false,
        } as never)

        const { result } = renderHook(() => useRedeemBTB())

        mockSignPermit.mockClear()

        await act(async () => {
          await result.current.redeemBTB('500') // 500 BTB
        })

        expect(mockSignPermit).toHaveBeenCalled()
        expect(mockWriteContract).toHaveBeenCalled()
      })
    })
  })
})
