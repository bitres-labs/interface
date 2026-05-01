/**
 * Sepolia Provider - Browser-side mock EIP-1193 provider
 *
 * Injected via page.addInitScript(). Routes signing operations
 * to Node.js bridge functions exposed via page.exposeFunction().
 * Read-only RPC calls go directly to the Sepolia RPC endpoint.
 */

import { type Page } from '@playwright/test'
import { SEPOLIA_CHAIN_ID_HEX, TEST_ADDRESS, SEPOLIA_RPC_URL } from './constants'

/**
 * Inject the Sepolia mock provider into the page.
 * Must be called AFTER setupBridge() and BEFORE page.goto().
 */
export async function injectSepoliaProvider(page: Page): Promise<void> {
  await page.addInitScript(
    ({ chainIdHex, testAddress, rpcUrl }) => {
      const TEST_ADDR = testAddress.toLowerCase()
      const requestId = 1
      let isConnected = false

      // Event listeners
      const eventListeners: Record<string, Array<(...args: unknown[]) => void>> = {}

      const mockProvider = {
        isMetaMask: true,
        _metamask: {
          isUnlocked: () => Promise.resolve(true),
        },

        networkVersion: String(parseInt(chainIdHex, 16)),
        chainId: chainIdHex,
        selectedAddress: null as string | null,

        get isConnected() {
          return isConnected
        },

        request: async ({ method, params }: { method: string; params?: unknown[] }) => {
          console.log('[SepoliaProvider] Request:', method)

          switch (method) {
            // ---- Account ----
            case 'eth_accounts':
              return [TEST_ADDR] // Always return address (pre-connected)

            case 'eth_requestAccounts': {
              isConnected = true
              mockProvider.selectedAddress = TEST_ADDR
              setTimeout(() => {
                mockProvider.emit('connect', { chainId: chainIdHex })
                mockProvider.emit('accountsChanged', [TEST_ADDR])
              }, 50)
              return [TEST_ADDR]
            }

            // ---- Chain ----
            case 'eth_chainId':
              return chainIdHex

            case 'net_version':
              return String(parseInt(chainIdHex, 16))

            case 'wallet_switchEthereumChain': {
              const target = (params as [{ chainId: string }])?.[0]?.chainId
              if (target === chainIdHex) return null
              const err = new Error('Unrecognized chain ID')
              ;(err as any).code = 4902
              throw err
            }

            case 'wallet_addEthereumChain':
              return null

            // ---- Permissions ----
            case 'wallet_getPermissions':
              return isConnected ? [{ parentCapability: 'eth_accounts' }] : []

            case 'wallet_requestPermissions':
              isConnected = true
              return [{ parentCapability: 'eth_accounts' }]

            // ---- Signing (via Node bridge) ----
            case 'eth_sendTransaction': {
              const txParams = (params as unknown[])?.[0] as Record<string, string>
              if (txParams && !txParams.from) txParams.from = TEST_ADDR
              console.log('[SepoliaProvider] sendTransaction via bridge')
              const hash = await (window as any).__e2e_sendTransaction(JSON.stringify(txParams))
              console.log('[SepoliaProvider] TX hash:', hash)
              return hash
            }

            case 'eth_signTypedData':
            case 'eth_signTypedData_v3':
            case 'eth_signTypedData_v4': {
              const [_addr, typedDataStr] = params as [string, string]
              console.log('[SepoliaProvider] signTypedData via bridge')
              const sig = await (window as any).__e2e_signTypedData(
                typeof typedDataStr === 'string' ? typedDataStr : JSON.stringify(typedDataStr)
              )
              return sig
            }

            case 'personal_sign':
            case 'eth_sign': {
              const [message] = params as [string, string]
              return await (window as any).__e2e_personalSign(message)
            }

            // ---- Read-only (via RPC) ----
            case 'eth_getBalance':
            case 'eth_blockNumber':
            case 'eth_getBlockByNumber':
            case 'eth_call':
            case 'eth_estimateGas':
            case 'eth_gasPrice':
            case 'eth_maxPriorityFeePerGas':
            case 'eth_feeHistory':
            case 'eth_getTransactionCount':
            case 'eth_getTransactionReceipt':
            case 'eth_getTransactionByHash':
            case 'eth_getLogs':
            case 'eth_getCode':
              return await (window as any).__e2e_rpcCall(method, JSON.stringify(params || []))

            case 'wallet_watchAsset':
              return true

            default:
              console.log('[SepoliaProvider] Forwarding to RPC:', method)
              try {
                return await (window as any).__e2e_rpcCall(method, JSON.stringify(params || []))
              } catch {
                return null
              }
          }
        },

        // ---- EIP-1193 Event System ----
        on: (event: string, cb: (...args: unknown[]) => void) => {
          if (!eventListeners[event]) eventListeners[event] = []
          eventListeners[event].push(cb)
          return mockProvider
        },

        once: (event: string, cb: (...args: unknown[]) => void) => {
          const wrapped = (...args: unknown[]) => {
            mockProvider.removeListener(event, wrapped)
            cb(...args)
          }
          return mockProvider.on(event, wrapped)
        },

        off: (event: string, cb: (...args: unknown[]) => void) => {
          return mockProvider.removeListener(event, cb)
        },

        removeListener: (event: string, cb: (...args: unknown[]) => void) => {
          if (eventListeners[event]) {
            eventListeners[event] = eventListeners[event].filter(fn => fn !== cb)
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
          if (eventListeners[event]) {
            eventListeners[event].forEach(cb => {
              try {
                cb(...args)
              } catch (e) {
                console.error('[SepoliaProvider] Event error:', e)
              }
            })
          }
          return true
        },

        // ---- Legacy ----
        enable: async () => mockProvider.request({ method: 'eth_requestAccounts' }),

        send: (
          methodOrPayload: string | { method: string; params?: unknown[] },
          paramsOrCb?: unknown[] | ((err: Error | null, res?: unknown) => void)
        ) => {
          if (typeof methodOrPayload === 'string') {
            return mockProvider.request({
              method: methodOrPayload,
              params: paramsOrCb as unknown[],
            })
          }
          const cb = paramsOrCb as (err: Error | null, res?: unknown) => void
          mockProvider
            .request(methodOrPayload)
            .then(result => cb?.(null, { jsonrpc: '2.0', id: requestId, result }))
            .catch(err => cb?.(err))
        },

        sendAsync: (
          req: { method: string; params?: unknown[] },
          cb: (err: Error | null, res?: { result: unknown }) => void
        ) => {
          mockProvider
            .request(req)
            .then(result => cb(null, { result }))
            .catch(err => cb(err))
        },
      }

      // Install provider as window.ethereum (MetaMask-compatible)
      // @ts-expect-error - Mock ethereum provider
      window.ethereum = mockProvider
      // @ts-expect-error - Legacy web3 provider
      window.web3 = { currentProvider: mockProvider }

      // EIP-6963: Announce provider
      const info = {
        uuid: 'e2e-sepolia-mock',
        name: 'MetaMask',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
        rdns: 'io.metamask',
      }
      const announceEvent = new CustomEvent('eip6963:announceProvider', {
        detail: Object.freeze({ info, provider: mockProvider }),
      })
      window.dispatchEvent(announceEvent)

      // Re-announce on request
      window.addEventListener('eip6963:requestProvider', () => {
        window.dispatchEvent(announceEvent)
      })

      // Legacy event
      window.dispatchEvent(new Event('ethereum#initialized'))

      console.log('[SepoliaProvider] Injected Sepolia mock provider for:', TEST_ADDR)
    },
    {
      chainIdHex: SEPOLIA_CHAIN_ID_HEX,
      testAddress: TEST_ADDRESS,
      rpcUrl: SEPOLIA_RPC_URL,
    }
  )
}
