import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import { baseSepolia, sepolia } from 'wagmi/chains'
import {
  NETWORK_CONFIG_LOCAL,
  NETWORK_CONFIG_SEPOLIA,
  NETWORK_CONFIG_BASE_SEPOLIA,
} from './contracts'

const WALLETCONNECT_PROJECT_ID =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '0123456789abcdef0123456789abcdef'

// Hardhat Local Network
const hardhat = {
  id: 31337,
  name: 'Hardhat Local',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: [NETWORK_CONFIG_LOCAL.rpcUrl] },
    public: { http: [NETWORK_CONFIG_LOCAL.rpcUrl] },
  },
  testnet: true,
}

// Detect environment using Vite's build mode
const isProductionBuild = import.meta.env.PROD

// Use Base Sepolia first in production; keep Sepolia available in dev for legacy deployments.
const chains = isProductionBuild
  ? ([baseSepolia] as const)
  : ([hardhat, baseSepolia, sepolia] as const)

export const config = getDefaultConfig({
  appName: 'Bitres',
  projectId: WALLETCONNECT_PROJECT_ID,
  chains,
  transports: {
    [hardhat.id]: http(NETWORK_CONFIG_LOCAL.rpcUrl),
    [baseSepolia.id]: http(NETWORK_CONFIG_BASE_SEPOLIA.rpcUrl),
    [sepolia.id]: http(NETWORK_CONFIG_SEPOLIA.rpcUrl),
  },
  ssr: false,
})
