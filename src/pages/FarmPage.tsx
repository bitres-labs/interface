import { useMemo, useState, useEffect, useCallback } from 'react'
import { logger } from '@/utils/logger'
import { TrendingUp } from 'lucide-react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { formatUnits, parseUnits } from 'viem'
import { useDeposit, useWithdraw, useClaim } from '@/hooks/useFarming'
import { useTokenAllowance, useETHBalance, useBTDBalance, useBTBBalance } from '@/hooks/useBalances'
import { CONTRACTS, TOKEN_DECIMALS } from '@/config/contracts'
import { useReadContract } from 'wagmi'
import { ERC20_ABI as ERC20ABI, WETH_ABI } from '@/abis'
import { blockInvalidNumberInput } from '@/utils/input'
import { useApproveAndExecute } from '@/hooks/useApproveAndExecute'
import { useFarmingPositions } from '@/hooks/useFarmingPositions'
import { TokenIcon, DualTokenIcon } from '@/components/common/TokenIcon'
import { formatCurrency, getTokenDecimals, formatLPBalance, formatSmartPercentage, formatSmallAmount } from '@/utils/format'
import { useBRSMined, useBRSMaxSupply, useWBTCPrice, useBTDPrice, useBTBPrice, useBRSPrice, useWETHPrice } from '@/hooks/useSystemStats'
import { ConvertAndStakeModal } from '@/components/farm/ConvertAndStakeModal'
import { WithdrawConvertModal } from '@/components/farm/WithdrawConvertModal'
import { useBTDStakeRate, useBTBStakeRate } from '@/hooks/useStakingRate'
import { useAllLPTokenPrices } from '@/hooks/useLPTokenPrice'
// import { usePoolDailyLimit } from '@/hooks/useFarmingLimit' // 24h limit feature disabled

// Pool limit display component - disabled
// function PoolLimitDisplay({ poolId }: { poolId: number }) {
//   const poolLimit = usePoolDailyLimit(poolId)
//   ...
// }

function FarmPage() {
  const { address, isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const [filterType, setFilterType] = useState('all') // all, lp, single
  const [stakeAmounts, setStakeAmounts] = useState<Record<number, string>>({}) // Store stake amount for each pool
  const [pendingWETHStake, setPendingWETHStake] = useState<{
    poolId: number
    amount: string
    decimals: number
  } | null>(null)
  const [pendingWETHWithdraw, setPendingWETHWithdraw] = useState<{
    amount: string
  } | null>(null)

  // Convert and stake modal state
  const [convertModalOpen, setConvertModalOpen] = useState(false)
  const [convertModalData, setConvertModalData] = useState<{
    convertType: 'eth-to-weth' | 'btd-to-stbtd' | 'btb-to-stbtb'
    poolId: number
    tokenSymbol: string
    targetTokenSymbol: string
    presetAmount?: string
    desiredTargetAmount?: number
    currentTargetBalance?: number
    shortageTargetAmount?: number
  } | null>(null)

  // Withdraw and convert modal state
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false)
  const [withdrawModalData, setWithdrawModalData] = useState<{
    withdrawType: 'weth' | 'stbtd' | 'stbtb'
    poolId: number
    stakedAmount: number
    withdrawAmount: string
    tokenSymbol: string
    baseTokenSymbol: string
  } | null>(null)

  // Get base token balances for auto-convert detection
  const { balanceRaw: ethBalanceRaw } = useETHBalance()
  const { balanceRaw: btdBalanceRaw } = useBTDBalance()
  const { balanceRaw: btbBalanceRaw } = useBTBBalance()

  // WETH deposit hook (for ETH → WETH conversion)
  const { writeContract: writeWETH, data: wethHash, isPending: isWETHPending } = useWriteContract()
  const { isSuccess: isWETHSuccess } = useWaitForTransactionReceipt({ hash: wethHash })

  // WETH withdraw hook (for WETH → ETH conversion)
  const {
    writeContract: writeWETHWithdraw,
    data: wethWithdrawHash,
    isPending: isWETHWithdrawPending,
  } = useWriteContract()
  const { isSuccess: isWETHWithdrawSuccess } = useWaitForTransactionReceipt({
    hash: wethWithdrawHash,
  })

  // Use unified farming positions hook
  const { pools: farmingPools, totalPendingRewards, refetchAll } = useFarmingPositions()
  const btdStakeRate = useBTDStakeRate()
  const btbStakeRate = useBTBStakeRate()

  // BRS mining progress data
  const { minedAmount } = useBRSMined()
  const { maxSupply } = useBRSMaxSupply()
  const miningProgress = maxSupply > 0 ? (minedAmount / maxSupply) * 100 : 0

  // Token prices for USD value calculation
  const { wbtcPrice } = useWBTCPrice()
  const { wethPrice } = useWETHPrice()
  const { btdPrice } = useBTDPrice()
  const { btbPrice } = useBTBPrice()
  const { brsPrice } = useBRSPrice()
  const lpTokenPrices = useAllLPTokenPrices()

  // Farming operation hooks (share instances for both execution + success tracking)
  const {
    deposit,
    isPending: isDepositing,
    isSuccess: depositSuccess,
  } = useDeposit()
  const {
    withdraw,
    isPending: isWithdrawing,
    isSuccess: withdrawSuccess,
  } = useWithdraw()
  const {
    claim,
    isPending: isClaiming,
    isSuccess: claimSuccess,
  } = useClaim()

  // Pool metadata for token addresses (needed for balance/allowance checks)
  const poolMeta = [
    {
      id: 0,
      name: 'BRS/BTD',
      type: 'LP',
      token0: 'BRS',
      token1: 'BTD',
      tokenAddress: CONTRACTS.BRSBTDPair,
    },
    {
      id: 1,
      name: 'BTD/USDC',
      type: 'LP',
      token0: 'BTD',
      token1: 'USDC',
      tokenAddress: CONTRACTS.BTDUSDCPair,
    },
    {
      id: 2,
      name: 'BTB/BTD',
      type: 'LP',
      token0: 'BTB',
      token1: 'BTD',
      tokenAddress: CONTRACTS.BTBBTDPair,
    },
    {
      id: 3,
      name: 'USDC',
      type: 'Single',
      token0: 'USDC',
      token1: null,
      tokenAddress: CONTRACTS.USDC,
    },
    {
      id: 4,
      name: 'USDT',
      type: 'Single',
      token0: 'USDT',
      token1: null,
      tokenAddress: CONTRACTS.USDT,
    },
    {
      id: 5,
      name: 'WBTC',
      type: 'Single',
      token0: 'WBTC',
      token1: null,
      tokenAddress: CONTRACTS.WBTC,
    },
    {
      id: 6,
      name: 'WETH',
      type: 'Single',
      token0: 'WETH',
      token1: null,
      tokenAddress: CONTRACTS.WETH,
    },
    {
      id: 7,
      name: 'stBTD',
      type: 'Single',
      token0: 'stBTD',
      token1: null,
      tokenAddress: CONTRACTS.stBTD,
    },
    {
      id: 8,
      name: 'stBTB',
      type: 'Single',
      token0: 'stBTB',
      token1: null,
      tokenAddress: CONTRACTS.stBTB,
    },
    {
      id: 9,
      name: 'BRS',
      type: 'Single',
      token0: 'BRS',
      token1: null,
      tokenAddress: CONTRACTS.BRS,
    },
  ]

  const allowances = poolMeta.map(meta =>
    useTokenAllowance(meta.tokenAddress, CONTRACTS.FarmingPool)
  )

  const tokenBalances = poolMeta.map(meta =>
    useReadContract({
      address: meta.tokenAddress,
      abi: ERC20ABI,
      functionName: 'balanceOf',
      args: address ? [address] : undefined,
      query: { enabled: !!address },
    })
  )

  const refreshTokenBalances = useCallback(() => {
    tokenBalances.forEach(balanceHook => {
      balanceHook?.refetch?.()
    })
  }, [tokenBalances])

  // Auto-refresh on successful operations
  useEffect(() => {
    if (depositSuccess) {
      refetchAll()
      refreshTokenBalances()
    }
  }, [depositSuccess, refetchAll, refreshTokenBalances])

  useEffect(() => {
    if (withdrawSuccess) {
      refetchAll()
      refreshTokenBalances()
    }
  }, [withdrawSuccess, refetchAll, refreshTokenBalances])

  useEffect(() => {
    if (claimSuccess) {
      refetchAll()
    }
  }, [claimSuccess, refetchAll])

  // Unified approve+execute hook
  const { approveAndExecute, isProcessing } = useApproveAndExecute()
  const [processingPoolId, setProcessingPoolId] = useState<number | null>(null)

  // Auto-stake after ETH → WETH conversion completes
  useEffect(() => {
    if (isWETHSuccess && pendingWETHStake) {
      logger.log('[FarmPage] ETH → WETH conversion successful, now staking WETH...')
      const { poolId, amount, decimals } = pendingWETHStake

      // Mark that this stake came from ETH (for withdrawal conversion back to ETH)
      if (address) {
        const storageKey = `weth_stake_type_${address}_${poolId}`
        localStorage.setItem(storageKey, 'ETH')
      }

      // Automatically trigger the staking process
      approveAndExecute({
        tokenAddress: CONTRACTS.WETH,
        spenderAddress: CONTRACTS.FarmingPool,
        amount,
        decimals,
        actionName: 'stake WETH',
        executeAction: async () => {
          await deposit(poolId, amount, decimals)
        },
      })
        .then(() => {
          setPendingWETHStake(null)
          setProcessingPoolId(null)
          setStakeAmounts(prev => ({ ...prev, [poolId]: '' }))
          allowances[poolId]?.refetch?.()
        })
        .catch(error => {
          logger.error('Auto-stake error:', error)
          setPendingWETHStake(null)
          setProcessingPoolId(null)
        })
    }
  }, [isWETHSuccess, pendingWETHStake, approveAndExecute, deposit, allowances, address])

  // Build pools array from unified farming hook data + FarmPage-specific data
  const pools = useMemo(() => {
    return farmingPools.map((pool, index) => {
      const meta = poolMeta[index]
      return {
        id: pool.id,
        name: pool.name,
        type: pool.type,
        token0: meta.token0,
        token1: meta.token1,
        tokenAddress: meta.tokenAddress,
        poolInfo: pool.poolInfo,
        apy: pool.apy.apyFormatted,
        apyDetails: pool.apy,
        tvlValue: pool.tvl,
        tvlDisplay: formatCurrency(pool.tvl),
        allocation: pool.poolInfo.allocation,
        yourStake: pool.userInfo.stakedAmount,
        yourStakeDisplay: pool.type === 'LP' && index <= 2
          ? formatLPBalance(pool.userInfo.stakedAmount)
          : formatSmallAmount(pool.userInfo.stakedAmount, getTokenDecimals(pool.name)),
        yourRewards: pool.pending.amount,
        yourRewardsDisplay: pool.pending.amount.toLocaleString(undefined, {
          maximumFractionDigits: 2, // BRS rewards always use 2 decimals
        }),
        allowance: allowances[index]?.allowance,
        balance: tokenBalances[index]?.data,
      }
    })
  }, [farmingPools, allowances, tokenBalances, poolMeta])

  const lpPoolCount = pools.filter(pool => pool.type === 'LP').length
  const singlePoolCount = pools.filter(pool => pool.type === 'Single').length

  const filteredPools = pools.filter(pool => {
    if (filterType === 'all') return true
    if (filterType === 'lp') return pool.type === 'LP'
    if (filterType === 'single') return pool.type === 'Single'
    return true
  })

  const totalTVL = pools.reduce((sum, pool) => sum + pool.tvlValue, 0)
  const totalRewards = totalPendingRewards

  // Get LP token balance for MAX button
  const handleMaxClick = (pool: (typeof pools)[number]) => {
    const balanceResult = tokenBalances[pool.id]
    const rawBalance = balanceResult?.data
    if (!rawBalance || rawBalance === 0n) return

    const decimals = pool.poolInfo.decimals ?? 18
    setStakeAmounts({
      ...stakeAmounts,
      [pool.id]: formatUnits(rawBalance as bigint, decimals),
    })
  }

  const handleAmountChange = (poolId: number, value: string) => {
    setStakeAmounts({ ...stakeAmounts, [poolId]: value })
  }

  // Calculate USD value for stake amount input
  const calculateStakeUSDValue = (pool: (typeof pools)[number]) => {
    const amount = Number(stakeAmounts[pool.id] || '0')
    if (!amount || !Number.isFinite(amount)) return 0

    // LP tokens (pools 0-2): use LP token prices
    if (pool.type === 'LP') {
      const lpPrice = lpTokenPrices[pool.id as 0 | 1 | 2]
      return lpPrice ? amount * lpPrice : 0
    }

    // Single token pools
    switch (pool.id) {
      case 3: // USDC
      case 4: // USDT
        return amount * 1.0 // Stablecoins = $1
      case 5: // WBTC
        return amount * wbtcPrice
      case 6: // WETH
        return amount * wethPrice
      case 7: // stBTD
        return amount * btdPrice
      case 8: // stBTB
        return amount * btbPrice
      case 9: // BRS
        return amount * brsPrice
      default:
        return 0
    }
  }

  // Check if amount is empty or zero
  const isAmountEmpty = (pool: (typeof pools)[number]) => {
    const amount = stakeAmounts[pool.id]
    return !amount || amount === '0' || parseFloat(amount) <= 0
  }

  // Check if user has insufficient balance for deposit (amount > balance)
  const canAutoConvert = useCallback((pool: (typeof pools)[number], desiredAmount: number, currentWrappedBalance: number) => {
    if (desiredAmount <= 0) return false

    if (pool.id === 6 && pool.name === 'WETH') {
      const ethBalance = ethBalanceRaw ? Number(formatUnits(ethBalanceRaw, 18)) : 0
      const shortage = desiredAmount - currentWrappedBalance
      return shortage > 0 && ethBalance >= shortage
    }

    if (pool.id === 7 && pool.name === 'stBTD') {
      const btdBalance = btdBalanceRaw ? Number(formatUnits(btdBalanceRaw, 18)) : 0
      const shortage = desiredAmount - currentWrappedBalance
      const inverseRate = btdStakeRate.inverseRate || 0
      if (shortage <= 0 || inverseRate <= 0) return false
      const requiredBTD = shortage / inverseRate
      return btdBalance >= requiredBTD
    }

    if (pool.id === 8 && pool.name === 'stBTB') {
      const btbBalance = btbBalanceRaw ? Number(formatUnits(btbBalanceRaw, 18)) : 0
      const shortage = desiredAmount - currentWrappedBalance
      const inverseRate = btbStakeRate.inverseRate || 0
      if (shortage <= 0 || inverseRate <= 0) return false
      const requiredBTB = shortage / inverseRate
      return btbBalance >= requiredBTB
    }

    return false
  }, [ethBalanceRaw, btdBalanceRaw, btbBalanceRaw, btdStakeRate.inverseRate, btbStakeRate.inverseRate])

  const hasInsufficientBalance = (pool: (typeof pools)[number]) => {
    const amount = stakeAmounts[pool.id]
    if (!amount || amount === '0' || parseFloat(amount) <= 0) return false
    const balanceResult = tokenBalances[pool.id]
    const rawBalance = balanceResult?.data
    const decimals = pool.poolInfo.decimals ?? 18

    let currentWrappedBalance = 0
    if (rawBalance) {
      try {
        currentWrappedBalance = Number(formatUnits(rawBalance as bigint, decimals))
      } catch {
        currentWrappedBalance = 0
      }
    }

    const desiredAmountNumber = parseFloat(amount)

    // If user has enough wrapped tokens already
    if (rawBalance) {
      try {
        const amountWei = parseUnits(amount, decimals)
        if (amountWei <= (rawBalance as bigint)) {
          return false
        }
      } catch {
        return false
      }
    }

    // Check if auto-convert can cover the shortage
    if (canAutoConvert(pool, desiredAmountNumber, currentWrappedBalance)) {
      return false
    }

    return true
  }

  // Check if user has insufficient stake for withdrawal (amount > staked)
  const hasInsufficientStake = (pool: (typeof pools)[number]) => {
    const amount = stakeAmounts[pool.id]
    if (!amount || amount === '0' || parseFloat(amount) <= 0) return false
    try {
      const amountNumber = Number(amount)
      return amountNumber > pool.yourStake
    } catch {
      return false
    }
  }

  const handleStake = async (pool: (typeof pools)[number]) => {
    if (!isConnected) {
      openConnectModal?.()
      return
    }

    const amount = stakeAmounts[pool.id] || '0'
    if (amount === '0' || !amount || parseFloat(amount) <= 0) {
      return
    }

    try {
      setProcessingPoolId(pool.id)
      const decimals = pool.poolInfo.decimals ?? 18

      // Check if user needs to convert tokens before staking
      const wrappedTokenBalance = tokenBalances[pool.id]?.data as bigint | undefined
      const wrappedBalanceFormatted = wrappedTokenBalance
        ? Number(formatUnits(wrappedTokenBalance, decimals))
        : 0

      const desiredAmountNumber = parseFloat(amount)

      // Pool #6 (WETH): handle ETH auto-convert when WETH is insufficient
      if (pool.id === 6 && pool.name === 'WETH' && desiredAmountNumber > 0) {
        const ethBalance = ethBalanceRaw ? Number(formatUnits(ethBalanceRaw, 18)) : 0
        const shortage = Math.max(desiredAmountNumber - wrappedBalanceFormatted, 0)

        logger.log(
          `[FarmPage] Pool #6: desired=${desiredAmountNumber}, WETH balance=${wrappedBalanceFormatted}, ETH balance=${ethBalance}`
        )

        if (shortage > 0 && ethBalance > 0) {
          const suggestedEthAmount = Math.min(shortage, ethBalance)
          setConvertModalData({
            convertType: 'eth-to-weth',
            poolId: 6,
            tokenSymbol: 'ETH',
            targetTokenSymbol: 'WETH',
            presetAmount: suggestedEthAmount.toString(),
            desiredTargetAmount: desiredAmountNumber,
            currentTargetBalance: wrappedBalanceFormatted,
            shortageTargetAmount: shortage,
          })
          setConvertModalOpen(true)
          setProcessingPoolId(null)
          return
        }
      }

      // Pool #7 (stBTD): handle BTD auto-convert
      if (pool.id === 7 && pool.name === 'stBTD' && desiredAmountNumber > 0) {
        const btdBalance = btdBalanceRaw ? Number(formatUnits(btdBalanceRaw, 18)) : 0
        const shortage = Math.max(desiredAmountNumber - wrappedBalanceFormatted, 0)

        logger.log(
          `[FarmPage] Pool #7: desired=${desiredAmountNumber}, stBTD balance=${wrappedBalanceFormatted}, BTD balance=${btdBalance}`
        )

        if (shortage > 0 && btdBalance > 0) {
          const inverseRate = btdStakeRate.inverseRate || 0
          const calculatedBTD = inverseRate > 0 ? shortage / inverseRate : shortage
          const suggestedBTD = Math.min(calculatedBTD, btdBalance)
          setConvertModalData({
            convertType: 'btd-to-stbtd',
            poolId: 7,
            tokenSymbol: 'BTD',
            targetTokenSymbol: 'stBTD',
            presetAmount: suggestedBTD.toString(),
            desiredTargetAmount: desiredAmountNumber,
            currentTargetBalance: wrappedBalanceFormatted,
            shortageTargetAmount: shortage,
          })
          setConvertModalOpen(true)
          setProcessingPoolId(null)
          return
        }
      }

      // Pool #8 (stBTB): handle BTB auto-convert
      if (pool.id === 8 && pool.name === 'stBTB' && desiredAmountNumber > 0) {
        const btbBalance = btbBalanceRaw ? Number(formatUnits(btbBalanceRaw, 18)) : 0
        const shortage = Math.max(desiredAmountNumber - wrappedBalanceFormatted, 0)

        logger.log(
          `[FarmPage] Pool #8: desired=${desiredAmountNumber}, stBTB balance=${wrappedBalanceFormatted}, BTB balance=${btbBalance}`
        )

        if (shortage > 0 && btbBalance > 0) {
          const inverseRate = btbStakeRate.inverseRate || 0
          const calculatedBTB = inverseRate > 0 ? shortage / inverseRate : shortage
          const suggestedBTB = Math.min(calculatedBTB, btbBalance)
          setConvertModalData({
            convertType: 'btb-to-stbtb',
            poolId: 8,
            tokenSymbol: 'BTB',
            targetTokenSymbol: 'stBTB',
            presetAmount: suggestedBTB.toString(),
            desiredTargetAmount: desiredAmountNumber,
            currentTargetBalance: wrappedBalanceFormatted,
            shortageTargetAmount: shortage,
          })
          setConvertModalOpen(true)
          setProcessingPoolId(null)
          return
        }
      }

      // Standard token staking flow (includes WETH when balance is sufficient)
      await approveAndExecute({
        tokenAddress: pool.tokenAddress as `0x${string}`,
        spenderAddress: CONTRACTS.FarmingPool,
        amount,
        decimals,
        actionName: `stake ${pool.name}`,
        executeAction: async () => {
          await deposit(pool.id, amount, decimals)
        },
      })

      setStakeAmounts({ ...stakeAmounts, [pool.id]: '' })
      allowances[pool.id]?.refetch?.()
    } catch (error) {
      logger.error('Stake error:', error)
    } finally {
      setProcessingPoolId(null)
    }
  }

  const handleUnstake = async (pool: (typeof pools)[number]) => {
    if (!isConnected || !address) {
      openConnectModal?.()
      return
    }

    const amount = stakeAmounts[pool.id] || '0'
    if (amount === '0' || !amount || parseFloat(amount) <= 0) {
      return
    }

    try {
      // For Pool #6 (WETH), #7 (stBTD), and #8 (stBTB), show withdraw conversion modal
      if (pool.id === 6 && pool.name === 'WETH') {
        logger.log('[FarmPage] Showing WETH withdraw conversion modal')
        setWithdrawModalData({
          withdrawType: 'weth',
          poolId: 6,
          stakedAmount: pool.yourStake,
          withdrawAmount: amount,
          tokenSymbol: 'WETH',
          baseTokenSymbol: 'ETH',
        })
        setWithdrawModalOpen(true)
        return
      }

      if (pool.id === 7 && pool.name === 'stBTD') {
        logger.log('[FarmPage] Showing stBTD withdraw conversion modal')
        setWithdrawModalData({
          withdrawType: 'stbtd',
          poolId: 7,
          stakedAmount: pool.yourStake,
          withdrawAmount: amount,
          tokenSymbol: 'stBTD',
          baseTokenSymbol: 'BTD',
        })
        setWithdrawModalOpen(true)
        return
      }

      if (pool.id === 8 && pool.name === 'stBTB') {
        logger.log('[FarmPage] Showing stBTB withdraw conversion modal')
        setWithdrawModalData({
          withdrawType: 'stbtb',
          poolId: 8,
          stakedAmount: pool.yourStake,
          withdrawAmount: amount,
          tokenSymbol: 'stBTB',
          baseTokenSymbol: 'BTB',
        })
        setWithdrawModalOpen(true)
        return
      }

      // For other pools, normal withdrawal
      await withdraw(pool.id, amount, pool.poolInfo.decimals ?? 18)
      setStakeAmounts({ ...stakeAmounts, [pool.id]: '' })
    } catch (error) {
      logger.error('Unstake error:', error)
    }
  }

  const handleClaimRewards = async (pool: (typeof pools)[number]) => {
    if (!isConnected) {
      openConnectModal?.()
      return
    }

    try {
      await claim(pool.id)
    } catch (error) {
      logger.error('Claim error:', error)
    }
  }

  const handleClaimAll = async () => {
    if (!isConnected) {
      openConnectModal?.()
      return
    }

    try {
      // Claim from all pools with pending rewards
      for (const pool of pools) {
        if (pool.yourRewards > 0) {
          await claim(pool.id)
        }
      }
    } catch (error) {
      logger.error('Claim all error:', error)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
          Liquidity Farming
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Stake LP tokens or single tokens to earn BRS rewards
        </p>
      </div>

      {/* BRS Mining Progress */}
      <div className="card bg-gradient-to-r from-green-50/50 to-green-100/50 dark:from-green-900/10 dark:to-green-800/10 border-green-200 dark:border-green-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              BRS Mining Progress
            </h3>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                {minedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                / {maxSupply.toLocaleString(undefined, { maximumFractionDigits: 2 })} BRS
              </span>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Progress</div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {formatSmartPercentage(miningProgress)}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="relative w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-400 to-green-600 dark:from-green-500 dark:to-green-700 transition-all duration-500 ease-out rounded-full"
            style={{ width: `${Math.min(miningProgress, 100)}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
          </div>
        </div>

        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
          {maxSupply > minedAmount ? (
            <>
              {(maxSupply - minedAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })} BRS remaining to mine
            </>
          ) : (
            <>All BRS mined</>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <div className="text-xs text-green-800 dark:text-green-200 mb-1">Total Value Locked</div>
          <div className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(totalTVL)}
          </div>
        </div>
        <div className="card">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Active Pools</div>
          <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">10</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">3 LP + 7 Single</div>
        </div>
        <div className="card">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Your Total Rewards</div>
          <div className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-400">
            {totalRewards.toLocaleString(undefined, { maximumFractionDigits: 2 })} BRS
          </div>
          <button
            onClick={handleClaimAll}
            disabled={totalRewards <= 0 || isClaiming}
            className="text-xs text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 font-medium mt-1 disabled:opacity-50"
          >
            {isClaiming ? 'Claiming...' : 'Claim All'}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="card">
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setFilterType('all')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors text-sm ${
              filterType === 'all'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Pools ({pools.length})
          </button>
          <button
            onClick={() => setFilterType('lp')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors text-sm ${
              filterType === 'lp'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            LP Pools ({lpPoolCount})
          </button>
          <button
            onClick={() => setFilterType('single')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors text-sm ${
              filterType === 'single'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Single ({singlePoolCount})
          </button>
        </div>
      </div>

      {/* Pools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredPools.map(pool => (
          <div key={pool.id} className="card hover:shadow-lg transition-shadow">
            {/* Pool Header */}
            <div className="flex items-center gap-3 mb-4">
              {pool.token1 ? (
                <DualTokenIcon token0={pool.token0} token1={pool.token1} />
              ) : (
                <TokenIcon token={pool.token0} />
              )}
              <div className="flex-1">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{pool.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      pool.type === 'LP'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                        : 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                    }`}
                  >
                    {pool.type}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {pool.allocation}
                  </span>
                </div>
              </div>
            </div>

            {/* Pool Stats */}
            <div className="space-y-3 mb-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">APY</div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">{pool.apy}</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">TVL</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {pool.tvlDisplay}
                  </div>
                </div>
              </div>

              {/* 24h Withdraw Limit Info - Per Pool - disabled */}
              {/* <PoolLimitDisplay poolId={pool.id} /> */}
            </div>

            {/* Your Position - Only show when wallet is connected */}
            {isConnected && (
              <div className="bg-primary-50/30 dark:bg-primary-900/10 rounded-lg p-3 mb-4">
                <div className="text-xs font-semibold text-gray-900 dark:text-white mb-2">
                  Your Position
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Balance:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {/* Show wrapped token name for special pools */}
                      {pool.id === 6 && 'WETH: '}
                      {pool.id === 7 && 'stBTD: '}
                      {pool.id === 8 && 'stBTB: '}
                      {pool.balance
                        ? pool.type === 'LP' && pool.id <= 2
                          ? formatLPBalance(Number(formatUnits(pool.balance as bigint, pool.poolInfo.decimals ?? 18)))
                          : formatSmallAmount(
                              Number(formatUnits(pool.balance as bigint, pool.poolInfo.decimals ?? 18)),
                              getTokenDecimals(pool.name)
                            )
                        : '0'}
                      {/* Show base token balance for WETH/stBTD/stBTB pools */}
                      {pool.id === 6 && ethBalanceRaw && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                          (ETH: {Number(formatUnits(ethBalanceRaw, 18)).toLocaleString(undefined, { maximumFractionDigits: 6 })})
                        </span>
                      )}
                      {pool.id === 7 && btdBalanceRaw && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                          (BTD: {Number(formatUnits(btdBalanceRaw, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 })})
                        </span>
                      )}
                      {pool.id === 8 && btbBalanceRaw && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                          (BTB: {Number(formatUnits(btbBalanceRaw, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 })})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Staked:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {pool.yourStakeDisplay}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Rewards:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {pool.yourRewardsDisplay} BRS
                    </span>
                  </div>
                </div>
              </div>
            )}


            {/* Connect Wallet Prompt or Action Section */}
            {!isConnected ? (
              <button
                onClick={openConnectModal}
                className="w-full btn-primary text-sm py-3"
              >
                Connect Wallet
              </button>
            ) : (
              <>
                {/* Amount Input */}
                <div className="mb-3">
                  <div className="relative bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 min-h-[60px]">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0.0"
                      value={stakeAmounts[pool.id] || ''}
                      onKeyDown={blockInvalidNumberInput}
                      onChange={e => {
                        const value = e.target.value
                        if (!value || Number(value) >= 0) handleAmountChange(pool.id, value)
                      }}
                      className="w-full bg-transparent border-0 outline-none text-sm text-gray-900 dark:text-white pr-16"
                    />
                    <button
                      onClick={() => handleMaxClick(pool)}
                      className="absolute right-2 top-2 text-xs text-primary-600 dark:text-primary-400 font-medium hover:text-primary-700 dark:hover:text-primary-300"
                    >
                      MAX
                    </button>
                    {/* USD value display (shown for all pools, inside the input box) */}
                    {stakeAmounts[pool.id] && Number(stakeAmounts[pool.id]) > 0 && (() => {
                      const usdValue = calculateStakeUSDValue(pool)
                      return usdValue > 0 ? (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          ≈ ${usdValue.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </div>
                      ) : null
                    })()}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleStake(pool)}
                    disabled={
                      isAmountEmpty(pool) ||
                      hasInsufficientBalance(pool) ||
                      (processingPoolId === pool.id && isProcessing) ||
                      isDepositing
                    }
                    className="btn-primary text-xs py-2 disabled:opacity-50"
                  >
                    {hasInsufficientBalance(pool)
                      ? 'Low Balance'
                      : processingPoolId === pool.id && isProcessing
                        ? 'Processing...'
                        : isDepositing
                          ? 'Depositing'
                          : 'Deposit'}
                  </button>
                  <button
                    onClick={() => handleUnstake(pool)}
                    disabled={isWithdrawing || isAmountEmpty(pool) || hasInsufficientStake(pool)}
                    className="btn-secondary text-xs py-2 disabled:opacity-50"
                  >
                    {hasInsufficientStake(pool)
                      ? 'Low Balance'
                      : isWithdrawing
                        ? 'Withdrawing'
                        : 'Withdraw'}
                  </button>
                  <button
                    onClick={() => handleClaimRewards(pool)}
                    disabled={isClaiming || pool.yourRewards <= 0}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isClaiming ? 'Claiming' : 'Claim'}
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Info Banner */}
      <div className="card bg-primary-50 border-primary-200">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-600" />
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-primary-900 mb-1">21 Billion BRS Total Supply</h3>
            <p className="text-sm text-primary-700">
              BRS emissions follow a 4-year halving schedule. 60% goes to Yield Farmers,
              20% to Treasury, 10% to Foundation, 10% to Team.
            </p>
          </div>
        </div>
      </div>

      {/* Convert and Stake Modal */}
      {convertModalData && (
        <ConvertAndStakeModal
          isOpen={convertModalOpen}
          onClose={() => {
            setConvertModalOpen(false)
            setConvertModalData(null)
            refetchAll()
          }}
          convertType={convertModalData.convertType}
          poolId={convertModalData.poolId}
          availableBalance={
            convertModalData.convertType === 'eth-to-weth'
              ? ethBalanceRaw
                ? Number(formatUnits(ethBalanceRaw, 18))
                : 0
              : convertModalData.convertType === 'btd-to-stbtd'
                ? btdBalanceRaw
                  ? Number(formatUnits(btdBalanceRaw, 18))
                  : 0
                : btbBalanceRaw
                  ? Number(formatUnits(btbBalanceRaw, 18))
                  : 0
          }
          tokenSymbol={convertModalData.tokenSymbol}
          targetTokenSymbol={convertModalData.targetTokenSymbol}
          presetAmount={convertModalData.presetAmount}
          desiredTargetAmount={convertModalData.desiredTargetAmount}
          currentTargetBalance={convertModalData.currentTargetBalance}
          shortageTargetAmount={convertModalData.shortageTargetAmount}
        />
      )}

      {/* Withdraw and Convert Modal */}
      {withdrawModalData && (
        <WithdrawConvertModal
          isOpen={withdrawModalOpen}
          onClose={() => {
            setWithdrawModalOpen(false)
            setWithdrawModalData(null)
            refetchAll()
          }}
          withdrawType={withdrawModalData.withdrawType}
          poolId={withdrawModalData.poolId}
          stakedAmount={withdrawModalData.stakedAmount}
          withdrawAmount={withdrawModalData.withdrawAmount}
          tokenSymbol={withdrawModalData.tokenSymbol}
          baseTokenSymbol={withdrawModalData.baseTokenSymbol}
        />
      )}
    </div>
  )
}

export default FarmPage
