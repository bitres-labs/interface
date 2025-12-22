'use client'

import { FileText, Download, BookOpen, ExternalLink } from 'lucide-react'

function WhitepaperPage() {
  const documents = [
    {
      title: 'Bitres Whitepaper',
      description:
        'A Decentralized Stablecoin System Collateralized by Bitcoin - Complete technical whitepaper explaining system design, economics, and implementation',
      version: 'Latest',
      size: '633 KB',
      format: 'PDF',
      downloadUrl: '/whitepaper/Bitres-Whitepaper.pdf',
      viewUrl: '/whitepaper/Bitres-Whitepaper.pdf',
    },
    {
      title: 'System Design Document',
      description:
        'Detailed technical documentation of smart contract architecture, system components, and implementation specifications',
      version: 'Latest',
      size: '223 KB',
      format: 'PDF',
      downloadUrl: '/whitepaper/Bitres-System-Design.pdf',
      viewUrl: '/whitepaper/Bitres-System-Design.pdf',
    },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* System Overview Card */}
      <div className="card bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border-primary-200 dark:border-primary-700">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">About Bitres Protocol</h2>
        </div>
        <p className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
          Bitres is a Bitcoin-native decentralized stablecoin protocol
          that creates BTD, a stablecoin pegged to Ideal USD (a conceptual unit of account with
          target 2% annual inflation). The system uses Bitcoin (WBTC) as collateral and employs
          a three-token structure: BTD (stablecoin), BTB (bond token), and BRS (governance token).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-primary-200 dark:border-primary-700">
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">BTD</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Stablecoin Token</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-primary-200 dark:border-primary-700">
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">BTB</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Bond Token</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-primary-200 dark:border-primary-700">
            <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">BRS</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Governance Token</div>
          </div>
        </div>
      </div>

      {/* Documents Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          Available Documents
        </h2>

        <div className="space-y-3">
          {documents.map((doc, index) => (
            <div key={index} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">
                    {doc.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{doc.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {doc.version}
                    </span>
                    <span>{doc.format}</span>
                    <span>{doc.size}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <a
                  href={doc.viewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-700 text-white rounded-lg font-medium text-center transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Online
                </a>
                <a
                  href={doc.downloadUrl}
                  download
                  className="flex-1 px-4 py-2.5 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-primary-600 dark:text-primary-400 border-2 border-primary-600 dark:border-primary-500 rounded-lg font-medium text-center transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key Features Section */}
      <div className="card bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Key Features</h3>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li className="flex items-start gap-2">
            <span className="text-primary-600 dark:text-primary-400 mt-0.5">✓</span>
            <span>Bitcoin-native stablecoin (BTD) pegged to Ideal USD with 2% target inflation</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-600 dark:text-primary-400 mt-0.5">✓</span>
            <span>Three-layer risk distribution: BTC collateral → BTB bonds → BRS backstop</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-600 dark:text-primary-400 mt-0.5">✓</span>
            <span>ERC4626 tokenized vaults (stBTD/stBTB) for auto-compounding interest</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-600 dark:text-primary-400 mt-0.5">✓</span>
            <span>Dynamic interest rates: BTD synced with Fed funds rate, BTB adjusted by market price</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-600 dark:text-primary-400 mt-0.5">✓</span>
            <span>BRS governance token with 4-year halving mechanism (2.1B total supply)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-600 dark:text-primary-400 mt-0.5">✓</span>
            <span>Multi-source price oracles with TWAP protection (Chainlink, Pyth, Redstone)</span>
          </li>
        </ul>
      </div>

      {/* Additional Resources */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Additional Resources</h3>
        <div className="space-y-2">
          <a
            href="/faq"
            className="block px-4 py-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
          >
            <div className="font-medium">Frequently Asked Questions</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Common questions about using Bitres
            </div>
          </a>
          <a
            href="/explorer"
            className="block px-4 py-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
          >
            <div className="font-medium">System Explorer</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              View live system parameters and statistics
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}

export default WhitepaperPage
