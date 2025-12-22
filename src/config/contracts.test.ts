import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  CONTRACTS,
  NETWORK_CONFIG,
  TOKEN_DECIMALS,
  hydrateContractsFromDeployment,
} from './contracts'

describe('contracts', () => {
  describe('CONTRACTS', () => {
    it('should have all required contract addresses', () => {
      // Mock Tokens
      expect(CONTRACTS.WBTC).toBeDefined()
      expect(CONTRACTS.USDC).toBeDefined()
      expect(CONTRACTS.USDT).toBeDefined()

      // Core Tokens
      expect(CONTRACTS.BRS).toBeDefined()
      expect(CONTRACTS.BTD).toBeDefined()
      expect(CONTRACTS.BTB).toBeDefined()

      // Staking Tokens
      expect(CONTRACTS.stBTD).toBeDefined()
      expect(CONTRACTS.stBTB).toBeDefined()

      // Oracles
      expect(CONTRACTS.BTCPriceFeed).toBeDefined()
      expect(CONTRACTS.CPIOracle).toBeDefined()
      expect(CONTRACTS.FFROracle).toBeDefined()
      expect(CONTRACTS.IdealUSDManager).toBeDefined()
      expect(CONTRACTS.PriceOracle).toBeDefined()

      // Uniswap V2 Pairs
      expect(CONTRACTS.BTBBTDPair).toBeDefined()
      expect(CONTRACTS.BRSBTDPair).toBeDefined()
      expect(CONTRACTS.BTDUSDCPair).toBeDefined()
      expect(CONTRACTS.WBTCUSDCPair).toBeDefined()

      // Core Contracts
      expect(CONTRACTS.Config).toBeDefined()
      expect(CONTRACTS.Treasury).toBeDefined()
      expect(CONTRACTS.Minter).toBeDefined()
      expect(CONTRACTS.InterestPool).toBeDefined()
      expect(CONTRACTS.FarmingPool).toBeDefined()
      expect(CONTRACTS.StakingRouter).toBeDefined()
    })

    it('should have valid Ethereum addresses', () => {
      Object.values(CONTRACTS).forEach(address => {
        expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/)
      })
    })
  })

  describe('NETWORK_CONFIG', () => {
    it('should have correct chain ID for Hardhat', () => {
      expect(NETWORK_CONFIG.chainId).toBe(31337)
    })

    it('should have correct chain name', () => {
      expect(NETWORK_CONFIG.chainName).toBe('Hardhat Local')
    })

    it('should have RPC URL', () => {
      expect(NETWORK_CONFIG.rpcUrl).toBeDefined()
      expect(NETWORK_CONFIG.rpcUrl).toContain('8545')
    })

    it('should have Windows IP configured', () => {
      expect(NETWORK_CONFIG.windowsIP).toBe('192.168.2.151')
    })

    it('should have empty block explorer for local network', () => {
      expect(NETWORK_CONFIG.blockExplorer).toBe('')
    })
  })

  describe('TOKEN_DECIMALS', () => {
    it('should have correct decimals for WBTC', () => {
      expect(TOKEN_DECIMALS.WBTC).toBe(8)
    })

    it('should have correct decimals for stablecoins', () => {
      expect(TOKEN_DECIMALS.USDC).toBe(6)
      expect(TOKEN_DECIMALS.USDT).toBe(6)
    })

    it('should have correct decimals for system tokens', () => {
      expect(TOKEN_DECIMALS.BTD).toBe(18)
      expect(TOKEN_DECIMALS.BTB).toBe(18)
      expect(TOKEN_DECIMALS.BRS).toBe(18)
      expect(TOKEN_DECIMALS.stBTD).toBe(18)
      expect(TOKEN_DECIMALS.stBTB).toBe(18)
    })
  })

  describe('hydrateContractsFromDeployment', () => {
    let fetchSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      // Save original CONTRACTS values
      fetchSpy = vi.spyOn(global, 'fetch')
    })

    afterEach(() => {
      fetchSpy.mockRestore()
    })

    it('should return early if fetch is undefined', async () => {
      // Temporarily remove fetch
      const originalFetch = global.fetch
      // @ts-expect-error - Testing fetch undefined
      global.fetch = undefined

      await hydrateContractsFromDeployment()

      // Should not throw
      expect(true).toBe(true)

      // Restore fetch
      global.fetch = originalFetch
    })

    it('should handle successful fetch with valid data', async () => {
      const mockData = {
        contracts: {
          BRS: '0x1111111111111111111111111111111111111111',
          BTD: '0x2222222222222222222222222222222222222222',
        },
      }

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response)

      await hydrateContractsFromDeployment()

      // Addresses should be updated
      expect(CONTRACTS.BRS).toBe('0x1111111111111111111111111111111111111111')
      expect(CONTRACTS.BTD).toBe('0x2222222222222222222222222222222222222222')
    })

    it('should handle fetch failure (404)', async () => {
      const originalBRS = CONTRACTS.BRS

      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)

      await hydrateContractsFromDeployment()

      // Addresses should remain unchanged
      expect(CONTRACTS.BRS).toBe(originalBRS)
    })

    it('should handle invalid JSON response', async () => {
      const originalBRS = CONTRACTS.BRS

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON')
        },
      } as Response)

      await hydrateContractsFromDeployment()

      // Addresses should remain unchanged
      expect(CONTRACTS.BRS).toBe(originalBRS)
    })

    it('should handle missing contracts field', async () => {
      const originalBRS = CONTRACTS.BRS

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)

      await hydrateContractsFromDeployment()

      // Addresses should remain unchanged
      expect(CONTRACTS.BRS).toBe(originalBRS)
    })

    it('should handle contracts field with wrong type', async () => {
      const originalBRS = CONTRACTS.BRS

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ contracts: 'not an object' }),
      } as Response)

      await hydrateContractsFromDeployment()

      // Addresses should remain unchanged
      expect(CONTRACTS.BRS).toBe(originalBRS)
    })

    it('should handle case-insensitive contract names', async () => {
      const mockData = {
        contracts: {
          brs: '0x3333333333333333333333333333333333333333', // lowercase
          BTD: '0x4444444444444444444444444444444444444444', // uppercase
          BtB: '0x5555555555555555555555555555555555555555', // mixed case
        },
      }

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response)

      await hydrateContractsFromDeployment()

      // All should be updated regardless of case
      expect(CONTRACTS.BRS).toBe('0x3333333333333333333333333333333333333333')
      expect(CONTRACTS.BTD).toBe('0x4444444444444444444444444444444444444444')
      expect(CONTRACTS.BTB).toBe('0x5555555555555555555555555555555555555555')
    })

    it('should ignore non-string values in contracts', async () => {
      const originalBRS = CONTRACTS.BRS

      const mockData = {
        contracts: {
          BRS: 12345, // number instead of string
          BTD: null, // null
          BTB: undefined, // undefined
        },
      }

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response)

      await hydrateContractsFromDeployment()

      // Should remain unchanged for non-string values
      expect(CONTRACTS.BRS).toBe(originalBRS)
    })

    it('should only update existing contract keys', async () => {
      const mockData = {
        contracts: {
          BRS: '0x6666666666666666666666666666666666666666',
          NonExistentContract: '0x7777777777777777777777777777777777777777',
        },
      }

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response)

      await hydrateContractsFromDeployment()

      // BRS should be updated
      expect(CONTRACTS.BRS).toBe('0x6666666666666666666666666666666666666666')

      // Non-existent key should not be added
      expect((CONTRACTS as never)['NonExistentContract']).toBeUndefined()
    })

    it('should add cache-busting parameter to fetch', async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ contracts: {} }),
      } as Response)

      await hydrateContractsFromDeployment()

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\/deployment-local-state\.json\?ts=\d+/),
        { cache: 'no-cache' }
      )
    })
  })
})
