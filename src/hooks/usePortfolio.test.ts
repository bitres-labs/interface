import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { parseUnits } from 'viem'
import * as wagmi from 'wagmi'
import * as useBalances from './useBalances'
import * as useStaking from './useStaking'
import * as useFarming from './useFarming'
import * as useAPY from './useAPY'
import { usePortfolio } from './usePortfolio'

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useBalance: vi.fn(),
}))

vi.mock('./useBalances', () => ({
  useWBTCBalance: vi.fn(),
  useBTDBalance: vi.fn(),
  useBTBBalance: vi.fn(),
  useBRSBalance: vi.fn(),
  useUSDCBalance: vi.fn(),
  useUSDTBalance: vi.fn(),
}))

vi.mock('./useStaking', () => ({
  useStakedBTD: vi.fn(),
  useStakedBTB: vi.fn(),
}))

vi.mock('./useFarming', () => ({
  useUserInfo: vi.fn(),
  usePendingReward: vi.fn(),
}))

vi.mock('./useAPY', () => ({
  useTokenPrices: vi.fn(),
}))

describe('usePortfolio', () => {
  const mockPrices = {
    WBTC: 100000,
    BRS: 10,
    BTD: 1.01,
    BTB: 1.0,
  }

  const mockAccount = '0x1234567890123456789012345678901234567890'

  beforeEach(() => {
    vi.clearAllMocks()

    // Default prices
    vi.mocked(useAPY.useTokenPrices).mockReturnValue(mockPrices)

    // Default: wallet connected
    vi.mocked(wagmi.useAccount).mockReturnValue({
      address: mockAccount as `0x${string}`,
      isConnected: true,
    } as never)
  })

  describe('when wallet is disconnected', () => {
    beforeEach(() => {
      // Mock all hooks even when disconnected (React rules of hooks)
      vi.mocked(wagmi.useAccount).mockReturnValue({
        address: undefined,
        isConnected: false,
      } as never)

      vi.mocked(wagmi.useBalance).mockReturnValue({
        data: undefined,
      } as never)

      vi.mocked(useBalances.useWBTCBalance).mockReturnValue({ balance: '0' } as never)
      vi.mocked(useBalances.useBTDBalance).mockReturnValue({ balance: '0' } as never)
      vi.mocked(useBalances.useBTBBalance).mockReturnValue({ balance: '0' } as never)
      vi.mocked(useBalances.useBRSBalance).mockReturnValue({ balance: '0' } as never)
      vi.mocked(useBalances.useUSDCBalance).mockReturnValue({ balance: '0' } as never)
      vi.mocked(useBalances.useUSDTBalance).mockReturnValue({ balance: '0' } as never)

      vi.mocked(useStaking.useStakedBTD).mockReturnValue({ staked: '0' } as never)
      vi.mocked(useStaking.useStakedBTB).mockReturnValue({ staked: '0' } as never)

      vi.mocked(useFarming.useUserInfo).mockReturnValue({ stakedAmount: '0' })
      vi.mocked(useFarming.usePendingReward).mockReturnValue({ pendingReward: '0' })
    })

    it('should return zero portfolio', () => {
      const { result } = renderHook(() => usePortfolio())

      expect(result.current.totalValue).toBe(0)
      expect(result.current.walletBalance).toBe('0.00')
      expect(result.current.staked).toBe('0.00')
      expect(result.current.farming).toBe('0.00')
      expect(result.current.rewards).toBe('0.00')
      expect(result.current.totalPendingBRS).toBe(0)
      expect(result.current.tokens).toEqual([])
    })
  })

  describe('when wallet is connected', () => {
    beforeEach(() => {
      // Mock ETH balance
      vi.mocked(wagmi.useBalance).mockReturnValue({
        data: {
          value: parseUnits('1', 18), // 1 ETH
          decimals: 18,
          formatted: '1',
          symbol: 'ETH',
        },
      } as never)

      // Mock token balances
      vi.mocked(useBalances.useWBTCBalance).mockReturnValue({ balance: '0.5' } as never) // 0.5 WBTC
      vi.mocked(useBalances.useBTDBalance).mockReturnValue({ balance: '1000' } as never)
      vi.mocked(useBalances.useBTBBalance).mockReturnValue({ balance: '500' } as never)
      vi.mocked(useBalances.useBRSBalance).mockReturnValue({ balance: '2000' } as never)
      vi.mocked(useBalances.useUSDCBalance).mockReturnValue({ balance: '5000' } as never)
      vi.mocked(useBalances.useUSDTBalance).mockReturnValue({ balance: '3000' } as never)

      // Mock staked balances
      vi.mocked(useStaking.useStakedBTD).mockReturnValue({ staked: '800' } as never)
      vi.mocked(useStaking.useStakedBTB).mockReturnValue({ staked: '600' } as never)

      // Mock farming positions (9 pools)
      vi.mocked(useFarming.useUserInfo).mockImplementation((poolId: number) => {
        const stakes: Record<number, string> = {
          0: '100', // BRS/BTD LP
          1: '200', // BTD/USDC LP
          2: '50',  // BTB/BTD LP
          3: '1000', // USDC
          4: '500',  // USDT
          5: '0.1',  // WBTC
          6: '300',  // stBTD
          7: '200',  // stBTB
          8: '500',  // BRS
        }
        return { stakedAmount: stakes[poolId] || '0' }
      })

      // Mock pending rewards
      vi.mocked(useFarming.usePendingReward).mockImplementation((poolId: number) => {
        const rewards: Record<number, string> = {
          0: '10',
          1: '20',
          2: '5',
          3: '15',
          4: '8',
          5: '12',
          6: '25',
          7: '18',
          8: '30',
        }
        return { pendingReward: rewards[poolId] || '0' }
      })
    })

    it('should calculate wallet balance value', () => {
      const { result } = renderHook(() => usePortfolio())

      // 1 ETH * $3000 + 0.5 WBTC * $100k + 1000 BTD * $1.01 + 500 BTB * $1 + 2000 BRS * $10 + 5000 USDC + 3000 USDT
      // = $3000 + $50000 + $1010 + $500 + $20000 + $5000 + $3000 = $82510
      const walletValue = parseFloat(result.current.walletBalance)
      expect(walletValue).toBeCloseTo(82510, 0)
    })

    it('should calculate staked value', () => {
      const { result } = renderHook(() => usePortfolio())

      // 800 stBTD * $1.01 + 600 stBTB * $1 = $808 + $600 = $1408
      const stakedValue = parseFloat(result.current.staked)
      expect(stakedValue).toBeCloseTo(1408, 0)
    })

    it('should calculate farming value with correct LP prices', () => {
      const { result } = renderHook(() => usePortfolio())

      // Pool 0: 100 * (10*0.5 + 1.01*0.5) = 100 * 5.505 = 550.5
      // Pool 1: 200 * (1.01*0.5 + 1*0.5) = 200 * 1.005 = 201
      // Pool 2: 50 * (1*0.5 + 1.01*0.5) = 50 * 1.005 = 50.25
      // Pool 3: 1000 * 1 = 1000
      // Pool 4: 500 * 1 = 500
      // Pool 5: 0.1 * 100000 = 10000
      // Pool 6: 300 * 1.01 = 303
      // Pool 7: 200 * 1 = 200
      // Pool 8: 500 * 10 = 5000
      // Total: 550.5 + 201 + 50.25 + 1000 + 500 + 10000 + 303 + 200 + 5000 = 17804.75
      const farmingValue = parseFloat(result.current.farming)
      expect(farmingValue).toBeCloseTo(17804.75, 0)
    })

    it('should calculate total pending BRS correctly', () => {
      const { result } = renderHook(() => usePortfolio())

      // 10 + 20 + 5 + 15 + 8 + 12 + 25 + 18 + 30 = 143 BRS
      expect(result.current.totalPendingBRS).toBe(143)
    })

    it('should calculate rewards value', () => {
      const { result } = renderHook(() => usePortfolio())

      // 143 BRS * $10 = $1430
      const rewardsValue = parseFloat(result.current.rewards)
      expect(rewardsValue).toBeCloseTo(1430, 0)
    })

    it('should calculate total portfolio value', () => {
      const { result } = renderHook(() => usePortfolio())

      // wallet + staked + farming + rewards
      // ≈ 82510 + 1408 + 17804.75 + 1430 = 103152.75
      expect(result.current.totalValue).toBeCloseTo(103152.75, 0)
    })

    it('should include tokens array', () => {
      const { result } = renderHook(() => usePortfolio())

      expect(result.current.tokens).toHaveLength(7)
      expect(result.current.tokens.map(t => t.symbol)).toEqual([
        'BTD',
        'BTB',
        'BRS',
        'WBTC',
        'ETH',
        'USDC',
        'USDT',
      ])
    })

    it('should include correct token amounts and values', () => {
      const { result } = renderHook(() => usePortfolio())

      const btdToken = result.current.tokens.find(t => t.symbol === 'BTD')
      expect(btdToken).toBeDefined()
      expect(btdToken?.amount).toBe(1000)
      expect(btdToken?.value).toBeCloseTo(1010, 0)

      const wbtcToken = result.current.tokens.find(t => t.symbol === 'WBTC')
      expect(wbtcToken).toBeDefined()
      expect(wbtcToken?.amount).toBe(0.5)
      expect(wbtcToken?.value).toBeCloseTo(50000, 0)
    })

    it('should handle undefined balances gracefully', () => {
      vi.mocked(useBalances.useWBTCBalance).mockReturnValue({ balance: undefined } as never)

      const { result } = renderHook(() => usePortfolio())

      const wbtcToken = result.current.tokens.find(t => t.symbol === 'WBTC')
      expect(wbtcToken?.amount).toBe(0)
      expect(wbtcToken?.value).toBe(0)
    })

    it('should handle no ETH balance', () => {
      vi.mocked(wagmi.useBalance).mockReturnValue({
        data: undefined,
      } as never)

      const { result } = renderHook(() => usePortfolio())

      const ethToken = result.current.tokens.find(t => t.symbol === 'ETH')
      expect(ethToken?.amount).toBe(0)
      expect(ethToken?.value).toBe(0)
    })

    it('should update when prices change', () => {
      const { result, rerender } = renderHook(() => usePortfolio())

      const initialTotal = result.current.totalValue

      // Double BRS price
      vi.mocked(useAPY.useTokenPrices).mockReturnValue({
        ...mockPrices,
        BRS: 20,
      })

      rerender()

      // Total should change when prices change
      expect(result.current.totalValue).not.toBe(initialTotal)
      expect(result.current.totalValue).toBeGreaterThan(initialTotal)
    })

    it('should format values as fixed 2 decimals', () => {
      const { result } = renderHook(() => usePortfolio())

      expect(result.current.walletBalance).toMatch(/^\d+\.\d{2}$/)
      expect(result.current.staked).toMatch(/^\d+\.\d{2}$/)
      expect(result.current.farming).toMatch(/^\d+\.\d{2}$/)
      expect(result.current.rewards).toMatch(/^\d+\.\d{2}$/)
    })

    it('should handle invalid number values', () => {
      vi.mocked(useBalances.useBRSBalance).mockReturnValue({ balance: 'invalid' } as never)

      const { result } = renderHook(() => usePortfolio())

      // Should default to 0 for invalid values
      const brsToken = result.current.tokens.find(t => t.symbol === 'BRS')
      expect(brsToken?.amount).toBe(0)
    })
  })
})
