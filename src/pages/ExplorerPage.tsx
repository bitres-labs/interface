'use client'

import { useState } from 'react'
import {
  Database,
  TrendingUp,
  DollarSign,
  Coins,
  BarChart3,
  Info,
  Copy,
  Check,
  Percent,
  TrendingDown,
  Package,
  Vault,
  Pickaxe,
} from 'lucide-react'
import { CONTRACTS, TOKEN_DECIMALS, NETWORK_CONFIG } from '@/config/contracts'
import {
  useSystemMetrics,
  useBTCPrice,
  useBTDPrice,
  useBTBPrice,
  useBRSPrice,
  useIUSDPrice,
  useTotalSupply,
  useTreasuryBalances,
  useWBTCPrice,
  useBTBMinPrice,
  useBRSMaxSupply,
} from '@/hooks/useSystemStats'
import { useBRSDistribution } from '@/hooks/useBRSDistribution'
import { formatSmartPercentage } from '@/utils/format'

function ExplorerPage() {
  const [copied, setCopied] = useState('')

  // Fetch comprehensive system data
  const systemMetrics = useSystemMetrics()
  const { btcPrice } = useBTCPrice()
  const { btdPrice } = useBTDPrice()
  const { btbPrice } = useBTBPrice()
  const { brsPrice } = useBRSPrice()
  const { iusdPrice } = useIUSDPrice()
  const { wbtcPrice } = useWBTCPrice()
  const { btbMinPrice } = useBTBMinPrice()

  // Token supplies
  const { totalSupplyNum: wbtcSupply } = useTotalSupply(CONTRACTS.WBTC, TOKEN_DECIMALS.WBTC)
  const { totalSupplyNum: btdSupply } = useTotalSupply(CONTRACTS.BTD, TOKEN_DECIMALS.BTD)
  const { totalSupplyNum: btbSupply } = useTotalSupply(CONTRACTS.BTB, TOKEN_DECIMALS.BTB)
  const { totalSupplyNum: brsTotalSupply } = useTotalSupply(CONTRACTS.BRS, TOKEN_DECIMALS.BRS)
  const { maxSupply: brsMaxSupply } = useBRSMaxSupply()

  // Treasury data (WBTC/BTD, not BRS)
  const { wbtcBalance, btdBalance } = useTreasuryBalances()

  // Read actual BRS distribution from chain
  const brsDistributionData = useBRSDistribution()

  // Get distributed amount and theoretical allocations (60/20/10/10 split)
  const brsDistributed = brsDistributionData.distributed
  const { miners: minersAllocation, treasury: treasuryAllocation, foundation: foundationAllocation, team: teamAllocation } = brsDistributionData.allocation

  // Get actual Treasury BRS balance for TVL calculation
  const treasuryBRSBalance = brsDistributionData.treasury

  const FOUNDATION_ADDRESS = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
  const TEAM_ADDRESS = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'

  // Calculate percentage of 2.1B max supply for each allocation
  const calcPercentOfMax = (amount: number) => (brsMaxSupply > 0 ? (amount / brsMaxSupply) * 100 : 0)

  // Distribution data based on theoretical allocation (60/20/10/10 of distributed amount)
  // Progress bar shows percentage of total 2.1B supply
  const distributionData = [
    {
      key: 'mining',
      label: 'Yield Farmers (60%)',
      amount: minersAllocation,
      percentage: calcPercentOfMax(minersAllocation),
      color: 'bg-amber-500',
    },
    {
      key: 'treasury',
      label: 'Treasury (20%)',
      amount: treasuryAllocation,
      percentage: calcPercentOfMax(treasuryAllocation),
      color: 'bg-purple-500',
    },
    {
      key: 'foundation',
      label: 'Foundation (10%)',
      amount: foundationAllocation,
      percentage: calcPercentOfMax(foundationAllocation),
      color: 'bg-blue-500',
    },
    {
      key: 'team',
      label: 'Team (10%)',
      amount: teamAllocation,
      percentage: calcPercentOfMax(teamAllocation),
      color: 'bg-green-500',
    },
  ]

  const allocationAddresses = [
    {
      label: 'Farming Pool',
      address: CONTRACTS.FarmingPool,
      copyKey: 'FARMING_ALLOCATION',
    },
    {
      label: 'Treasury',
      address: CONTRACTS.Treasury,
      copyKey: 'TREASURY_ALLOCATION',
    },
    {
      label: 'Foundation',
      address: FOUNDATION_ADDRESS,
      copyKey: 'FOUNDATION_ALLOCATION',
    },
    {
      label: 'Team',
      address: TEAM_ADDRESS,
      copyKey: 'TEAM_ALLOCATION',
    },
  ]

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(''), 2000)
  }

  // Calculate treasury TVL (using real-time computed BRS balance)
  const treasuryTVL = wbtcBalance * wbtcPrice + treasuryBRSBalance * brsPrice + btdBalance * btdPrice

  // Format large numbers - display full numbers with thousand separators
  const formatNumber = (num: number) => {
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  // Format with K/M/B abbreviations (for compact display)
  const formatCompactNumber = (num: number) => {
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`
    if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`
    return num.toFixed(2)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Network Info */}
      <div className="card bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div className="flex items-center gap-3 mb-3">
          <Database className="w-6 h-6" />
          <h2 className="text-xl font-bold">Network Information</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <div className="text-primary-100 text-sm mb-1">Network Name</div>
            <div className="font-semibold">{NETWORK_CONFIG.chainName}</div>
          </div>
          <div>
            <div className="text-primary-100 text-sm mb-1">Chain ID</div>
            <div className="font-semibold">{NETWORK_CONFIG.chainId}</div>
          </div>
          <div>
            <div className="text-primary-100 text-sm mb-1">RPC URL</div>
            <div className="font-semibold text-sm">{NETWORK_CONFIG.rpcUrl}</div>
          </div>
        </div>
      </div>

      {/* System Metrics */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">System Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* TVL */}
          <div className="card">
            <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mb-3">
              <Coins className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total TVL</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              ${formatNumber(systemMetrics.tvl)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">Treasury + Pools</div>
          </div>

          {/* Collateral Ratio */}
          <div className="card">
            <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-center mb-3">
              <BarChart3 className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Collateral Ratio</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {systemMetrics.collateralRatioLoading
                ? '...'
                : `${systemMetrics.collateralRatio.toFixed(2)}%`}
            </div>
          </div>

          {/* IUSD Price */}
          <div className="card">
            <div className="w-12 h-12 bg-primary-50 dark:bg-primary-900/20 rounded-lg flex items-center justify-center mb-3">
              <TrendingUp className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">IUSD Price</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              ${iusdPrice.toFixed(4)}
            </div>
          </div>

          {/* BTD Staking APR */}
          <div className="card">
            <div className="w-12 h-12 bg-btd-light/10 dark:bg-btd/20 rounded-lg flex items-center justify-center mb-3">
              <Percent className="w-6 h-6 text-btd dark:text-btd-light" />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">BTD Staking APR</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {systemMetrics.btdAPR.toFixed(2)}%
            </div>
          </div>

          {/* BTB Staking APR */}
          <div className="card">
            <div className="w-12 h-12 bg-btb-light/10 dark:bg-btb/20 rounded-lg flex items-center justify-center mb-3">
              <Percent className="w-6 h-6 text-btb dark:text-btb-light" />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">BTB Staking APR</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {systemMetrics.btbAPR.toFixed(2)}%
            </div>
          </div>

          {/* BTB Min Price */}
          <div className="card">
            <div className="w-12 h-12 bg-primary-50 dark:bg-primary-900/20 rounded-lg flex items-center justify-center mb-3">
              <TrendingDown className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              BTB Minimum System Price
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              ${btbMinPrice.toFixed(4)}
            </div>
          </div>
        </div>
      </div>

      {/* Treasury Statistics */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Treasury Statistics
        </h2>
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              <Vault className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total TVL</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                ${formatNumber(treasuryTVL)}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {/* WBTC Holdings */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">WBTC Holdings</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                {wbtcBalance.toFixed(4)} WBTC
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                ≈ ${formatNumber(wbtcBalance * wbtcPrice)}
              </div>
            </div>

            {/* BRS Holdings */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">BRS Holdings</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                {formatNumber(treasuryBRSBalance)} BRS
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                ≈ ${formatNumber(treasuryBRSBalance * brsPrice)}
              </div>
            </div>

            {/* BTD Holdings */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">BTD Holdings</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                {formatNumber(btdBalance)} BTD
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                ≈ ${formatNumber(btdBalance * btdPrice)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Token Information */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Token Information</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {/* WBTC */}
          <div className="card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">WBTC</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Wrapped Bitcoin</p>
              </div>
              <div className="w-12 h-12 bg-primary-50 dark:bg-primary-900/20 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Address</span>
                <button
                  onClick={() => copyToClipboard(CONTRACTS.WBTC, 'WBTC')}
                  className="flex items-center gap-1 text-sm font-mono text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400"
                >
                  {CONTRACTS.WBTC.slice(0, 6)}...{CONTRACTS.WBTC.slice(-4)}
                  {copied === 'WBTC' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Price</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  ${btcPrice.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Supply</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatNumber(wbtcSupply)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Max Supply</span>
                <span className="font-semibold text-gray-900 dark:text-white">21M</span>
              </div>
            </div>
          </div>

          {/* BTD */}
          <div className="card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-btd">BTD</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Stablecoin</p>
              </div>
              <div className="w-12 h-12 bg-btd-light/10 dark:bg-btd/20 rounded-full flex items-center justify-center">
                <Coins className="w-6 h-6 text-btd" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Address</span>
                <button
                  onClick={() => copyToClipboard(CONTRACTS.BTD, 'BTD')}
                  className="flex items-center gap-1 text-sm font-mono text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400"
                >
                  {CONTRACTS.BTD.slice(0, 6)}...{CONTRACTS.BTD.slice(-4)}
                  {copied === 'BTD' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Price</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  ${btdPrice.toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Supply</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatNumber(btdSupply)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Max Supply</span>
                <span className="font-semibold text-gray-900 dark:text-white">∞</span>
              </div>
            </div>
          </div>

          {/* BTB */}
          <div className="card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-btb">BTB</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Bond Token</p>
              </div>
              <div className="w-12 h-12 bg-btb-light/10 dark:bg-btb/20 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-btb" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Address</span>
                <button
                  onClick={() => copyToClipboard(CONTRACTS.BTB, 'BTB')}
                  className="flex items-center gap-1 text-sm font-mono text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400"
                >
                  {CONTRACTS.BTB.slice(0, 6)}...{CONTRACTS.BTB.slice(-4)}
                  {copied === 'BTB' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Price</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  ${btbPrice.toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Supply</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatNumber(btbSupply)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Max Supply</span>
                <span className="font-semibold text-gray-900 dark:text-white">∞</span>
              </div>
            </div>
          </div>

          {/* BRS */}
          <div className="card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-brs">BRS</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Governance Token</p>
              </div>
              <div className="w-12 h-12 bg-brs-light/10 dark:bg-brs/20 rounded-full flex items-center justify-center">
                <Pickaxe className="w-6 h-6 text-brs" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Address</span>
                <button
                  onClick={() => copyToClipboard(CONTRACTS.BRS, 'BRS')}
                  className="flex items-center gap-1 text-sm font-mono text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400"
                >
                  {CONTRACTS.BRS.slice(0, 6)}...{CONTRACTS.BRS.slice(-4)}
                  {copied === 'BRS' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Price</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  ${brsPrice.toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Supply</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatNumber(brsTotalSupply)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Max Supply</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatNumber(brsMaxSupply)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Farming Statistics */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Farming Statistics</h2>
        <div className="card">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pool TVL</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                ${formatNumber(systemMetrics.farmingPoolTVL)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Total locked in pools
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">BRS Total Supply</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCompactNumber(brsMaxSupply)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">BRS Distributed</div>
              <div className="text-2xl font-bold text-brs">{formatNumber(brsDistributed)}</div>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">From FarmingPool</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Distribution Progress</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {brsMaxSupply > 0 ? formatSmartPercentage((brsDistributed / brsMaxSupply) * 100) : '0%'}
              </div>
            </div>
          </div>

          {/* BRS Distribution */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              BRS Distribution Allocation
            </h3>
            <div className="space-y-3">
              {distributionData.map(allocation => {
                // Ensure minimum visible width for very small percentages
                const displayWidth = allocation.percentage > 0
                  ? Math.max(allocation.percentage, 0.5)
                  : 0
                return (
                  <div key={allocation.key}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {allocation.label}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {`${formatSmartPercentage(allocation.percentage)} (${formatNumber(allocation.amount)} BRS)`}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`rounded-full h-2 transition-all ${allocation.color}`}
                        style={{ width: `${displayWidth}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-gray-500 dark:text-gray-400 mt-3">
              {allocationAddresses.map(item => (
                <div key={item.copyKey} className="flex flex-col gap-1">
                  <span>{item.label}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(item.address, item.copyKey)}
                    className="flex items-center gap-1 font-mono text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    {item.address.slice(0, 6)}...{item.address.slice(-4)}
                    {copied === item.copyKey ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Info Note */}
      <div className="card bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-primary-900 dark:text-blue-100">
            <p className="font-medium mb-1">About Chain Explorer</p>
            <p>
              This page displays real-time on-chain data from the BRS system running on{' '}
              {NETWORK_CONFIG.chainName}. All metrics, prices, and balances are fetched directly
              from smart contracts on the blockchain.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExplorerPage
