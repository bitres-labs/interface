'use client'

import { useState } from 'react'
import SwapTab from '@/components/swap/SwapTab'
import AddLiquidityTab from '@/components/swap/AddLiquidityTab'
import RemoveLiquidityTab from '@/components/swap/RemoveLiquidityTab'

type Tab = 'swap' | 'add' | 'remove'

interface SwapPageProps {
  embedded?: boolean
}

function SwapPage({ embedded = false }: SwapPageProps = {}) {
  const [activeTab, setActiveTab] = useState<Tab>('swap')
  const [selectedPool, setSelectedPool] = useState(0)

  const content = (
    <>
      {/* Tabs */}
      {embedded ? (
        // Embedded mode: original border-bottom style
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab('swap')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'swap'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Swap
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'add'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Add Liquidity
          </button>
          <button
            onClick={() => setActiveTab('remove')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'remove'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Remove Liquidity
          </button>
        </div>
      ) : (
        // Standalone mode: highlighted grid style
        <div className="grid grid-cols-3 gap-3 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg mb-6">
          <button
            onClick={() => setActiveTab('swap')}
            className={`px-6 py-3 rounded-lg font-semibold text-base transition-all ${
              activeTab === 'swap'
                ? 'bg-primary-600 text-white shadow-md hover:bg-primary-700'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            Swap
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`px-6 py-3 rounded-lg font-semibold text-base transition-all ${
              activeTab === 'add'
                ? 'bg-primary-600 text-white shadow-md hover:bg-primary-700'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            Add Liquidity
          </button>
          <button
            onClick={() => setActiveTab('remove')}
            className={`px-6 py-3 rounded-lg font-semibold text-base transition-all ${
              activeTab === 'remove'
                ? 'bg-primary-600 text-white shadow-md hover:bg-primary-700'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            Remove Liquidity
          </button>
        </div>
      )}

      {activeTab === 'swap' && <SwapTab />}
      {activeTab === 'add' && (
        <AddLiquidityTab selectedPool={selectedPool} setSelectedPool={setSelectedPool} />
      )}
      {activeTab === 'remove' && (
        <RemoveLiquidityTab selectedPool={selectedPool} setSelectedPool={setSelectedPool} />
      )}
    </>
  )

  // Return based on embedded mode
  if (embedded) {
    return content
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="card">{content}</div>
    </div>
  )
}

export default SwapPage
