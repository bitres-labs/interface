import { ReactNode } from 'react'
import TopBar from './TopBar'
import BottomNav from './BottomNav'
import Footer from './Footer'

function MobileLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Top Navigation Bar */}
      <TopBar />

      {/* Main Content Area - scrollable */}
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="px-4 py-4 md:py-6">{children}</div>
      </main>

      {/* Footer */}
      <Footer />

      {/* Bottom Navigation Bar - Mobile Only */}
      <BottomNav />
    </div>
  )
}

export default MobileLayout
