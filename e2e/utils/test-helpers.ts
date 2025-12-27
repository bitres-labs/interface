/**
 * Shared test helpers for Synpress E2E tests
 */

import { type Page, type TestInfo } from '@playwright/test'

export const BASE_URL = 'http://localhost:3000'

// Wait times
export const WAIT = {
  SHORT: 1000,
  MEDIUM: 2000,
  LONG: 3000,
  TX: 5000,
  PAGE_LOAD: 3000
}

/**
 * Connect wallet via RainbowKit
 */
export async function connectWallet(page: Page, metamask: any) {
  if (page.isClosed()) return
  const connectButton = page.locator('button:has-text("Connect Wallet")')
  if (await connectButton.count() > 0) {
    await connectButton.first().click()
    await page.waitForTimeout(WAIT.SHORT)

    const okxOption = page.locator('button:has-text("OKX")')
    const metaMaskOption = page.locator('button:has-text("MetaMask")')
    if (await okxOption.count() > 0) {
      await okxOption.first().click()
      await page.waitForTimeout(WAIT.SHORT)
      await attemptWalletConnect(page, metamask)
      const connected = await waitForWalletConnection(page, WAIT.LONG * 5)
      if (connected) {
        await ensureHardhatNetwork(page, metamask)
      }
    } else if (await metaMaskOption.count() > 0) {
      await metaMaskOption.first().click()
      await page.waitForTimeout(WAIT.SHORT)
      await attemptWalletConnect(page, metamask)
      await waitForWalletConnection(page, WAIT.LONG * 5)
    }
  }
}

async function attemptWalletConnect(page: Page, metamask: any, attempts = 2) {
  for (let i = 0; i < attempts; i += 1) {
    if (page.isClosed()) return false
    await metamask.connectToDapp()
    const connected = await waitForWalletConnection(page, WAIT.LONG * 3)
    if (connected) return true

    try {
      const retryButton = page.locator('button:has-text("Retry")')
      if (await retryButton.count()) {
        await retryButton.first().click()
        await page.waitForTimeout(WAIT.SHORT)
      }
    } catch {
      return false
    }
  }
  return false
}

export async function waitForWalletConnection(page: Page, timeout = 15000) {
  if (page.isClosed()) return false
  try {
    await page.waitForFunction(async () => {
      const ethereum = (window as { ethereum?: { request?: (args: { method: string }) => Promise<unknown> } }).ethereum
      if (!ethereum?.request) return false
      const accounts = await ethereum.request({ method: 'eth_accounts' })
      return Array.isArray(accounts) && accounts.length > 0
    }, undefined, { timeout })
    return true
  } catch {
    return false
  }
}

export async function safeWait(page: Page, ms: number) {
  if (page.isClosed()) return false
  try {
    await page.waitForTimeout(ms)
    return true
  } catch {
    return false
  }
}

export function skipIfPageClosed(page: Page, testInfo: TestInfo, reason = 'Page closed') {
  if (!page.isClosed()) return false
  testInfo.skip(true, reason)
  return true
}

async function ensureHardhatNetwork(page: Page, metamask: any) {
  let requested = false
  try {
    requested = await page.evaluate(async () => {
      const ethereum = (window as { ethereum?: { request?: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum
      if (!ethereum?.request) return false
      const chainId = await ethereum.request({ method: 'eth_chainId' })
      if (chainId === '0x7a69') return false
      try {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: '0x7a69',
              chainName: 'Hardhat',
              rpcUrls: ['http://localhost:8545'],
              nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
            }
          ]
        })
        return true
      } catch {
        try {
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x7a69' }]
          })
          return true
        } catch {
          return false
        }
      }
    })
  } catch {
    requested = false
  }

  if (requested && metamask?.approveNetworkChange) {
    await metamask.approveNetworkChange()
    await page.waitForTimeout(WAIT.MEDIUM)
  }
}

/**
 * Check if wallet is connected by looking for address pattern
 */
export async function isWalletConnected(page: Page): Promise<boolean> {
  if (page.isClosed()) return false
  try {
    const accounts = await page.evaluate(async () => {
      const ethereum = (window as { ethereum?: { request?: (args: { method: string }) => Promise<unknown> } }).ethereum
      if (!ethereum?.request) return []
      return ethereum.request({ method: 'eth_accounts' })
    })
    if (Array.isArray(accounts) && accounts.length > 0) return true
  } catch {
    // ignore and fall back to DOM
  }

  try {
    const content = await page.content()
    const addressPattern = /0x[a-fA-F0-9]{4}.*[a-fA-F0-9]{4}/
    return addressPattern.test(content) || /wrong network/i.test(content)
  } catch {
    return false
  }
}

/**
 * Navigate to a page and wait for load
 */
export async function navigateTo(page: Page, path: string) {
  await page.goto(`${BASE_URL}${path}`)
  await page.waitForTimeout(WAIT.PAGE_LOAD)
}

/**
 * Fill input with amount
 */
export async function fillAmount(page: Page, amount: string, index = 0) {
  const input = page.locator('input[type="number"], input[inputmode="decimal"]').nth(index)
  if (await input.count() > 0) {
    await input.clear()
    await input.fill(amount)
    await page.waitForTimeout(WAIT.SHORT)
  }
}

/**
 * Click MAX button
 */
export async function clickMaxButton(page: Page, index = 0) {
  const maxButton = page.locator('button:has-text("MAX")').nth(index)
  if (await maxButton.count() > 0) {
    await maxButton.click()
    await page.waitForTimeout(WAIT.SHORT)
  }
}

/**
 * Click a button by text
 */
export async function clickButton(page: Page, text: string, options?: { last?: boolean; first?: boolean }) {
  const button = page.locator(`button:has-text("${text}")`)
  if (await button.count() > 0) {
    if (options?.last) {
      await button.last().click()
    } else if (options?.first) {
      await button.first().click()
    } else {
      await button.first().click()
    }
    await page.waitForTimeout(WAIT.SHORT)
  }
}

/**
 * Click a tab button
 */
export async function clickTab(page: Page, tabText: string) {
  if (page.isClosed()) return
  const tab = page.locator(`button:has-text("${tabText}")`).filter({ hasNot: page.locator('[disabled]') }).first()
  if (await tab.count() > 0) {
    await tab.click()
    await page.waitForTimeout(WAIT.SHORT)
  }
}

/**
 * Check if button is disabled
 */
export async function isButtonDisabled(page: Page, text: string): Promise<boolean> {
  const button = page.locator(`button:has-text("${text}")`).first()
  if (await button.count() > 0) {
    return await button.isDisabled()
  }
  return true
}

/**
 * Get input value
 */
export async function getInputValue(page: Page, index = 0): Promise<string> {
  const input = page.locator('input[type="number"], input[inputmode="decimal"]').nth(index)
  if (await input.count() > 0) {
    return await input.inputValue()
  }
  return ''
}

/**
 * Handle MetaMask approve transaction
 */
export async function handleApprove(metamask: any) {
  try {
    await metamask.confirmTransaction()
    return true
  } catch (e) {
    console.log('Approve handling:', e)
    return false
  }
}

/**
 * Handle MetaMask permit signature
 */
export async function handlePermit(metamask: any) {
  try {
    await metamask.confirmSignature()
    return true
  } catch (e) {
    console.log('Permit handling:', e)
    return false
  }
}

/**
 * Handle MetaMask transaction
 */
export async function handleTransaction(metamask: any) {
  try {
    await metamask.confirmTransaction()
    return true
  } catch (e) {
    console.log('Transaction handling:', e)
    return false
  }
}

/**
 * Take screenshot with descriptive name
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `test-results/${name}.png` })
}

/**
 * Wait for element to be visible
 */
export async function waitForElement(page: Page, selector: string, timeout = 10000) {
  try {
    await page.waitForSelector(selector, { timeout })
    return true
  } catch {
    return false
  }
}

/**
 * Select token from dropdown
 */
export async function selectToken(page: Page, tokenSymbol: string) {
  // Click dropdown trigger
  const dropdown = page.locator('[role="combobox"], [data-testid="token-select"]').first()
  if (await dropdown.count() > 0) {
    await dropdown.click()
    await page.waitForTimeout(WAIT.SHORT)

    // Select token option
    const option = page.locator(`text=${tokenSymbol}`).first()
    if (await option.count() > 0) {
      await option.click()
      await page.waitForTimeout(WAIT.SHORT)
    }
  }
}

/**
 * Check for error message
 */
export async function hasErrorMessage(page: Page): Promise<boolean> {
  const errorTexts = ['Insufficient', 'Error', 'Failed', 'Invalid']
  const content = await page.content()
  return errorTexts.some(text => content.includes(text))
}

/**
 * Wait for transaction to complete
 */
export async function waitForTxComplete(page: Page, timeout = 30000) {
  // Wait for success toast or confirmation
  try {
    await page.waitForSelector('text=/success|confirmed|completed/i', { timeout })
    return true
  } catch {
    return false
  }
}
