/**
 * Shared test helpers for Synpress E2E tests
 */

import { type Page } from '@playwright/test'

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
  const connectButton = page.locator('button:has-text("Connect Wallet")')
  if (await connectButton.count() > 0) {
    await connectButton.first().click()
    await page.waitForTimeout(WAIT.SHORT)

    const metaMaskOption = page.locator('button:has-text("MetaMask")')
    if (await metaMaskOption.count() > 0) {
      await metaMaskOption.first().click()
      await page.waitForTimeout(WAIT.SHORT)
      await metamask.connectToDapp()
      await page.waitForTimeout(WAIT.MEDIUM)
    }
  }
}

/**
 * Check if wallet is connected by looking for address pattern
 */
export async function isWalletConnected(page: Page): Promise<boolean> {
  const content = await page.content()
  const addressPattern = /0x[a-fA-F0-9]{4}.*[a-fA-F0-9]{4}/
  return addressPattern.test(content)
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
  const tab = page.locator(`button:has-text("${tabText}")`).first()
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
