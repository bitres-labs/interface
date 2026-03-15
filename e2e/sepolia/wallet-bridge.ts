/**
 * Wallet Bridge - Node.js side
 *
 * Creates viem WalletClient and PublicClient, then exposes signing
 * functions to the browser via page.exposeFunction().
 *
 * Browser-side provider (sepolia-provider.ts) calls these bridge
 * functions for real Sepolia transaction signing.
 */

import { type Page } from '@playwright/test'
import { createWalletClient, createPublicClient, http, parseTransaction } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { SEPOLIA_RPC_URL, TEST_PRIVATE_KEY } from './constants'

function getAccount() {
  if (!TEST_PRIVATE_KEY) {
    throw new Error('TEST_PRIVATE_KEY (OKX_PRIVATE_KEY) not set in .env.local')
  }
  return privateKeyToAccount(TEST_PRIVATE_KEY as `0x${string}`)
}

function getWalletClient() {
  return createWalletClient({
    account: getAccount(),
    chain: sepolia,
    transport: http(SEPOLIA_RPC_URL),
  })
}

function getPublicClient() {
  return createPublicClient({
    chain: sepolia,
    transport: http(SEPOLIA_RPC_URL),
  })
}

/**
 * Expose Node.js signing functions to the browser page.
 * Must be called BEFORE page.goto() or addInitScript.
 */
export async function setupBridge(page: Page): Promise<void> {
  const walletClient = getWalletClient()
  const publicClient = getPublicClient()
  const account = getAccount()

  // Bridge: send a real transaction on Sepolia
  await page.exposeFunction('__e2e_sendTransaction', async (txJSON: string) => {
    const tx = JSON.parse(txJSON)
    const hash = await walletClient.sendTransaction({
      to: tx.to as `0x${string}`,
      data: tx.data as `0x${string}` | undefined,
      value: tx.value ? BigInt(tx.value) : undefined,
      gas: tx.gas ? BigInt(tx.gas) : undefined,
      maxFeePerGas: tx.maxFeePerGas ? BigInt(tx.maxFeePerGas) : undefined,
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? BigInt(tx.maxPriorityFeePerGas) : undefined,
    })
    return hash
  })

  // Bridge: sign EIP-712 typed data
  await page.exposeFunction('__e2e_signTypedData', async (dataJSON: string) => {
    const data = JSON.parse(dataJSON)
    // Parse the typed data - handle both string and object forms
    const typedData = typeof data === 'string' ? JSON.parse(data) : data
    const signature = await walletClient.signTypedData({
      domain: typedData.domain,
      types: typedData.types,
      primaryType: typedData.primaryType,
      message: typedData.message,
    })
    return signature
  })

  // Bridge: get ETH balance
  await page.exposeFunction('__e2e_getBalance', async (address: string) => {
    const balance = await publicClient.getBalance({
      address: address as `0x${string}`,
    })
    return '0x' + balance.toString(16)
  })

  // Bridge: generic JSON-RPC call
  await page.exposeFunction('__e2e_rpcCall', async (method: string, paramsJSON: string) => {
    const params = JSON.parse(paramsJSON)
    const response = await fetch(SEPOLIA_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
        id: Date.now(),
      }),
    })
    const result = await response.json()
    if (result.error) {
      throw new Error(result.error.message)
    }
    return result.result
  })

  // Bridge: personal_sign
  await page.exposeFunction('__e2e_personalSign', async (message: string) => {
    const signature = await account.signMessage({
      message: { raw: message as `0x${string}` },
    })
    return signature
  })
}
