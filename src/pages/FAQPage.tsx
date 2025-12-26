'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react'

function FAQPage() {
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null)

  const faqData = [
    {
      category: 'General',
      questions: [
        {
          q: 'What is Bitres?',
          a: 'Bitres is a decentralized stablecoin system that creates BTD (Bitcoin Backed Dollar), a stablecoin pegged to IUSD (Ideal USD, which tracks PCE inflation). The system uses WBTC as collateral and features automatic interest accumulation and governance through BRS tokens.',
        },
        {
          q: 'What tokens does Bitres have?',
          a: 'Bitres has three main tokens: BTD (stablecoin), BTB (bond token for under-collateralized periods), and BRS (governance token for system rewards).',
        },
        {
          q: 'Is Bitres safe?',
          a: 'Bitres smart contracts are designed with security best practices, including role-based access control, reentrancy guards, and emergency pause mechanisms. However, as with all DeFi protocols, please do your own research and only invest what you can afford to lose.',
        },
      ],
    },
    {
      category: 'Minting & Redemption',
      questions: [
        {
          q: 'How do I mint BTD?',
          a: 'To mint BTD, deposit WBTC as collateral through the Mint page. The system requires at least 150% collateralization ratio. You will receive BTD stablecoins valued at the current IUSD price.',
        },
        {
          q: 'What happens when I redeem BTD?',
          a: 'When you redeem BTD, you burn your BTD tokens to receive back WBTC collateral. If the system collateral ratio is above 100%, you receive full WBTC. If below 100%, you receive a mix of WBTC and BTB bonds.',
        },
        {
          q: 'What are BTB bonds?',
          a: 'BTB bonds are issued during under-collateralized periods (CR < 100%). They can be redeemed for WBTC once the system recovers to healthy collateralization levels. BTB holders also earn interest while staking.',
        },
      ],
    },
    {
      category: 'Staking & Farming',
      questions: [
        {
          q: 'What is staking BTD/BTB?',
          a: 'Staking BTD or BTB means depositing them into interest-bearing vaults (stBTD/stBTB) that automatically accumulate interest over time. BTD earns 4% fixed APR, while BTB earns dynamic APR based on system health.',
        },
        {
          q: 'What is farming?',
          a: 'Farming involves providing liquidity to Uniswap V2 pools or staking single tokens to earn BRS governance tokens as rewards. There are 9 farming pools with different reward weights.',
        },
        {
          q: 'How do I earn BRS tokens?',
          a: 'You can earn BRS tokens by participating in farming pools. The highest rewards come from LP token farming (BRS/BTD, BTD/USDC, BTB/BTD), but single-token staking is also available.',
        },
      ],
    },
    {
      category: 'Prices & Oracles',
      questions: [
        {
          q: 'What is IUSD?',
          a: 'IUSD (Ideal USD) is a synthetic dollar unit that adjusts for PCE inflation. It represents the "ideal" purchasing power of $1. As inflation increases, 1 IUSD becomes worth more nominal dollars.',
        },
        {
          q: 'How are prices determined?',
          a: 'BTC price comes from Chainlink oracles, PCE data from FRED API, and token prices from Uniswap TWAP (Time-Weighted Average Price) oracles to prevent manipulation.',
        },
        {
          q: 'Why does BTD price fluctuate?',
          a: "BTD is pegged to IUSD, not to $1 USD. As IUSD tracks inflation, BTD's nominal dollar value increases over time to maintain purchasing power. Short-term fluctuations may occur due to market dynamics.",
        },
      ],
    },
    {
      category: 'System Parameters',
      questions: [
        {
          q: 'What is the collateral ratio?',
          a: 'The collateral ratio (CR) is the ratio of total collateral value to total BTD supply. A healthy system maintains CR ≥ 150%. When CR < 100%, the system enters emergency mode and redemptions include BTB bonds.',
        },
        {
          q: 'What fees does Bitres charge?',
          a: 'Bitres charges a small minting fee (typically 0.1-0.5%) and redemption fee. These fees help maintain system stability and fund the treasury for protocol development.',
        },
        {
          q: 'Can Bitres be upgraded?',
          a: 'Yes, Bitres contracts use upgradeable proxy patterns with timelock controls. Any upgrades must go through governance proposals and have a delay period for security.',
        },
      ],
    },
  ]

  const toggleFAQ = (categoryIndex: number, questionIndex: number) => {
    const key = `${categoryIndex}-${questionIndex}`
    setExpandedFAQ(expandedFAQ === key ? null : key)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* FAQ Section */}
      <div className="space-y-6">
        {faqData.map((category, catIndex) => (
          <div key={catIndex}>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              {category.category}
            </h2>
            <div className="space-y-3">
              {category.questions.map((faq, qIndex) => {
                const isExpanded = expandedFAQ === `${catIndex}-${qIndex}`
                return (
                  <div key={qIndex} className="card">
                    <button
                      onClick={() => toggleFAQ(catIndex, qIndex)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <span className="font-semibold text-gray-900 dark:text-white pr-4">
                        {faq.q}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 leading-relaxed">
                        {faq.a}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Contact/Support Section */}
      <div className="card bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
        <div className="text-center py-4">
          <HelpCircle className="w-12 h-12 text-primary-600 dark:text-primary-400 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            Still have questions?
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Join our community or reach out to our support team for help
          </p>
          <div className="flex gap-3 justify-center">
            <a
              href="https://discord.gg/u3DTPAYrva"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
            >
              Join Discord
            </a>
            <a
              href="https://t.me/brs_official"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-primary-600 dark:text-primary-400 border-2 border-blue-600 dark:border-blue-500 rounded-lg font-medium transition-colors"
            >
              Telegram Group
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FAQPage
