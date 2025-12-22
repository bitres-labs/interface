import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useBlockNumber, useBlock } from 'wagmi'
import { Minter_ABI as MinterABI } from '@/abis'
import { CONTRACTS } from '@/config/contracts'
import { REFETCH_CONFIG_BY_TYPE } from '@/config/refetch'

export type CooldownOperation = 'mint' | 'redeemBTD' | 'redeemBTB'

interface CooldownInfo {
  isInCooldown: boolean
  remainingSeconds: number
  canOperate: boolean
  lastOperationTime: number
  interval: number
  refetch?: () => void
}

/**
 * Generic cooldown hook
 * Used for Mint BTD, Redeem BTD, Redeem BTB cooldown countdown
 */
export function useCooldown(operation: CooldownOperation): CooldownInfo {
  const { address } = useAccount()
  const [remainingSeconds, setRemainingSeconds] = useState(0)

  // Get the latest block timestamp (blockchain time)
  const { data: latestBlock } = useBlock({
    query: {
      refetchInterval: 1000, // Refresh every second to get latest block time
    },
  })

  const blockTimestamp = latestBlock?.timestamp ? Number(latestBlock.timestamp) : 0

  // Get latest block number, used to trigger data refresh
  const { data: blockNumber } = useBlockNumber({
    watch: true,
  })

  // Read operation interval configuration
  const intervalFunctionName =
    operation === 'mint'
      ? 'mintInterval'
      : operation === 'redeemBTD'
        ? 'redeemBTDInterval'
        : 'redeemBTBInterval'

  const { data: intervalData } = useReadContract({
    address: CONTRACTS.Minter,
    abi: MinterABI,
    functionName: intervalFunctionName,
    query: REFETCH_CONFIG_BY_TYPE.constant, // Interval config rarely changes
  })

  const interval = intervalData ? Number(intervalData) : 60 // Default 60 seconds

  // Read user's last operation time
  const lastTimeFunctionName =
    operation === 'mint'
      ? 'lastMintTime'
      : operation === 'redeemBTD'
        ? 'lastRedeemBTDTime'
        : 'lastRedeemBTBTime'

  const { data: lastTimeData, refetch: refetchLastTime } = useReadContract({
    address: CONTRACTS.Minter,
    abi: MinterABI,
    functionName: lastTimeFunctionName,
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
      refetchInterval: 2000, // Refresh every 2 seconds to ensure quick update after transaction
    },
  })

  const lastOperationTime = lastTimeData ? Number(lastTimeData) : 0

  // Calculate remaining time - use blockchain time instead of system time
  useEffect(() => {
    if (!blockTimestamp || lastOperationTime === 0) {
      setRemainingSeconds(0)
      return
    }

    const nextAllowedTime = lastOperationTime + interval
    const remaining = nextAllowedTime - blockTimestamp

    setRemainingSeconds(remaining > 0 ? remaining : 0)
  }, [lastOperationTime, interval, blockTimestamp, blockNumber])

  return {
    isInCooldown: remainingSeconds > 0,
    remainingSeconds,
    canOperate: remainingSeconds <= 0,
    lastOperationTime,
    interval,
    refetch: refetchLastTime,
  }
}

/**
 * Format remaining time as "1m 30s" or "45s"
 */
export function formatCooldownTime(seconds: number): string {
  if (seconds <= 0) return ''

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  }
  return `${remainingSeconds}s`
}
