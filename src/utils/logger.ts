/**
 * Unified Logger Utility
 * Replaces direct console.log/error/warn calls
 * Automatically disabled in production
 */

const isDev = import.meta.env.DEV
const isDebug = import.meta.env.VITE_DEBUG === 'true'

export const logger = {
  /**
   * General logging (development only)
   */
  log: (...args: unknown[]) => {
    if (isDev) {
      console.log('[BRS]', ...args)
    }
  },

  /**
   * Error logging (always enabled, can send to error tracking service)
   */
  error: (...args: unknown[]) => {
    console.error('[BRS Error]', ...args)
    // TODO: Send to error tracking service (e.g., Sentry)
    // if (import.meta.env.PROD) {
    //   sendToErrorTracker(args)
    // }
  },

  /**
   * Warning logging (development + production)
   */
  warn: (...args: unknown[]) => {
    if (isDev || import.meta.env.VITE_SHOW_WARNINGS) {
      console.warn('[BRS Warning]', ...args)
    }
  },

  /**
   * Debug logging (only when VITE_DEBUG=true)
   */
  debug: (...args: unknown[]) => {
    if (isDev && isDebug) {
      console.debug('[BRS Debug]', ...args)
    }
  },

  /**
   * Info logging (development only)
   */
  info: (...args: unknown[]) => {
    if (isDev) {
      console.info('[BRS Info]', ...args)
    }
  },

  /**
   * Transaction logging (useful for blockchain operations)
   */
  tx: (action: string, hash?: string, ...args: unknown[]) => {
    if (isDev) {
      console.log(`[BRS TX] ${action}`, hash ? `(${hash})` : '', ...args)
    }
  },

  /**
   * Contract call logging
   */
  contract: (contractName: string, method: string, ...args: unknown[]) => {
    if (isDev) {
      console.log(`[BRS Contract] ${contractName}.${method}()`, ...args)
    }
  },

  /**
   * Hook lifecycle logging
   */
  hook: (hookName: string, event: string, ...args: unknown[]) => {
    if (isDev && isDebug) {
      console.log(`[BRS Hook] ${hookName} - ${event}`, ...args)
    }
  },
}

export default logger
