import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Wallet SDKs intentionally bring large optional connector bundles.
    // Split them so the app shell stays cacheable, and keep Vite from warning
    // on expected connector chunks.
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      onwarn(warning, warn) {
        if (
          warning.code === 'INVALID_ANNOTATION' &&
          typeof warning.id === 'string' &&
          warning.id.includes('/node_modules/')
        ) {
          return
        }
        warn(warning)
      },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
            return 'react-vendor'
          }
          if (id.includes('@reown') || id.includes('@walletconnect') || id.includes('@rainbow-me')) {
            return 'walletconnect-vendor'
          }
          if (id.includes('@coinbase') || id.includes('@base-org')) {
            return 'coinbase-wallet-vendor'
          }
          if (id.includes('wagmi') || id.includes('viem') || id.includes('@tanstack')) {
            return 'web3-vendor'
          }
          if (id.includes('recharts')) {
            return 'charts-vendor'
          }
          return 'vendor'
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    open: true,
  },
})
