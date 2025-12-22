/**
 * Auto Refresh After Transaction Hook
 *
 * Purpose: Automatically refresh related data after transaction completes
 * Principle: Listen to transaction status, trigger data refresh on success
 *
 * This is an optimization for "static data":
 * - Balance, position and other data only change after transactions
 * - Disable automatic polling refresh
 * - Only refresh when transaction completes
 * - Significantly reduce server requests
 */

import { useEffect } from 'react'
import { useWaitForTransactionReceipt } from 'wagmi'
import { logger } from '@/utils/logger'

interface RefreshCallbacks {
  onSuccess?: () => void
  onError?: () => void
}

/**
 * Refresh data after transaction completes
 * @param hash Transaction hash
 * @param callbacks Refresh callback functions
 */
export function useRefreshAfterTx(
  hash: `0x${string}` | undefined,
  callbacks?: RefreshCallbacks
) {
  const { isSuccess, isError, error } = useWaitForTransactionReceipt({
    hash,
  })

  useEffect(() => {
    if (isSuccess) {
      logger.log('[RefreshAfterTx] Transaction successful, refreshing data...')
      callbacks?.onSuccess?.()
    }
  }, [isSuccess, callbacks])

  useEffect(() => {
    if (isError) {
      logger.error('[RefreshAfterTx] Transaction failed:', error)
      callbacks?.onError?.()
    }
  }, [isError, error, callbacks])

  return {
    isSuccess,
    isError,
    error,
  }
}

/**
 * Refresh all balances after any transaction completes
 * Suitable for scenarios with multiple transaction hashes
 * @param hashes Array of transaction hashes
 * @param onRefresh Refresh callback
 */
export function useRefreshBalancesAfterTx(
  hashes: (`0x${string}` | undefined)[],
  onRefresh?: () => void
) {
  const results = hashes.map(hash =>
    useWaitForTransactionReceipt({
      hash,
    })
  )

  useEffect(() => {
    const hasSuccess = results.some(r => r.isSuccess)
    if (hasSuccess && onRefresh) {
      logger.log('[RefreshBalancesAfterTx] Transaction successful, refreshing balances...')
      onRefresh()
    }
  }, [results, onRefresh])

  return {
    isAnySuccess: results.some(r => r.isSuccess),
    isAnyPending: results.some(r => r.isLoading),
    isAnyError: results.some(r => r.isError),
  }
}
