/**
 * Enhanced Mock Wallet for E2E Testing
 *
 * Injects a mock ethereum provider that forwards transactions to Hardhat node.
 * Supports RainbowKit connection flow and automatic transaction signing.
 * Uses Hardhat account #0 for signing transactions.
 */

import { Page } from '@playwright/test'

// User's connected MetaMask address (has BTD tokens from init)
export const TEST_ADDRESS = '0x8F78bE5c6b41C2d7634d25C7db22b26409671ca9'
// Hardhat account #0 (for reference)
export const HARDHAT_ACCOUNT_0 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'

/**
 * Inject a mock wallet that can execute real transactions
 * Enhanced to work with RainbowKit
 */
export async function injectMockWallet(page: Page, rpcUrl = 'http://localhost:8545'): Promise<void> {
  await page.addInitScript((rpcUrl) => {
    const TEST_ADDRESS = '0x8F78bE5c6b41C2d7634d25C7db22b26409671ca9'
    let requestId = 1
    let isConnected = false

    // Helper to make RPC calls
    async function rpcCall(method: string, params: unknown[] = []) {
      try {
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
          throw new Error(data.error.message)
        }
        return data.result
      } catch (e) {
        console.log('[MockWallet] RPC Error:', e)
        throw e
      }
    }

    // Event listeners storage
    const eventListeners: Record<string, Array<(...args: unknown[]) => void>> = {}

    // Mock ethereum provider - EIP-1193 compliant
    const mockProvider = {
      // MetaMask identification
      isMetaMask: true,
      _metamask: {
        isUnlocked: () => Promise.resolve(true),
        requestBatch: async (requests: Array<{ method: string; params?: unknown[] }>) => {
          return Promise.all(requests.map(req => mockProvider.request(req)))
        },
      },

      // Network state
      networkVersion: '31337',
      chainId: '0x7a69', // 31337 in hex
      selectedAddress: null as string | null,

      // Connection state getter
      get isConnected() {
        return isConnected
      },

      // Main request handler
      request: async ({ method, params }: { method: string; params?: unknown[] }) => {
        console.log('[MockWallet] Request:', method, params ? JSON.stringify(params).slice(0, 100) : '')

        switch (method) {
          case 'eth_accounts':
            return isConnected ? [TEST_ADDRESS] : []

          case 'eth_requestAccounts': {
            // Simulate connection approval
            isConnected = true
            mockProvider.selectedAddress = TEST_ADDRESS

            // Emit events after a short delay (simulates user approval)
            setTimeout(() => {
              mockProvider.emit('connect', { chainId: '0x7a69' })
              mockProvider.emit('accountsChanged', [TEST_ADDRESS])
            }, 50)

            return [TEST_ADDRESS]
          }

          case 'eth_chainId':
            return '0x7a69'

          case 'net_version':
            return '31337'

          case 'wallet_switchEthereumChain': {
            const targetChainId = (params as [{chainId: string}])?.[0]?.chainId
            if (targetChainId === '0x7a69') {
              return null // Success
            }
            // Throw error for unknown chains
            const error = new Error('Unrecognized chain ID')
            ;(error as any).code = 4902
            throw error
          }

          case 'wallet_addEthereumChain':
            // Accept any chain addition
            return null

          case 'wallet_getPermissions':
            return isConnected ? [{ parentCapability: 'eth_accounts' }] : []

          case 'wallet_requestPermissions':
            isConnected = true
            return [{ parentCapability: 'eth_accounts' }]

          case 'eth_getBalance':
            return await rpcCall('eth_getBalance', params || [])

          case 'eth_blockNumber':
            return await rpcCall('eth_blockNumber')

          case 'eth_getBlockByNumber':
            return await rpcCall('eth_getBlockByNumber', params || [])

          case 'eth_call':
            return await rpcCall('eth_call', params || [])

          case 'eth_estimateGas':
            return await rpcCall('eth_estimateGas', params || [])

          case 'eth_gasPrice':
            return await rpcCall('eth_gasPrice')

          case 'eth_maxPriorityFeePerGas':
            return await rpcCall('eth_maxPriorityFeePerGas')

          case 'eth_feeHistory':
            return await rpcCall('eth_feeHistory', params || [])

          case 'eth_getTransactionCount':
            return await rpcCall('eth_getTransactionCount', params || [])

          case 'eth_sendTransaction': {
            // Forward transaction to Hardhat node
            const txParams = (params as unknown[])?.[0] as Record<string, string>
            if (txParams && !txParams.from) {
              txParams.from = TEST_ADDRESS
            }
            console.log('[MockWallet] Sending transaction:', JSON.stringify(txParams).slice(0, 200))
            const txHash = await rpcCall('eth_sendTransaction', [txParams])
            console.log('[MockWallet] Transaction hash:', txHash)
            return txHash
          }

          case 'eth_getTransactionReceipt':
            return await rpcCall('eth_getTransactionReceipt', params || [])

          case 'eth_getTransactionByHash':
            return await rpcCall('eth_getTransactionByHash', params || [])

          case 'eth_getLogs':
            return await rpcCall('eth_getLogs', params || [])

          case 'eth_getCode':
            return await rpcCall('eth_getCode', params || [])

          case 'personal_sign':
          case 'eth_sign': {
            // Use Hardhat's eth_sign for known accounts
            const [message, address] = params as [string, string]
            try {
              return await rpcCall('eth_sign', [address || TEST_ADDRESS, message])
            } catch {
              // Return mock signature if eth_sign fails
              return '0x' + 'ab'.repeat(65)
            }
          }

          case 'eth_signTypedData':
          case 'eth_signTypedData_v3':
          case 'eth_signTypedData_v4': {
            // Return a mock signature for typed data
            console.log('[MockWallet] signTypedData - returning mock signature')
            return '0x' + 'ab'.repeat(65)
          }

          case 'wallet_watchAsset':
            return true

          case 'wallet_getSnaps':
            return {}

          case 'wallet_invokeSnap':
            throw new Error('Snaps not supported')

          default:
            console.log('[MockWallet] Forwarding to RPC:', method)
            try {
              return await rpcCall(method, params || [])
            } catch (e) {
              console.log('[MockWallet] RPC call failed:', method, e)
              return null
            }
        }
      },

      // Event handling
      on: (event: string, callback: (...args: unknown[]) => void) => {
        if (!eventListeners[event]) {
          eventListeners[event] = []
        }
        eventListeners[event].push(callback)
        return mockProvider
      },

      once: (event: string, callback: (...args: unknown[]) => void) => {
        const wrappedCallback = (...args: unknown[]) => {
          mockProvider.removeListener(event, wrappedCallback)
          callback(...args)
        }
        return mockProvider.on(event, wrappedCallback)
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
          Object.keys(eventListeners).forEach(e => {
            eventListeners[e] = []
          })
        }
        return mockProvider
      },

      emit: (event: string, ...args: unknown[]) => {
        console.log('[MockWallet] emit:', event, args)
        if (eventListeners[event]) {
          eventListeners[event].forEach(cb => {
            try {
              cb(...args)
            } catch (e) {
              console.error('[MockWallet] Event callback error:', e)
            }
          })
        }
        return true
      },

      // Legacy methods
      enable: async () => {
        return mockProvider.request({ method: 'eth_requestAccounts' })
      },

      send: (methodOrPayload: string | { method: string; params?: unknown[] }, paramsOrCallback?: unknown[] | ((error: Error | null, response?: unknown) => void)) => {
        if (typeof methodOrPayload === 'string') {
          return mockProvider.request({ method: methodOrPayload, params: paramsOrCallback as unknown[] })
        }
        // Legacy send with callback
        const callback = paramsOrCallback as (error: Error | null, response?: unknown) => void
        mockProvider.request(methodOrPayload)
          .then(result => callback?.(null, { jsonrpc: '2.0', id: requestId, result }))
          .catch(error => callback?.(error))
      },

      sendAsync: (
        request: { method: string; params?: unknown[] },
        callback: (error: Error | null, response?: { result: unknown }) => void
      ) => {
        mockProvider.request(request)
          .then(result => callback(null, { result }))
          .catch(error => callback(error))
      },
    }

    // Set up provider
    // @ts-expect-error - Mock ethereum provider
    window.ethereum = mockProvider

    // Also expose as window.web3 for legacy dApps
    // @ts-expect-error - Legacy web3 provider
    window.web3 = { currentProvider: mockProvider }

    // Announce provider (EIP-6963)
    window.dispatchEvent(new Event('ethereum#initialized'))

    console.log('[MockWallet] Injected enhanced mock wallet for address:', TEST_ADDRESS)
  }, rpcUrl)
}

/**
 * Wait for wallet connection to be established
 */
export async function waitForWalletConnection(page: Page, timeout = 10000): Promise<boolean> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const isConnected = await page.evaluate(() => {
      // Check if address is displayed (shortened format like 0xf39F...2266)
      const addressPattern = /0x[a-fA-F0-9]{4}\.{0,3}[a-fA-F0-9]{4}/
      return addressPattern.test(document.body.innerText)
    })

    if (isConnected) {
      return true
    }

    await page.waitForTimeout(500)
  }

  return false
}

/**
 * Connect wallet by clicking the connect button
 */
export async function connectWallet(page: Page): Promise<void> {
  // Find and click connect button
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

    // Wait for modal to close or close it manually
    const closeButton = page.locator('[data-rk] button[aria-label="Close"]').or(page.locator('[data-rk] svg').filter({ hasText: '' }).locator('..').filter({ has: page.locator('path') }))

    // Try clicking outside the modal to close it
    const modalBackdrop = page.locator('[data-rk]').locator('..').locator('div').first()

    // Wait a bit for connection to complete
    await page.waitForTimeout(3000)

    // If modal is still open, try pressing Escape
    const modal = page.locator('[data-rk][role="dialog"]')
    if (await modal.count() > 0) {
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
    }
  }
}

/**
 * Close any open RainbowKit modals
 */
export async function closeRainbowKitModal(page: Page): Promise<void> {
  const modal = page.locator('[data-rk][role="dialog"]')
  if (await modal.count() > 0) {
    // Try Escape key first
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // If still open, try clicking the X button
    if (await modal.count() > 0) {
      const closeBtn = modal.locator('button').first()
      if (await closeBtn.count() > 0) {
        await closeBtn.click({ force: true })
        await page.waitForTimeout(500)
      }
    }
  }
}
