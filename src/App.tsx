import { Routes, Route } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import MobileLayout from './components/layout/MobileLayout'
import HomePage from './pages/HomePage'
import MintPage from './pages/MintPage'
import StakePage from './pages/StakePage'
import FarmPage from './pages/FarmPage'
import SwapPage from './pages/SwapPage'
import PoolPage from './pages/PoolPage'
import AssetPage from './pages/AssetPage'
import ExplorerPage from './pages/ExplorerPage'
import FAQPage from './pages/FAQPage'
import WhitepaperPage from './pages/WhitepaperPage'
import AboutPage from './pages/AboutPage'

function App() {
  return (
    <ErrorBoundary>
      <MobileLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/mint" element={<MintPage />} />
          <Route path="/swap" element={<SwapPage />} />
          <Route path="/pool" element={<PoolPage />} />
          <Route path="/stake" element={<StakePage />} />
          <Route path="/farm" element={<FarmPage />} />
          <Route path="/asset" element={<AssetPage />} />
          <Route path="/explorer" element={<ExplorerPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/whitepaper" element={<WhitepaperPage />} />
          <Route path="/faq" element={<FAQPage />} />
        </Routes>
      </MobileLayout>
    </ErrorBoundary>
  )
}

export default App
