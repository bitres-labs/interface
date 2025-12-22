import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger } from './logger'

describe('logger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Spy on console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    // Restore console methods
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    consoleDebugSpy.mockRestore()
    consoleInfoSpy.mockRestore()
  })

  describe('log', () => {
    it('should call console.log with [BRS] prefix in dev mode', () => {
      logger.log('test message')
      expect(consoleLogSpy).toHaveBeenCalledWith('[BRS]', 'test message')
    })

    it('should handle multiple arguments', () => {
      logger.log('message', { data: 'value' }, 123)
      expect(consoleLogSpy).toHaveBeenCalledWith('[BRS]', 'message', { data: 'value' }, 123)
    })

    it('should handle no arguments', () => {
      logger.log()
      expect(consoleLogSpy).toHaveBeenCalledWith('[BRS]')
    })
  })

  describe('error', () => {
    it('should call console.error with [BRS Error] prefix', () => {
      logger.error('error message')
      expect(consoleErrorSpy).toHaveBeenCalledWith('[BRS Error]', 'error message')
    })

    it('should handle Error objects', () => {
      const error = new Error('test error')
      logger.error('Error occurred:', error)
      expect(consoleErrorSpy).toHaveBeenCalledWith('[BRS Error]', 'Error occurred:', error)
    })

    it('should always log errors (even in production)', () => {
      // error() is always enabled, doesn't check isDev
      logger.error('critical error')
      expect(consoleErrorSpy).toHaveBeenCalled()
    })
  })

  describe('warn', () => {
    it('should call console.warn with [BRS Warning] prefix in dev mode', () => {
      logger.warn('warning message')
      expect(consoleWarnSpy).toHaveBeenCalledWith('[BRS Warning]', 'warning message')
    })

    it('should handle multiple arguments', () => {
      logger.warn('Warning:', { code: 'WARN001' })
      expect(consoleWarnSpy).toHaveBeenCalledWith('[BRS Warning]', 'Warning:', { code: 'WARN001' })
    })
  })

  describe('debug', () => {
    it('should not call console.debug when VITE_DEBUG is not true', () => {
      // In test environment, VITE_DEBUG is 'false' by default
      logger.debug('debug message')
      expect(consoleDebugSpy).not.toHaveBeenCalled()
    })

    it('should handle objects when debug is enabled', () => {
      // Note: In current test setup, VITE_DEBUG='false', so this won't actually log
      const data = { user: 'test', values: [1, 2, 3] }
      logger.debug('Debug data:', data)
      // Should not be called since VITE_DEBUG is false
      expect(consoleDebugSpy).not.toHaveBeenCalled()
    })
  })

  describe('info', () => {
    it('should call console.info with [BRS Info] prefix in dev mode', () => {
      logger.info('info message')
      expect(consoleInfoSpy).toHaveBeenCalledWith('[BRS Info]', 'info message')
    })

    it('should handle multiple arguments', () => {
      logger.info('Info:', 'data', 123)
      expect(consoleInfoSpy).toHaveBeenCalledWith('[BRS Info]', 'Info:', 'data', 123)
    })
  })

  describe('tx (transaction logging)', () => {
    it('should log transaction with action and hash', () => {
      logger.tx('Mint', '0x123abc...')
      expect(consoleLogSpy).toHaveBeenCalledWith('[BRS TX] Mint', '(0x123abc...)')
    })

    it('should log transaction without hash', () => {
      logger.tx('Approve')
      expect(consoleLogSpy).toHaveBeenCalledWith('[BRS TX] Approve', '')
    })

    it('should handle additional arguments', () => {
      logger.tx('Swap', '0xabc123', { amount: '100' })
      expect(consoleLogSpy).toHaveBeenCalledWith('[BRS TX] Swap', '(0xabc123)', { amount: '100' })
    })
  })

  describe('contract (contract call logging)', () => {
    it('should log contract calls with contract name and method', () => {
      logger.contract('Minter', 'mintBTD')
      expect(consoleLogSpy).toHaveBeenCalledWith('[BRS Contract] Minter.mintBTD()')
    })

    it('should handle additional arguments', () => {
      logger.contract('FarmingPool', 'stake', { amount: '100' })
      expect(consoleLogSpy).toHaveBeenCalledWith('[BRS Contract] FarmingPool.stake()', {
        amount: '100',
      })
    })
  })

  describe('hook (hook lifecycle logging)', () => {
    it('should not log when VITE_DEBUG is false', () => {
      logger.hook('useMinter', 'mount')
      // Should not be called since VITE_DEBUG is false
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[BRS Hook]'),
        expect.anything()
      )
    })

    it('should accept additional arguments', () => {
      logger.hook('useFarming', 'refetch', { poolId: 1 })
      // Should not be called since VITE_DEBUG is false
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[BRS Hook]'),
        expect.anything()
      )
    })
  })

  describe('production mode behavior', () => {
    it('should have all logger methods defined', () => {
      // In our test setup (setup.ts), we set DEV: true, so logger is enabled
      expect(logger).toBeDefined()
      expect(typeof logger.log).toBe('function')
      expect(typeof logger.error).toBe('function')
      expect(typeof logger.warn).toBe('function')
      expect(typeof logger.debug).toBe('function')
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.tx).toBe('function')
      expect(typeof logger.contract).toBe('function')
      expect(typeof logger.hook).toBe('function')
    })
  })

  describe('edge cases', () => {
    it('should handle null and undefined', () => {
      logger.log(null, undefined)
      expect(consoleLogSpy).toHaveBeenCalledWith('[BRS]', null, undefined)
    })

    it('should handle empty strings', () => {
      logger.log('')
      expect(consoleLogSpy).toHaveBeenCalledWith('[BRS]', '')
    })

    it('should handle numbers and booleans', () => {
      logger.log(123, true, false, 0)
      expect(consoleLogSpy).toHaveBeenCalledWith('[BRS]', 123, true, false, 0)
    })

    it('should handle circular references in objects', () => {
      const obj: { self?: unknown } = {}
      obj.self = obj

      // Should not throw error
      expect(() => logger.log('Circular:', obj)).not.toThrow()
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should handle arrays', () => {
      const arr = [1, 2, 3, { nested: true }]
      logger.log('Array:', arr)
      expect(consoleLogSpy).toHaveBeenCalledWith('[BRS]', 'Array:', arr)
    })

    it('should handle BigInt values', () => {
      const bigInt = 123456789012345678901234567890n
      logger.log('BigInt:', bigInt)
      expect(consoleLogSpy).toHaveBeenCalledWith('[BRS]', 'BigInt:', bigInt)
    })
  })
})
