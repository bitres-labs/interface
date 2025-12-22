/**
 * Wagmi Mock Utilities for Testing
 * Provides mock implementations of wagmi hooks
 */

import { vi } from 'vitest'

/**
 * Mock useReadContract hook
 */
export function mockUseReadContract(returnValue: {
  data?: unknown
  isError?: boolean
  isLoading?: boolean
  refetch?: () => Promise<unknown>
}) {
  return {
    data: returnValue.data,
    isError: returnValue.isError ?? false,
    isLoading: returnValue.isLoading ?? false,
    refetch: returnValue.refetch ?? vi.fn().mockResolvedValue(returnValue.data),
  }
}

/**
 * Mock useWriteContract hook
 */
export function mockUseWriteContract(options?: {
  isPending?: boolean
  isSuccess?: boolean
  isError?: boolean
  data?: `0x${string}`
  error?: Error | null
}) {
  return {
    writeContract: vi.fn(),
    writeContractAsync: vi.fn().mockResolvedValue(options?.data ?? '0x123...'),
    data: options?.data,
    isPending: options?.isPending ?? false,
    isSuccess: options?.isSuccess ?? false,
    isError: options?.isError ?? false,
    error: options?.error ?? null,
  }
}

/**
 * Mock useWaitForTransactionReceipt hook
 */
export function mockUseWaitForTransactionReceipt(options?: {
  isSuccess?: boolean
  isLoading?: boolean
  isError?: boolean
}) {
  return {
    isSuccess: options?.isSuccess ?? false,
    isLoading: options?.isLoading ?? false,
    isError: options?.isError ?? false,
  }
}

/**
 * Mock useAccount hook
 */
export function mockUseAccount(options?: {
  address?: `0x${string}`
  isConnected?: boolean
  isConnecting?: boolean
  isDisconnected?: boolean
}) {
  return {
    address: options?.address ?? ('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as `0x${string}`),
    isConnected: options?.isConnected ?? true,
    isConnecting: options?.isConnecting ?? false,
    isDisconnected: options?.isDisconnected ?? false,
  }
}

/**
 * Mock useChainId hook
 */
export function mockUseChainId(chainId: number = 31337) {
  return chainId
}

/**
 * Mock useBalance hook
 */
export function mockUseBalance(options?: {
  data?: {
    decimals: number
    formatted: string
    symbol: string
    value: bigint
  }
  isError?: boolean
  isLoading?: boolean
}) {
  return {
    data: options?.data ?? {
      decimals: 18,
      formatted: '1000',
      symbol: 'ETH',
      value: 1000000000000000000000n,
    },
    isError: options?.isError ?? false,
    isLoading: options?.isLoading ?? false,
  }
}

/**
 * Create mock for wagmi module
 */
export function createWagmiMocks() {
  return {
    useReadContract: vi.fn(),
    useWriteContract: vi.fn(),
    useWaitForTransactionReceipt: vi.fn(),
    useAccount: vi.fn(),
    useChainId: vi.fn(),
    useBalance: vi.fn(),
    useConnect: vi.fn(),
    useDisconnect: vi.fn(),
    useSwitchChain: vi.fn(),
    useWalletClient: vi.fn(),
    usePublicClient: vi.fn(),
  }
}

/**
 * Mock RainbowKit hooks
 */
export function mockUseConnectModal() {
  return {
    openConnectModal: vi.fn(),
  }
}

/**
 * Setup default wagmi mocks for testing
 */
export function setupWagmiMocks() {
  return {
    ...createWagmiMocks(),
    // Set default implementations
    useAccount: vi.fn().mockReturnValue(mockUseAccount()),
    useChainId: vi.fn().mockReturnValue(31337),
    useReadContract: vi.fn().mockReturnValue(mockUseReadContract({})),
    useWriteContract: vi.fn().mockReturnValue(mockUseWriteContract()),
    useWaitForTransactionReceipt: vi.fn().mockReturnValue(mockUseWaitForTransactionReceipt()),
  }
}

/**
 * Mock BigInt values commonly used in blockchain
 */
export const mockBigIntValues = {
  zero: 0n,
  one: 1n,
  oneEther: 1000000000000000000n, // 1 * 10^18
  tenEther: 10000000000000000000n,
  hundredEther: 100000000000000000000n,
  oneThousand: 1000000000000000000000n,
  oneMillion: 1000000000000000000000000n,
  // Common token amounts
  oneUsdc: 1000000n, // 1 USDC (6 decimals)
  oneWbtc: 100000000n, // 1 WBTC (8 decimals)
  oneBtd: 1000000000000000000n, // 1 BTD (18 decimals)
}

/**
 * Mock Ethereum addresses for testing
 */
export const mockAddresses = {
  zero: '0x0000000000000000000000000000000000000000' as `0x${string}`,
  user: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' as `0x${string}`,
  user2: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as `0x${string}`,
  contract: '0x5FbDB2315678afecb367f032d93F642f64180aa3' as `0x${string}`,
  token: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as `0x${string}`,
}
