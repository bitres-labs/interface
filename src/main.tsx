import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, lightTheme, darkTheme } from '@rainbow-me/rainbowkit'
import { ThemeProvider } from './contexts/ThemeContext'
import App from './App'
import { config } from './config/wagmi'
import './index.css'
import '@rainbow-me/rainbowkit/styles.css'

// Expose wagmi APIs for E2E testing (Sepolia testnet — no security concern)
Promise.all([import('@wagmi/core'), import('wagmi')]).then(([core, wagmi]) => {
  ;(window as any).__e2e = {
    config,
    connect: core.connect,
    disconnect: core.disconnect,
    reconnect: core.reconnect,
    getAccount: core.getAccount,
    injected: wagmi.injected,
  }
})

const queryClient = new QueryClient()

// Custom orange theme for RainbowKit
const customLightTheme = lightTheme({
  accentColor: '#f7931a', // Bitcoin orange
  accentColorForeground: 'white',
  borderRadius: 'large',
})

const customDarkTheme = darkTheme({
  accentColor: '#f7931a', // Bitcoin orange
  accentColorForeground: 'white',
  borderRadius: 'large',
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider locale="en-US" theme={customLightTheme}>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  </React.StrictMode>
)
