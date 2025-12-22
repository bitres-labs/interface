import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  calculateSwapOutput,
  getTokenOrder,
  usePairReserves,
  useTokenBalance,
  useLPBalance,
  useLPTotalSupply,
  useSwapOnPair,
  useAddLiquidity,
  useRemoveLiquidity,
} from './useUniswapV2'
import { parseUnits } from 'viem'
import * as wagmi from 'wagmi'

// Mock wagmi
vi.mock('wagmi', () => ({
  useReadContract: vi.fn(),
  useAccount: vi.fn(),
  useWriteContract: vi.fn(),
  useWaitForTransactionReceipt: vi.fn(),
}))

describe('useUniswapV2 utilities', () => {
  describe('getTokenOrder', () => {
    it('should order tokens by address (lowercase)', () => {
      const tokenA = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
      const tokenB = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

      const result = getTokenOrder(tokenA, tokenB)

      expect(result.isAToken0).toBe(false) // B has lower address
      expect(result.token0Address).toBe(tokenB)
      expect(result.token1Address).toBe(tokenA)
    })

    it('should handle case-insensitive comparison', () => {
      const tokenA = '0xBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBb'
      const tokenB = '0xaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaA'

      const result = getTokenOrder(tokenA, tokenB)

      expect(result.isAToken0).toBe(false)
      expect(result.token0Address.toLowerCase()).toBe(tokenB.toLowerCase())
      expect(result.token1Address.toLowerCase()).toBe(tokenA.toLowerCase())
    })

    it('should return isAToken0=true when A has lower address', () => {
      const tokenA = '0x1111111111111111111111111111111111111111'
      const tokenB = '0x2222222222222222222222222222222222222222'

      const result = getTokenOrder(tokenA, tokenB)

      expect(result.isAToken0).toBe(true)
      expect(result.token0Address).toBe(tokenA)
      expect(result.token1Address).toBe(tokenB)
    })
  })

  describe('calculateSwapOutput', () => {
    // Set up realistic reserves for testing
    // Example: 1000 BRS and 10000 BTD in pool (1 BRS = 10 BTD)
    const reserve0 = parseUnits('1000', 18) // BRS reserve
    const reserve1 = parseUnits('10000', 18) // BTD reserve

    it('should return "0" when amountIn is empty', () => {
      const result = calculateSwapOutput('', reserve0, reserve1, 18, 18)
      expect(result).toBe('0')
    })

    it('should return "0" when amountIn is 0', () => {
      const result = calculateSwapOutput('0', reserve0, reserve1, 18, 18)
      expect(result).toBe('0')
    })

    it('should return "0" when amountIn is negative', () => {
      const result = calculateSwapOutput('-10', reserve0, reserve1, 18, 18)
      expect(result).toBe('0')
    })

    it('should return "0" when reserveIn is 0', () => {
      const result = calculateSwapOutput('10', 0n, reserve1, 18, 18)
      expect(result).toBe('0')
    })

    it('should return "0" when reserveOut is 0', () => {
      const result = calculateSwapOutput('10', reserve0, 0n, 18, 18)
      expect(result).toBe('0')
    })

    it('should calculate correct output for small swap (no price impact)', () => {
      // Swap 1 BRS -> should get ~9.97 BTD (with 0.3% fee)
      // amountInWithFee = 1 * 997 / 1000 = 0.997
      // amountOut = (0.997 * 10000) / (1000 + 0.997) ≈ 9.960
      const result = calculateSwapOutput('1', reserve0, reserve1, 18, 18)
      const output = parseFloat(result)

      expect(output).toBeGreaterThan(9.9)
      expect(output).toBeLessThan(10) // Less than 10 due to fee
      expect(output).toBeCloseTo(9.96, 1)
    })

    it('should calculate correct output for larger swap (with price impact)', () => {
      // Swap 100 BRS -> should get less than 1000 BTD due to slippage
      // amountInWithFee = 100 * 997 / 1000 = 99.7
      // amountOut = (99.7 * 10000) / (1000 + 99.7) ≈ 906.74
      const result = calculateSwapOutput('100', reserve0, reserve1, 18, 18)
      const output = parseFloat(result)

      expect(output).toBeGreaterThan(900)
      expect(output).toBeLessThan(1000) // Significant slippage
      expect(output).toBeCloseTo(906.7, 0)
    })

    it('should handle different decimal places (WBTC 8 decimals)', () => {
      // 1 WBTC (8 decimals) to USDC (6 decimals)
      const wbtcReserve = parseUnits('10', 8) // 10 WBTC
      const usdcReserve = parseUnits('1000000', 6) // 1M USDC (1 BTC = 100k USDC)

      const result = calculateSwapOutput('0.1', wbtcReserve, usdcReserve, 8, 6)
      const output = parseFloat(result)

      // 0.1 WBTC should get approximately 9,871 USDC (with fee and slippage)
      // Formula: (0.1 * 0.997 * 1000000) / (10 + 0.1 * 0.997) ≈ 9871.58
      expect(output).toBeGreaterThan(9850)
      expect(output).toBeLessThan(9900)
      expect(output).toBeCloseTo(9871.58, 0)
    })

    it('should handle very small amounts', () => {
      const result = calculateSwapOutput('0.001', reserve0, reserve1, 18, 18)
      const output = parseFloat(result)

      expect(output).toBeGreaterThan(0)
      expect(output).toBeLessThan(0.01)
      expect(output).toBeCloseTo(0.00996, 4)
    })

    it('should handle very large reserves without overflow', () => {
      const largeReserve = parseUnits('1000000000', 18) // 1 billion
      const result = calculateSwapOutput('1000', largeReserve, largeReserve, 18, 18)
      const output = parseFloat(result)

      expect(output).toBeGreaterThan(0)
      expect(output).toBeLessThan(1000)
    })

    it('should apply 0.3% fee (997/1000)', () => {
      // With no slippage, swap should return input * (reserveOut/reserveIn) * 0.997
      // 1 BRS -> ~9.97 BTD (10 * 0.997)
      const result = calculateSwapOutput('1', reserve0, reserve1, 18, 18)
      const output = parseFloat(result)

      // Fee should reduce output by ~0.3%
      const expectedWithoutFee = 10 // 1 BRS = 10 BTD at current rate
      const expectedWithFee = expectedWithoutFee * 0.997

      expect(output).toBeLessThan(expectedWithoutFee)
      expect(output).toBeCloseTo(expectedWithFee, 1)
    })

    it('should return "0" for invalid input', () => {
      const result = calculateSwapOutput('invalid', reserve0, reserve1, 18, 18)
      expect(result).toBe('0')
    })

    it('should handle extreme price ratios', () => {
      // Pool with 1:1,000,000 ratio
      const smallReserve = parseUnits('1', 18)
      const largeReserve = parseUnits('1000000', 18)

      const result = calculateSwapOutput('0.001', smallReserve, largeReserve, 18, 18)
      const output = parseFloat(result)

      expect(output).toBeGreaterThan(0)
      expect(isFinite(output)).toBe(true)
    })
  })

  describe('usePairReserves', () => {
    const mockPairAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should return default reserves when data is undefined', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: undefined,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => usePairReserves(mockPairAddress))

      expect(result.current.reserve0).toBe(0n)
      expect(result.current.reserve1).toBe(0n)
      expect(result.current.blockTimestampLast).toBe(0)
    })

    it('should parse reserves data correctly', () => {
      const mockReserves: [bigint, bigint, number] = [
        parseUnits('1000', 18), // reserve0
        parseUnits('10000', 18), // reserve1
        1234567890, // timestamp
      ]

      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: mockReserves,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => usePairReserves(mockPairAddress))

      expect(result.current.reserve0).toBe(mockReserves[0])
      expect(result.current.reserve1).toBe(mockReserves[1])
      expect(result.current.blockTimestampLast).toBe(mockReserves[2])
    })

    it('should provide refetch function', () => {
      const mockRefetch = vi.fn()
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: undefined,
        refetch: mockRefetch,
      } as never)

      const { result } = renderHook(() => usePairReserves(mockPairAddress))

      expect(result.current.refetch).toBe(mockRefetch)
    })
  })

  describe('useTokenBalance', () => {
    const mockTokenAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`

    beforeEach(() => {
      vi.clearAllMocks()
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as `0x${string}`,
        isConnected: true,
      } as never)
    })

    it('should return default balance when data is undefined', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: undefined,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useTokenBalance(mockTokenAddress, 18))

      expect(result.current.balance).toBe(0n)
      expect(result.current.formatted).toBe('0')
    })

    it('should format balance correctly for 18 decimals', () => {
      const mockBalance = parseUnits('123.456', 18)

      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: mockBalance,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useTokenBalance(mockTokenAddress, 18))

      expect(result.current.balance).toBe(mockBalance)
      expect(result.current.formatted).toBe('123.456')
    })

    it('should format balance correctly for 6 decimals (USDC)', () => {
      const mockBalance = parseUnits('1000.5', 6)

      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: mockBalance,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useTokenBalance(mockTokenAddress, 6))

      expect(result.current.balance).toBe(mockBalance)
      expect(result.current.formatted).toBe('1000.5')
    })

    it('should format balance correctly for 8 decimals (WBTC)', () => {
      const mockBalance = parseUnits('0.5', 8)

      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: mockBalance,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useTokenBalance(mockTokenAddress, 8))

      expect(result.current.balance).toBe(mockBalance)
      expect(result.current.formatted).toBe('0.5')
    })

    it('should provide refetch function', () => {
      const mockRefetch = vi.fn()
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: 0n,
        refetch: mockRefetch,
      } as never)

      const { result } = renderHook(() => useTokenBalance(mockTokenAddress, 18))

      expect(result.current.refetch).toBe(mockRefetch)
    })
  })

  describe('useLPBalance', () => {
    const mockPairAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`

    beforeEach(() => {
      vi.clearAllMocks()
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as `0x${string}`,
        isConnected: true,
      } as never)
    })

    it('should return LP balance data', () => {
      const mockBalance = parseUnits('10.5', 18)

      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: mockBalance,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useLPBalance(mockPairAddress))

      expect(result.current.balance).toBe(mockBalance)
      expect(result.current.formatted).toBe('10.5')
    })
  })

  describe('useLPTotalSupply', () => {
    const mockPairAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should return total supply data', () => {
      const mockTotalSupply = parseUnits('1000000', 18)

      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: mockTotalSupply,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useLPTotalSupply(mockPairAddress))

      expect(result.current.totalSupply).toBe(mockTotalSupply)
      expect(result.current.formatted).toBe('1000000')
    })

    it('should return default when data is undefined', () => {
      vi.mocked(wagmi.useReadContract).mockReturnValue({
        data: undefined,
        refetch: vi.fn(),
      } as never)

      const { result } = renderHook(() => useLPTotalSupply(mockPairAddress))

      expect(result.current.totalSupply).toBe(0n)
      expect(result.current.formatted).toBe('0')
    })
  })

  describe('useSwapOnPair', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as `0x${string}`,
        isConnected: true,
      } as never)
    })

    it('should return swap function and transaction states', () => {
      const mockWriteContract = vi.fn()

      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        data: undefined,
        isPending: false,
        isError: false,
        error: null,
      } as never)

      vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
        isSuccess: false,
      } as never)

      const { result } = renderHook(() => useSwapOnPair())

      expect(result.current.swap).toBeDefined()
      expect(typeof result.current.swap).toBe('function')
      expect(result.current.isPending).toBe(false)
      expect(result.current.isSuccess).toBe(false)
      expect(result.current.isError).toBe(false)
    })

    it('should throw error when wallet not connected', async () => {
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: undefined,
        isConnected: false,
      } as never)

      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        writeContract: vi.fn(),
        data: undefined,
        isPending: false,
        isError: false,
        error: null,
      } as never)

      vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
        isSuccess: false,
      } as never)

      const { result } = renderHook(() => useSwapOnPair())

      await expect(
        result.current.swap(
          '0x1234567890123456789012345678901234567890' as `0x${string}`,
          '0xAAA',
          '0xBBB',
          '100',
          '99',
          18,
          18
        )
      ).rejects.toThrow('Wallet not connected')
    })

    it('should call writeContract with correct parameters when tokenIn < tokenOut', () => {
      const mockWriteContract = vi.fn()
      const mockAccount = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as `0x${string}`

      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        data: undefined,
        isPending: false,
        isError: false,
        error: null,
      } as never)

      vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
        isSuccess: false,
      } as never)

      const { result } = renderHook(() => useSwapOnPair())

      // Call swap with tokenIn (0xAAA) < tokenOut (0xBBB), so isAToken0 = true
      result.current.swap(
        '0x1234567890123456789012345678901234567890' as `0x${string}`,
        '0xAAA',
        '0xBBB',
        '100',
        '99',
        18,
        18
      )

      expect(mockWriteContract).toHaveBeenCalledWith({
        address: '0x1234567890123456789012345678901234567890',
        abi: expect.any(Array),
        functionName: 'swap',
        args: [0n, parseUnits('99', 18), mockAccount, '0x'],
      })
    })

    it('should call writeContract with correct parameters when tokenIn > tokenOut', () => {
      const mockWriteContract = vi.fn()
      const mockAccount = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as `0x${string}`

      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        data: undefined,
        isPending: false,
        isError: false,
        error: null,
      } as never)

      vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
        isSuccess: false,
      } as never)

      const { result } = renderHook(() => useSwapOnPair())

      // Call swap with tokenIn (0xCCC) > tokenOut (0xAAA), so isAToken0 = false
      result.current.swap(
        '0x1234567890123456789012345678901234567890' as `0x${string}`,
        '0xCCC',
        '0xAAA',
        '100',
        '99',
        18,
        18
      )

      expect(mockWriteContract).toHaveBeenCalledWith({
        address: '0x1234567890123456789012345678901234567890',
        abi: expect.any(Array),
        functionName: 'swap',
        args: [parseUnits('99', 18), 0n, mockAccount, '0x'],
      })
    })
  })

  describe('useAddLiquidity', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as `0x${string}`,
        isConnected: true,
      } as never)
    })

    it('should return addLiquidity function and transaction states', () => {
      const mockWriteContract = vi.fn()

      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        data: undefined,
        isPending: false,
        isError: false,
        error: null,
      } as never)

      vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
        isSuccess: false,
      } as never)

      const { result } = renderHook(() => useAddLiquidity())

      expect(result.current.addLiquidity).toBeDefined()
      expect(typeof result.current.addLiquidity).toBe('function')
      expect(result.current.isPending).toBe(false)
      expect(result.current.isSuccess).toBe(false)
    })

    it('should throw error when wallet not connected', async () => {
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: undefined,
        isConnected: false,
      } as never)

      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        writeContract: vi.fn(),
        data: undefined,
        isPending: false,
        isError: false,
        error: null,
      } as never)

      vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
        isSuccess: false,
      } as never)

      const { result } = renderHook(() => useAddLiquidity())

      await expect(
        result.current.addLiquidity(
          '0x1111' as `0x${string}`,
          '0x2222' as `0x${string}`,
          '0x3333' as `0x${string}`,
          '100',
          '200',
          18,
          18
        )
      ).rejects.toThrow('Wallet not connected')
    })

    it('should call writeContract with mint function when adding liquidity', () => {
      const mockWriteContract = vi.fn()
      const mockAccount = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as `0x${string}`

      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        data: undefined,
        isPending: false,
        isError: false,
        error: null,
      } as never)

      vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
        isSuccess: false,
      } as never)

      const { result } = renderHook(() => useAddLiquidity())

      result.current.addLiquidity(
        '0x1111111111111111111111111111111111111111' as `0x${string}`,
        '0x2222222222222222222222222222222222222222' as `0x${string}`,
        '0x3333333333333333333333333333333333333333' as `0x${string}`,
        '100',
        '200',
        18,
        18
      )

      expect(mockWriteContract).toHaveBeenCalledWith({
        address: '0x3333333333333333333333333333333333333333', // pairAddress is 3rd parameter
        abi: expect.any(Array),
        functionName: 'mint',
        args: [mockAccount],
      })
    })
  })

  describe('useRemoveLiquidity', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as `0x${string}`,
        isConnected: true,
      } as never)
    })

    it('should return removeLiquidity function and transaction states', () => {
      const mockWriteContract = vi.fn()

      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        data: undefined,
        isPending: false,
        isError: false,
        error: null,
      } as never)

      vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
        isSuccess: false,
      } as never)

      const { result } = renderHook(() => useRemoveLiquidity())

      expect(result.current.removeLiquidity).toBeDefined()
      expect(typeof result.current.removeLiquidity).toBe('function')
      expect(result.current.isPending).toBe(false)
      expect(result.current.isSuccess).toBe(false)
    })

    it('should throw error when wallet not connected', async () => {
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: undefined,
        isConnected: false,
      } as never)

      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        writeContract: vi.fn(),
        data: undefined,
        isPending: false,
        isError: false,
        error: null,
      } as never)

      vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
        isSuccess: false,
      } as never)

      const { result } = renderHook(() => useRemoveLiquidity())

      await expect(
        result.current.removeLiquidity('0x1234' as `0x${string}`, '500', 18)
      ).rejects.toThrow('Wallet not connected')
    })

    it('should call writeContract with burn function when removing liquidity', () => {
      const mockWriteContract = vi.fn()
      const mockAccount = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as `0x${string}`

      vi.mocked(wagmi.useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        data: undefined,
        isPending: false,
        isError: false,
        error: null,
      } as never)

      vi.mocked(wagmi.useWaitForTransactionReceipt).mockReturnValue({
        isSuccess: false,
      } as never)

      const { result } = renderHook(() => useRemoveLiquidity())

      result.current.removeLiquidity(
        '0x1234567890123456789012345678901234567890' as `0x${string}`,
        '500',
        18
      )

      expect(mockWriteContract).toHaveBeenCalledWith({
        address: '0x1234567890123456789012345678901234567890',
        abi: expect.any(Array),
        functionName: 'burn',
        args: [mockAccount],
      })
    })
  })
})
