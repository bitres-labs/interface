import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Menu, X, Sun, Moon, ChevronDown } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

function TopBar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [tradeDropdownOpen, setTradeDropdownOpen] = useState(false)
  const [earnDropdownOpen, setEarnDropdownOpen] = useState(false)
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Bitres Logo" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-xl text-gray-900 dark:text-white">Bitres</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors"
            >
              Home
            </Link>

            {/* Trade Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setTradeDropdownOpen(true)}
              onMouseLeave={() => setTradeDropdownOpen(false)}
            >
              <button
                onClick={() => navigate('/swap')}
                className="flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors py-2"
              >
                Trade
                <ChevronDown className="w-4 h-4" />
              </button>
              {tradeDropdownOpen && (
                <div className="absolute top-full left-0 pt-1">
                  <div className="w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2">
                    <Link
                      to="/swap"
                      className="block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      Swap
                    </Link>
                    <Link
                      to="/mint"
                      className="block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      Mint
                    </Link>
                    <Link
                      to="/pool"
                      className="block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      Pool
                    </Link>
                    <Link
                      to="/faucet"
                      className="block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      Faucet
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Earn Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setEarnDropdownOpen(true)}
              onMouseLeave={() => setEarnDropdownOpen(false)}
            >
              <button
                onClick={() => navigate('/farm')}
                className="flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors py-2"
              >
                Earn
                <ChevronDown className="w-4 h-4" />
              </button>
              {earnDropdownOpen && (
                <div className="absolute top-full left-0 pt-1">
                  <div className="w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2">
                    <Link
                      to="/farm"
                      className="block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      Farm
                    </Link>
                    <Link
                      to="/stake"
                      className="block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      Stake
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Link
              to="/explorer"
              className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors"
            >
              Data
            </Link>
            <Link
              to="/asset"
              className="text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors"
            >
              Asset
            </Link>
          </nav>

          {/* Connect Wallet Button */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <ConnectButton chainStatus="icon" showBalance={false} />

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col gap-2">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg font-medium transition-colors"
              >
                Home
              </Link>

              {/* Trade Group */}
              <div className="px-2">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 py-1">
                  Trade
                </div>
                <Link
                  to="/mint"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Mint
                </Link>
                <Link
                  to="/swap"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Swap
                </Link>
                <Link
                  to="/faucet"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Faucet
                </Link>
              </div>

              {/* Earn Group */}
              <div className="px-2">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 py-1">
                  Earn
                </div>
                <Link
                  to="/farm"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Farm
                </Link>
                <Link
                  to="/stake"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Stake
                </Link>
              </div>

              <Link
                to="/explorer"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg font-medium transition-colors"
              >
                Data
              </Link>
              <Link
                to="/asset"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg font-medium transition-colors"
              >
                Asset
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}

export default TopBar
