import { TrendingUp } from 'lucide-react'
import { useFarmingPositions } from '@/hooks/useFarmingPositions'
import { TokenIcon, DualTokenIcon } from '@/components/common/TokenIcon'
import { formatCurrency } from '@/utils/format'

// Extract token symbols from pool name for icon display
function getTokenSymbols(name: string) {
  if (name.includes('/')) {
    const [token0, token1] = name.split('/')
    return { token0, token1 }
  }
  return { token0: name, token1: null }
}

function HighYieldFarms() {
  // Use unified farming positions hook - get top 3 by APY
  const { topAPYPools } = useFarmingPositions()

  const poolStats = topAPYPools.map(pool => {
    const { token0, token1 } = getTokenSymbols(pool.name)
    return {
      id: pool.id,
      name: pool.name,
      type: pool.type,
      token0,
      token1,
      apy: pool.apy.apyFormatted,
      tvl: formatCurrency(pool.tvl),
      allocation: pool.poolInfo.allocation,
    }
  })

  return (
    <div className="space-y-3">
      {poolStats.map(pool => (
        <div
          key={pool.id}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md dark:hover:shadow-gray-900/40 transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {pool.token1 ? (
                <DualTokenIcon token0={pool.token0} token1={pool.token1} size="w-7 h-7" />
              ) : (
                <TokenIcon token={pool.token0} size="w-7 h-7" />
              )}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{pool.name}</h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">{pool.type} Pool</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-brs-DEFAULT">{pool.apy}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">APY</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-gray-500 dark:text-gray-400">TVL:</span>
                <span className="font-medium ml-1 text-gray-900 dark:text-white">{pool.tvl}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Weight:</span>
                <span className="font-medium ml-1 text-gray-900 dark:text-white">{pool.allocation}%</span>
              </div>
            </div>
            <TrendingUp className="w-4 h-4 text-brs-DEFAULT" />
          </div>
        </div>
      ))}

      <div className="text-center pt-2">
        <p className="text-sm text-gray-500 dark:text-gray-400">Earn BRS rewards by providing liquidity</p>
      </div>
    </div>
  )
}

export default HighYieldFarms
