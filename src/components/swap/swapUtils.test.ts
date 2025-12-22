import { describe, it, expect } from 'vitest'
import { ALL_TOKENS, findPool } from './swapUtils'

describe('swapUtils', () => {
  describe('ALL_TOKENS', () => {
    it('should contain 5 unique tokens', () => {
      expect(ALL_TOKENS).toHaveLength(5)
    })

    it('should include BRS token', () => {
      const brs = ALL_TOKENS.find(t => t.symbol === 'BRS')
      expect(brs).toBeDefined()
      expect(brs?.decimals).toBe(18)
    })

    it('should include BTD token', () => {
      const btd = ALL_TOKENS.find(t => t.symbol === 'BTD')
      expect(btd).toBeDefined()
      expect(btd?.decimals).toBe(18)
    })

    it('should include USDC token', () => {
      const usdc = ALL_TOKENS.find(t => t.symbol === 'USDC')
      expect(usdc).toBeDefined()
      expect(usdc?.decimals).toBe(6)
    })

    it('should include BTB token', () => {
      const btb = ALL_TOKENS.find(t => t.symbol === 'BTB')
      expect(btb).toBeDefined()
      expect(btb?.decimals).toBe(18)
    })

    it('should include WBTC token', () => {
      const wbtc = ALL_TOKENS.find(t => t.symbol === 'WBTC')
      expect(wbtc).toBeDefined()
      expect(wbtc?.decimals).toBe(8)
    })

    it('all tokens should have address', () => {
      ALL_TOKENS.forEach(token => {
        expect(token.address).toMatch(/^0x[a-fA-F0-9]{40}$/)
      })
    })
  })

  describe('findPool', () => {
    it('should find BRS/BTD pool', () => {
      const pool = findPool('BRS', 'BTD')
      expect(pool).toBeDefined()
      expect(pool?.name).toBe('BRS/BTD')
    })

    it('should find pool regardless of token order', () => {
      const pool1 = findPool('BRS', 'BTD')
      const pool2 = findPool('BTD', 'BRS')
      expect(pool1).toEqual(pool2)
    })

    it('should find BTD/USDC pool', () => {
      const pool = findPool('BTD', 'USDC')
      expect(pool).toBeDefined()
      expect(pool?.name).toBe('BTD/USDC')
    })

    it('should find BTB/BTD pool', () => {
      const pool = findPool('BTB', 'BTD')
      expect(pool).toBeDefined()
      expect(pool?.name).toBe('BTB/BTD')
    })

    it('should find WBTC/USDC pool', () => {
      const pool = findPool('WBTC', 'USDC')
      expect(pool).toBeDefined()
      expect(pool?.name).toBe('WBTC/USDC')
    })

    it('should return undefined for non-existent pool', () => {
      const pool = findPool('BRS', 'WBTC')
      expect(pool).toBeUndefined()
    })

    it('should return undefined for invalid tokens', () => {
      const pool = findPool('INVALID1', 'INVALID2')
      expect(pool).toBeUndefined()
    })

    it('should return undefined for same token pair', () => {
      const pool = findPool('BRS', 'BRS')
      expect(pool).toBeUndefined()
    })
  })
})
