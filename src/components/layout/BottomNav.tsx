import { Link, useLocation } from 'react-router-dom'
import { Home, TrendingUp, ArrowLeftRight, Coins, Wallet } from 'lucide-react'

function BottomNav() {
  const location = useLocation()

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/farm', icon: TrendingUp, label: 'Farm' },
    { path: '/swap', icon: ArrowLeftRight, label: 'Swap', isCenter: true },
    { path: '/stake', icon: Coins, label: 'Stake' },
    { path: '/asset', icon: Wallet, label: 'Asset' },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg z-50 transition-colors">
      <div className="relative flex items-center justify-around h-20">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = location.pathname === item.path

          // Center large button for Swap
          if (item.isCenter) {
            return (
              <div key={item.path} className="flex-1 flex justify-center">
                <Link
                  to={item.path}
                  className="absolute -top-6 w-16 h-16 bg-primary-600 rounded-full shadow-lg flex items-center justify-center hover:bg-primary-700 transition-all active:scale-95"
                >
                  <Icon className="w-7 h-7 text-white" />
                </Link>
                <span className="absolute bottom-2 text-xs font-medium text-primary-600 dark:text-primary-400">
                  {item.label}
                </span>
              </div>
            )
          }

          // Regular nav items
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex-1 flex flex-col items-center gap-1 py-2 transition-colors ${
                isActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomNav
