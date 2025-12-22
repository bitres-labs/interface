'use client'
import { logger } from '@/utils/logger'

import { useMemo, useState } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { useNavigate } from 'react-router-dom'
import { useStBTDBalance, useStBTBBalance } from '@/hooks/useBalances'
import { useUnstakeBTD, useUnstakeBTB } from '@/hooks/useStaking'
import { useWithdraw, useClaim } from '@/hooks/useFarming'
import { useApproveAndExecute } from '@/hooks/useApproveAndExecute'
import { UniswapV2Pair_ABI } from '@/abis'
import { useBTDAPR, useBTBAPR } from '@/hooks/useSystemStats'
import { useTokenPrices } from '@/hooks/useAPY'
import { useBTDStakeRate, useBTBStakeRate } from '@/hooks/useStakingRate'
import { Wallet, AlertCircle } from 'lucide-react'
import { usePortfolio } from '@/hooks/usePortfolio'
import { useLiquidityPools } from '@/hooks/useLiquidityPools'
import { useFarmingPositions } from '@/hooks/useFarmingPositions'
import { formatUSD, formatTokenAmount, formatCompact, getTokenDecimals, formatLPAmount } from '@/utils/format'
import { toNumber } from '@/utils/numbers'

// Sub-component for Staking Position
function StakingPositionCard({ position }: { position: any }) {
  const navigate = useNavigate()
  const [isUnstaking, setIsUnstaking] = useState(false)
  const { unstakeBTD } = useUnstakeBTD()
  const { unstakeBTB } = useUnstakeBTB()

  const handleUnstake = async () => {
    if (position.balance === 0) return
    setIsUnstaking(true)
    try {
      if (position.token === 'stBTD') {
        await unstakeBTD(position.balance.toString())
      } else {
        await unstakeBTB(position.balance.toString())
      }
    } catch (error) {
      logger.error('Unstake failed:', error)
    }
    setIsUnstaking(false)
  }

  const handleStake = () => {
    navigate('/stake')
  }

  return (
    <div className="p-4 bg-primary-50/30 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-900/30 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-lg text-gray-900 dark:text-white">{position.token}</h3>
        <div className="flex gap-2">
          <button
            onClick={handleStake}
            className="px-3 py-1 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            Stake
          </button>
          <button
            onClick={handleUnstake}
            disabled={isUnstaking || position.balance === 0}
            className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-gray-900 dark:text-white rounded-lg transition-colors"
          >
            {isUnstaking ? 'Unstaking...' : 'Unstake'}
          </button>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Balance:</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {position.balance.toLocaleString(undefined, { maximumFractionDigits: getTokenDecimals(position.token) })}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">APR:</span>
          <span className="font-semibold text-green-600 dark:text-green-400">
            {position.apr.toFixed(2)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Exchange Rate:</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            1 = {position.exchangeRate.toFixed(6)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-400">Underlying:</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {position.underlyingAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
            {position.token === 'stBTD' ? 'BTD' : 'BTB'}
          </span>
        </div>
      </div>
    </div>
  )
}

// Sub-component for Liquidity Position
function LiquidityPositionCard({
  pool,
  lpBalance,
  reserves,
  prices,
}: {
  pool: any
  lpBalance: string
  reserves: any
  prices: any
}) {
  const navigate = useNavigate()
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const { approveAndExecute } = useApproveAndExecute()
  const [isRemoving, setIsRemoving] = useState(false)

  const handleAddLiquidity = () => {
    navigate('/pool')
  }

  const handleRemoveLiquidity = async () => {
    if (!address || !walletClient || !publicClient || userLPBalance === 0) {
      alert('Cannot remove liquidity')
      return
    }

    setIsRemoving(true)
    try {
      await approveAndExecute({
        tokenAddress: pool.address as `0x${string}`,
        spenderAddress: pool.address as `0x${string}`,
        amount: lpBalance,
        decimals: 18,
        actionName: `remove liquidity from ${pool.name}`,
        executeAction: async () => {
          const hash = await walletClient.writeContract({
            account: address,
            address: pool.address as `0x${string}`,
            abi: UniswapV2Pair_ABI,
            functionName: 'burn',
            args: [address],
          })
          await publicClient.waitForTransactionReceipt({ hash })
        },
      })
      alert('✅ Successfully removed liquidity!')
    } catch (error) {
      logger.error('Remove liquidity error:', error)
      alert(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsRemoving(false)
    }
  }

  const token0Value =
    Number(reserves.reserve0Formatted) *
    (pool.token0.symbol === 'WBTC'
      ? prices.WBTC
      : pool.token0.symbol === 'BRS'
        ? prices.BRS
        : pool.token0.symbol === 'BTD'
          ? prices.BTD
          : pool.token0.symbol === 'BTB'
            ? prices.BTB
            : 1.0)
  const token1Value =
    Number(reserves.reserve1Formatted) *
    (pool.token1.symbol === 'USDC'
      ? 1.0
      : pool.token1.symbol === 'BTD'
        ? prices.BTD
        : pool.token1.symbol === 'BRS'
          ? prices.BRS
          : pool.token1.symbol === 'BTB'
            ? prices.BTB
            : 1.0)
  const totalPoolValue = token0Value + token1Value
  const lpTotalSupply = Number(reserves.totalSupply || '1')
  const userLPBalance = Number(lpBalance)
  const userShare = lpTotalSupply > 0 ? (userLPBalance / lpTotalSupply) * 100 : 0
  const userValue = (totalPoolValue * userLPBalance) / lpTotalSupply

  return (
    <div className="p-4 bg-primary-50/30 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-900/30 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">{pool.name} LP</h3>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {pool.token0.symbol}/{pool.token1.symbol}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-600 dark:text-gray-400">Your Share</div>
          <div className="text-lg font-bold text-green-600 dark:text-green-400">
            {userShare.toFixed(4)}%
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
        <div>
          <div className="text-gray-600 dark:text-gray-400 mb-1">LP Tokens</div>
          <div className="font-semibold text-gray-900 dark:text-white">
            {formatLPAmount(userLPBalance)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-gray-600 dark:text-gray-400 mb-1">Value</div>
          <div className="font-semibold text-gray-900 dark:text-white">
            $
            {userValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 border-t border-primary-100 dark:border-primary-900/30 pt-2 mb-3">
        Pool: {Number(reserves.reserve0Formatted).toLocaleString(undefined, { maximumFractionDigits: getTokenDecimals(pool.token0.symbol) })} {pool.token0.symbol} +{' '}
        {Number(reserves.reserve1Formatted).toLocaleString(undefined, { maximumFractionDigits: getTokenDecimals(pool.token1.symbol) })} {pool.token1.symbol}
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleAddLiquidity}
          className="flex-1 px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          Add Liquidity
        </button>
        <button
          onClick={handleRemoveLiquidity}
          disabled={isRemoving || userLPBalance === 0}
          className="flex-1 px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-gray-900 dark:text-white rounded-lg transition-colors"
        >
          {isRemoving ? 'Removing...' : 'Remove'}
        </button>
      </div>
    </div>
  )
}

// Sub-component for Farming Position
function FarmingPositionCard({ pool }: { pool: any }) {
  const navigate = useNavigate()
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [isClaiming, setIsClaiming] = useState(false)
  const { withdraw } = useWithdraw()
  const { claim } = useClaim()

  const handleDeposit = () => {
    navigate('/farm')
  }

  const stakedAmount = pool.userInfo.stakedAmount
  const pendingReward = pool.pending.amount

  const handleWithdraw = async () => {
    if (stakedAmount === 0) return
    setIsWithdrawing(true)
    try {
      await withdraw(pool.id, stakedAmount.toString(), pool.poolInfo.decimals)
    } catch (error) {
      logger.error('Withdraw failed:', error)
    }
    setIsWithdrawing(false)
  }

  const handleClaim = async () => {
    if (pendingReward === 0) return
    setIsClaiming(true)
    try {
      await claim(pool.id)
    } catch (error) {
      logger.error('Claim failed:', error)
    }
    setIsClaiming(false)
  }

  return (
    <div className="p-4 bg-primary-50/30 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-900/30 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">{pool.name}</h3>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              pool.type === 'LP'
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                : 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
            }`}
          >
            {pool.type}
          </span>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-600 dark:text-gray-400">APY</div>
          <div className="text-lg font-bold text-green-600 dark:text-green-400">
            {pool.apy.apyFormatted}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
        <div>
          <div className="text-gray-600 dark:text-gray-400 mb-1">Staked</div>
          <div className="font-semibold text-gray-900 dark:text-white">
            {stakedAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
          </div>
        </div>
        <div className="text-right">
          <div className="text-gray-600 dark:text-gray-400 mb-1">Pending BRS</div>
          <div className="font-semibold text-brs-DEFAULT">
            {pendingReward.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleDeposit}
          className="flex-1 px-3 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          Deposit
        </button>
        <button
          onClick={handleWithdraw}
          disabled={isWithdrawing || stakedAmount === 0}
          className="flex-1 px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-gray-900 dark:text-white rounded-lg transition-colors"
        >
          {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
        </button>
        <button
          onClick={handleClaim}
          disabled={isClaiming || pendingReward === 0}
          className="flex-1 px-3 py-2 text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          {isClaiming ? 'Claiming...' : 'Claim'}
        </button>
      </div>
    </div>
  )
}

function AssetPage() {
  const { isConnected } = useAccount()

  // Use shared portfolio calculation hook
  const portfolio = usePortfolio()

  // Use unified liquidity pools hook
  const { poolsWithBalance, totalLiquidityValue } = useLiquidityPools()

  // Use unified farming positions hook
  const { poolsWithStake, totalPendingRewards, totalPendingValue } = useFarmingPositions()

  // Staking balances
  const { balance: stBTDBalance } = useStBTDBalance()
  const { balance: stBTBBalance } = useStBTBBalance()

  // Staking rates and APR
  const btdStakeRate = useBTDStakeRate()
  const btbStakeRate = useBTBStakeRate()
  const { btdAPR } = useBTDAPR()
  const { btbAPR } = useBTBAPR()

  // Token prices (for display in cards)
  const prices = useTokenPrices()

  const staking = useMemo(() => {
    const stBTDAmount = toNumber(stBTDBalance)
    const stBTBAmount = toNumber(stBTBBalance)

    // Convert stToken to underlying token amount
    const btdAmount = stBTDAmount * btdStakeRate.exchangeRate
    const btbAmount = stBTBAmount * btbStakeRate.exchangeRate

    return [
      {
        token: 'stBTD',
        balance: stBTDAmount,
        underlyingAmount: btdAmount,
        exchangeRate: btdStakeRate.exchangeRate,
        apr: btdAPR,
      },
      {
        token: 'stBTB',
        balance: stBTBAmount,
        underlyingAmount: btbAmount,
        exchangeRate: btbStakeRate.exchangeRate,
        apr: btbAPR,
      },
    ]
  }, [stBTDBalance, stBTBBalance, btdStakeRate, btbStakeRate, btdAPR, btbAPR])

  if (!isConnected) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="card bg-yellow-50 border border-yellow-200 text-yellow-900 flex gap-3 items-start">
          <AlertCircle className="w-5 h-5 mt-0.5" />
          <div>
            <h2 className="font-semibold mb-1">Wallet not connected</h2>
            <p className="text-sm">
              Connect your wallet to view real-time balances, staking positions, and yield rewards.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="card bg-primary-600 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="w-5 h-5" />
          <span className="text-primary-100">Total Portfolio Value</span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-4xl font-bold mb-4">${formatUSD(portfolio.totalValue)}</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-10 text-sm">
              <div>
                <div className="text-primary-200">Wallet</div>
                <div className="font-semibold">${formatCompact(portfolio.walletBalance)}</div>
              </div>
              <div>
                <div className="text-primary-200">Staked</div>
                <div className="font-semibold">${formatCompact(portfolio.staked)}</div>
              </div>
              <div>
                <div className="text-primary-200">Farming</div>
                <div className="font-semibold">${formatCompact(portfolio.farming)}</div>
              </div>
              <div>
                <div className="text-primary-200">Rewards</div>
                <div className="font-semibold">${formatCompact(portfolio.rewards)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Wallet</h2>
          <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
            ${formatCompact(portfolio.walletBalance)}
          </div>
        </div>
        <div className="space-y-3">
          {portfolio.tokens
            .filter(token => {
              // BTD, BTB, BRS, WETH, ETH always show, even if balance is 0
              const alwaysShow = ['BTD', 'BTB', 'BRS', 'WETH', 'ETH'].includes(token.symbol)
              // Other tokens only show if balance > 0
              const hasBalance = token.amount > 0
              return alwaysShow || hasBalance
            })
            .map(token => (
              <div
                key={token.symbol}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg"
              >
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">{token.symbol}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {formatTokenAmount(token.amount, token.symbol)}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    ${formatUSD(token.value)}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Staking Positions</h2>
          <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
            ${formatCompact(portfolio.staked)}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {staking
            .filter(position => position.balance > 0)
            .map(position => (
              <StakingPositionCard key={position.token} position={position} />
            ))}
        </div>
        {staking.every(p => p.balance === 0) && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No active staking positions
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Liquidity Positions</h2>
          <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
            ${formatCompact(totalLiquidityValue)}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {poolsWithBalance.map(poolData => (
            <LiquidityPositionCard
              key={poolData.pool.address}
              pool={poolData.pool}
              lpBalance={poolData.lpBalanceFormatted}
              reserves={poolData.reserves}
              prices={prices}
            />
          ))}
        </div>
        {poolsWithBalance.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No liquidity positions
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Farming Positions</h2>
          <div className="text-right">
            <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
              ${formatCompact(Number(portfolio.farming) + Number(totalPendingValue))}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Rewards: {totalPendingRewards.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
              BRS (${formatCompact(totalPendingValue)})
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {poolsWithStake.map(pool => (
            <FarmingPositionCard key={pool.id} pool={pool} />
          ))}
          {poolsWithStake.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No active farming positions
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AssetPage
