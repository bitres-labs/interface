/**
 * Enhanced Mock Wallet with Real Signing Capabilities
 *
 * Uses Hardhat's impersonation + eth_sign to enable real transaction execution
 * without requiring MetaMask extension.
 */

import { Page } from '@playwright/test'
import { privateKeyToAccount } from 'viem/accounts'
import { signTypedData, hashTypedData } from 'viem'

// Hardhat account #0 - has pre-minted tokens
export const HARDHAT_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
export const HARDHAT_ACCOUNT = privateKeyToAccount(HARDHAT_PRIVATE_KEY)
export const TEST_ADDRESS = HARDHAT_ACCOUNT.address // 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

/**
 * Inject a mock wallet that can sign real EIP-712 typed data
 * and execute real transactions through Hardhat
 */
export async function injectSigningWallet(page: Page, rpcUrl = 'http://localhost:8545'): Promise<void> {
  // Pass the private key to the page context for signing
  await page.addInitScript((params) => {
    const { rpcUrl, privateKey, testAddress } = params
    let requestId = 1
    let isConnected = false

    // Helper to make RPC calls
    async function rpcCall(method: string, params: unknown[] = []) {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method,
          params,
          id: requestId++,
        }),
      })
      const data = await response.json()
      if (data.error) {
        console.error('[SigningWallet] RPC Error:', data.error)
        throw new Error(data.error.message)
      }
      return data.result
    }

    // Sign typed data using eth_signTypedData_v4 via Hardhat
    async function signTypedDataV4(typedData: string, address: string) {
      console.log('[SigningWallet] Signing typed data for', address)

      // Use Hardhat's eth_signTypedData_v4
      // First, impersonate the account
      await rpcCall('hardhat_impersonateAccount', [address])

      // Sign the typed data
      const signature = await rpcCall('eth_signTypedData_v4', [address, typedData])
      console.log('[SigningWallet] Signature:', signature)

      return signature
    }

    // Event listeners storage
    const eventListeners: Record<string, Array<(...args: unknown[]) => void>> = {}

    // Mock ethereum provider - EIP-1193 compliant
    const mockProvider = {
      isMetaMask: true,
      _metamask: {
        isUnlocked: () => Promise.resolve(true),
      },
      networkVersion: '31337',
      chainId: '0x7a69',
      selectedAddress: null as string | null,

      get isConnected() {
        return isConnected
      },

      request: async ({ method, params }: { method: string; params?: unknown[] }) => {
        console.log('[SigningWallet] Request:', method)

        switch (method) {
          case 'eth_accounts':
            return isConnected ? [testAddress] : []

          case 'eth_requestAccounts': {
            isConnected = true
            mockProvider.selectedAddress = testAddress
            setTimeout(() => {
              mockProvider.emit('connect', { chainId: '0x7a69' })
              mockProvider.emit('accountsChanged', [testAddress])
            }, 50)
            return [testAddress]
          }

          case 'eth_chainId':
            return '0x7a69'

          case 'net_version':
            return '31337'

          case 'wallet_switchEthereumChain': {
            const targetChainId = (params as [{chainId: string}])?.[0]?.chainId
            if (targetChainId === '0x7a69') return null
            const error = new Error('Unrecognized chain ID')
            ;(error as any).code = 4902
            throw error
          }

          case 'wallet_addEthereumChain':
            return null

          case 'wallet_getPermissions':
            return isConnected ? [{ parentCapability: 'eth_accounts' }] : []

          case 'wallet_requestPermissions':
            isConnected = true
            return [{ parentCapability: 'eth_accounts' }]

          case 'eth_getBalance':
          case 'eth_blockNumber':
          case 'eth_call':
          case 'eth_estimateGas':
          case 'eth_gasPrice':
          case 'eth_getTransactionCount':
          case 'eth_getTransactionReceipt':
          case 'eth_getTransactionByHash':
          case 'eth_getLogs':
          case 'eth_getCode':
          case 'eth_getBlockByNumber':
          case 'eth_feeHistory':
          case 'eth_maxPriorityFeePerGas':
            return await rpcCall(method, params || [])

          case 'eth_sendTransaction': {
            const txParams = (params as unknown[])?.[0] as Record<string, string>
            if (txParams && !txParams.from) {
              txParams.from = testAddress
            }
            console.log('[SigningWallet] Sending transaction')
            // Impersonate first
            await rpcCall('hardhat_impersonateAccount', [testAddress])
            const txHash = await rpcCall('eth_sendTransaction', [txParams])
            console.log('[SigningWallet] TX hash:', txHash)
            return txHash
          }

          case 'eth_signTypedData':
          case 'eth_signTypedData_v3':
          case 'eth_signTypedData_v4': {
            const [address, typedDataString] = params as [string, string]
            console.log('[SigningWallet] Signing typed data')
            return await signTypedDataV4(typedDataString, address || testAddress)
          }

          case 'personal_sign':
          case 'eth_sign': {
            const [message, address] = params as [string, string]
            await rpcCall('hardhat_impersonateAccount', [address || testAddress])
            return await rpcCall('eth_sign', [address || testAddress, message])
          }

          case 'wallet_watchAsset':
            return true

          default:
            console.log('[SigningWallet] Forwarding:', method)
            try {
              return await rpcCall(method, params || [])
            } catch {
              return null
            }
        }
      },

      on: (event: string, callback: (...args: unknown[]) => void) => {
        if (!eventListeners[event]) eventListeners[event] = []
        eventListeners[event].push(callback)
        return mockProvider
      },

      once: (event: string, callback: (...args: unknown[]) => void) => {
        const wrapped = (...args: unknown[]) => {
          mockProvider.removeListener(event, wrapped)
          callback(...args)
        }
        return mockProvider.on(event, wrapped)
      },

      off: (event: string, callback: (...args: unknown[]) => void) => {
        return mockProvider.removeListener(event, callback)
      },

      removeListener: (event: string, callback: (...args: unknown[]) => void) => {
        if (eventListeners[event]) {
          eventListeners[event] = eventListeners[event].filter(cb => cb !== callback)
        }
        return mockProvider
      },

      removeAllListeners: (event?: string) => {
        if (event) {
          eventListeners[event] = []
        } else {
          Object.keys(eventListeners).forEach(e => { eventListeners[e] = [] })
        }
        return mockProvider
      },

      emit: (event: string, ...args: unknown[]) => {
        if (eventListeners[event]) {
          eventListeners[event].forEach(cb => {
            try { cb(...args) } catch (e) { console.error('[SigningWallet] Event error:', e) }
          })
        }
        return true
      },

      enable: async () => mockProvider.request({ method: 'eth_requestAccounts' }),

      send: (methodOrPayload: string | { method: string; params?: unknown[] }, paramsOrCallback?: unknown[] | ((error: Error | null, response?: unknown) => void)) => {
        if (typeof methodOrPayload === 'string') {
          return mockProvider.request({ method: methodOrPayload, params: paramsOrCallback as unknown[] })
        }
        const callback = paramsOrCallback as (error: Error | null, response?: unknown) => void
        mockProvider.request(methodOrPayload)
          .then(result => callback?.(null, { jsonrpc: '2.0', id: requestId, result }))
          .catch(error => callback?.(error))
      },

      sendAsync: (request: { method: string; params?: unknown[] }, callback: (error: Error | null, response?: { result: unknown }) => void) => {
        mockProvider.request(request)
          .then(result => callback(null, { result }))
          .catch(error => callback(error))
      },
    }

    // @ts-expect-error - Mock ethereum provider
    window.ethereum = mockProvider
    // @ts-expect-error - Legacy web3 provider
    window.web3 = { currentProvider: mockProvider }

    window.dispatchEvent(new Event('ethereum#initialized'))
    console.log('[SigningWallet] Injected signing wallet for:', testAddress)
  }, { rpcUrl, privateKey: HARDHAT_PRIVATE_KEY, testAddress: TEST_ADDRESS })
}

/**
 * Connect wallet by clicking UI buttons
 */
export async function connectWallet(page: Page): Promise<void> {
  const connectButton = page.locator('button:has-text("Connect Wallet"), button:has-text("Connect")')

  if (await connectButton.count() > 0) {
    await connectButton.first().click()
    await page.waitForTimeout(1000)

    // If RainbowKit modal appears, click OKX option
    const okxOption = page.locator('button:has-text("OKX")')
    if (await okxOption.count() > 0) {
      await okxOption.first().click()
      await page.waitForTimeout(2000)
    }

    // Close modal if still open
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
  }
}
