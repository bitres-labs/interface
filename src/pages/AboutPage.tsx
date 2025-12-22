'use client'

import { Shield, Coins, TrendingUp, Globe, Lock, Zap } from 'lucide-react'

function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="card bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <h1 className="text-4xl font-bold mb-4">About Bitres</h1>
        <p className="text-xl text-primary-100">
          A Bitcoin-collateralized decentralized stablecoin system that combines bitcoin's trust
          minimization with modern monetary policy tools.
        </p>
      </div>

      {/* Vision */}
      <div className="card">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Our Vision</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Bitres is designed to complete Satoshi Nakamoto's vision of
          peer-to-peer electronic cash. While Bitcoin serves as "digital gold" with its fixed supply
          and store of value properties, it lacks the flexible monetary characteristics needed for
          daily transactions and commerce.
        </p>
        <p className="text-gray-600 dark:text-gray-300">
          BRS bridges this gap by creating a bitcoin-collateralized stablecoin that inherits
          Bitcoin's security and decentralization while providing the price stability necessary for
          payments, lending, and broader financial applications.
        </p>
      </div>

      {/* The Challenge */}
      <div className="card bg-gray-50 dark:bg-gray-800">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          The Challenge We Address
        </h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              Fiat Currency Inflation
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Since the collapse of the Bretton Woods system in 1971, the U.S. dollar has lost over
              98% of its gold-backed value. Outstanding Treasury debt has exploded from $0.4
              trillion to over $37 trillion, raising serious questions about long-term monetary
              stability.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              Bitcoin's Payment Limitations
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Despite Bitcoin's $2+ trillion market capitalization, its price volatility makes it
              impractical for everyday transactions. A stable medium of exchange is needed to unlock
              Bitcoin's full potential as a monetary system.
            </p>
          </div>
        </div>
      </div>

      {/* Three-Token System */}
      <div className="card">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          Three-Token Architecture
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
              <Coins className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              BTD - Bitcoin Dollar
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              The system's stablecoin, pegged to Ideal USD (IUSD) - a synthetic unit that
              depreciates at a steady 2% annually, matching major central banks' inflation targets.
            </p>
          </div>
          <div className="space-y-3">
            <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">BTB - Bitcoin Bond</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              A bond token that records deferred claims when the system becomes undercollateralized,
              providing an automatic stabilization mechanism during market downturns.
            </p>
          </div>
          <div className="space-y-3">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              BRS - Governance Token
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              The governance and residual claim token. Holders vote on system parameters, and
              protocol fees are used to buy back and burn BRS, creating value accrual.
            </p>
          </div>
        </div>
      </div>

      {/* Core Mechanisms */}
      <div className="card">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">How BRS Works</h2>
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <span className="text-primary-600 dark:text-primary-400 font-bold">1</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                Collateralized Minting
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Users deposit Bitcoin (WBTC) and mint BTD at the current BTC/IUSD exchange rate. All
                BTD is 100% backed by Bitcoin collateral held in the protocol treasury.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <span className="text-primary-600 dark:text-primary-400 font-bold">2</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                Flexible Redemption
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                When collateralization ratio is above 100%, users redeem BTD for BTC directly. When
                below 100%, the deficit is covered by issuing BTB bonds, ensuring BTD holders always
                receive value.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <span className="text-primary-600 dark:text-primary-400 font-bold">3</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                Interest Rate Adjustment
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                BTD and BTB stakers earn interest that adjusts based on Federal Reserve rates and
                market conditions, creating natural supply/demand balance and peg stability.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <span className="text-primary-600 dark:text-primary-400 font-bold">4</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                Halving-Based Emissions
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                BRS governance tokens are released through a Bitcoin-style halving schedule,
                rewarding liquidity providers, stakers, and ecosystem participants while ensuring
                long-term sustainability.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Key Features */}
      <div className="card bg-gray-50 dark:bg-gray-800">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Key Features</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="flex gap-3">
            <Lock className="w-6 h-6 text-primary-600 dark:text-primary-400 flex-shrink-0" />
            <div>
              <h3 className="font-semibold mb-1 text-gray-900 dark:text-white">
                Fully Collateralized
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Every BTD is backed by Bitcoin, unlike algorithmic stablecoins that collapsed (e.g.,
                TerraUSD)
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Globe className="w-6 h-6 text-primary-600 dark:text-primary-400 flex-shrink-0" />
            <div>
              <h3 className="font-semibold mb-1 text-gray-900 dark:text-white">
                Decentralized Oracles
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Dual price verification using Chainlink feeds and on-chain DEX pairs ensures
                tamper-resistant pricing
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Shield className="w-6 h-6 text-primary-600 dark:text-primary-400 flex-shrink-0" />
            <div>
              <h3 className="font-semibold mb-1 text-gray-900 dark:text-white">
                Multi-Layer Stability
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                BTB bonds and BRS reserves provide two additional layers of protection during market
                volatility
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Zap className="w-6 h-6 text-primary-600 dark:text-primary-400 flex-shrink-0" />
            <div>
              <h3 className="font-semibold mb-1 text-gray-900 dark:text-white">Automated Policy</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Interest rates and incentives adjust algorithmically based on real-world economic
                indicators
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Ideal USD Concept */}
      <div className="card">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          Why Ideal USD (IUSD)?
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Rather than pegging to a volatile USD, BTD tracks Ideal USD - a synthetic unit that
          maintains exactly 2% annual inflation. This approach:
        </p>
        <ul className="space-y-2 text-gray-600 dark:text-gray-300 ml-6">
          <li className="flex gap-2">
            <span className="text-primary-600 dark:text-primary-400">•</span>
            <span>
              Provides predictable long-term purchasing power, unlike the actual USD which
              experienced 10%+ inflation during crises
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary-600 dark:text-primary-400">•</span>
            <span>
              Aligns with major central banks' inflation targets (Federal Reserve, ECB, Bank of
              England)
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary-600 dark:text-primary-400">•</span>
            <span>
              Creates a smoother transition path toward a fully bitcoin-native monetary system once
              Bitcoin achieves sufficient scale
            </span>
          </li>
        </ul>
      </div>

      {/* System Architecture */}
      <div className="card bg-gray-50 dark:bg-gray-800">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          System Architecture
        </h2>
        <div className="space-y-4">
          <div className="border-l-4 border-primary-600 dark:border-primary-400 pl-4">
            <h3 className="font-semibold mb-1 text-gray-900 dark:text-white">
              Collateral Treasury
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Securely holds all WBTC collateral and manages BTD/BRS reserves for system operations
            </p>
          </div>
          <div className="border-l-4 border-primary-600 dark:border-primary-400 pl-4">
            <h3 className="font-semibold mb-1 text-gray-900 dark:text-white">Minter Module</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Handles BTC ↔ BTD conversions, BTB issuance during under-collateralization, and BRS
              compensation when needed
            </p>
          </div>
          <div className="border-l-4 border-primary-600 dark:border-primary-400 pl-4">
            <h3 className="font-semibold mb-1 text-gray-900 dark:text-white">Price Oracle</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Maintains asset addresses, decentralized price pools, off-chain feeds, and validates
              price consistency
            </p>
          </div>
          <div className="border-l-4 border-primary-600 dark:border-primary-400 pl-4">
            <h3 className="font-semibold mb-1 text-gray-900 dark:text-white">
              Interest Rate Module
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Dynamically adjusts APY for BTD and BTB staking based on Federal Reserve rates and
              secondary market prices
            </p>
          </div>
          <div className="border-l-4 border-primary-600 dark:border-primary-400 pl-4">
            <h3 className="font-semibold mb-1 text-gray-900 dark:text-white">Farming Module</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Distributes BRS rewards on a 4-year halving schedule to ecosystem fund, team, and
              liquidity providers
            </p>
          </div>
        </div>
      </div>

      {/* Future Roadmap */}
      <div className="card">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Long-Term Vision</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          BRS is designed as a stepping stone toward a fully bitcoin-native monetary system. As
          Bitcoin's market depth and stability increase, the system can gradually reduce reliance on
          USD-based pricing and eventually operate purely on Bitcoin's purchasing power.
        </p>
        <p className="text-gray-600 dark:text-gray-300">
          This transition will occur naturally as Bitcoin's adoption grows and its role as a global
          reserve asset solidifies. Until then, BRS provides the stability and functionality needed
          for Bitcoin to serve as both a store of value and a medium of exchange.
        </p>
      </div>

      {/* Learn More */}
      <div className="card bg-primary-600 text-white">
        <h2 className="text-2xl font-bold mb-4">Learn More</h2>
        <p className="text-primary-100 mb-6">
          Explore our detailed documentation to understand the economic models, technical
          architecture, and mathematical foundations behind BRS.
        </p>
        <div className="flex flex-wrap gap-4">
          <a
            href="/whitepaper"
            className="px-6 py-3 bg-white text-primary-600 rounded-lg font-medium hover:bg-primary-50 transition-colors"
          >
            Read Whitepaper
          </a>
          <a
            href="/explorer"
            className="px-6 py-3 bg-primary-500 hover:bg-primary-700 rounded-lg font-medium transition-colors"
          >
            Explore System Data
          </a>
        </div>
      </div>
    </div>
  )
}

export default AboutPage
