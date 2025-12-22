import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import { NETWORK_CONFIG } from './contracts'

// Hardhat Local Network
// Always use the WSL IP for RPC connections (Windows browsers can't access WSL's localhost)
const RPC_URL = NETWORK_CONFIG.rpcUrl

const WALLETCONNECT_PROJECT_ID =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '0123456789abcdef0123456789abcdef'

const hardhat = {
  id: 31337,
  name: 'Hardhat Local',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: [RPC_URL] },
    public: { http: [RPC_URL] },
  },
  testnet: true,
}

export const config = getDefaultConfig({
  appName: 'Bitres',
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [hardhat],
  transports: {
    [hardhat.id]: http(RPC_URL),
  },
  ssr: false,
})
