/**
 * Test Helper Functions for Sepolia E2E Tests
 */

import { type Page, expect } from '@playwright/test'
import { TIMEOUT, ADDRESSES, TEST_ADDRESS } from './constants'

/**
 * Wait for a transaction to be confirmed on Sepolia.
 * Checks for success indicators OR loading state changes in the UI.
 */
export async function waitForTxSuccess(page: Page, timeout = TIMEOUT.TX): Promise<boolean> {
  try {
    await page.waitForFunction(
      () => {
        const body = document.body.innerText.toLowerCase()
        return (
          body.includes('success') ||
          body.includes('confirmed') ||
          body.includes('completed') ||
          body.includes('transaction sent') ||
          body.includes('cooldown') ||
          body.includes('next claim')
        )
      },
      undefined,
      { timeout }
    )
    return true
  } catch {
    return false
  }
}

/**
 * Wait for a transaction button loading state (⏳) to disappear,
 * indicating the transaction has completed (success or failure).
 *
 * Strategy: first wait briefly for loading state to START (button text changes),
 * then wait for loading state to END (button returns to normal).
 * This prevents false-positive early returns when the button hasn't entered loading yet.
 */
export async function waitForTxComplete(
  page: Page,
  buttonText: string,
  timeout = TIMEOUT.TX
): Promise<boolean> {
  const loadingPatterns = [
    '⏳',
    'staking',
    'unstaking',
    'confirming',
    'minting',
    'redeeming',
    'swapping',
    'depositing',
    'withdrawing',
    'approving',
    'claiming',
    'pending',
    'processing',
    'transferring',
  ]

  // Phase 1: Wait up to 10s for the button to enter loading state
  try {
    await page.waitForFunction(
      ({ btnText, patterns }) => {
        const buttons = Array.from(document.querySelectorAll('button'))
        return buttons.some(b => {
          const text = (b.textContent || '').toLowerCase()
          return (
            patterns.some(p => text.includes(p)) ||
            text.includes('⏳') ||
            (text.includes('...') && !text.includes(btnText.toLowerCase()))
          )
        })
      },
      { btnText: buttonText, patterns: loadingPatterns },
      { timeout: 10_000 }
    )
  } catch {
    // Button may never enter loading state (tx not submitted, or very fast)
    // Continue to phase 2 anyway
  }

  // Phase 2: Wait for loading state to disappear (tx completes)
  try {
    await page.waitForFunction(
      ({ patterns }) => {
        const buttons = Array.from(document.querySelectorAll('button'))
        return !buttons.some(b => {
          const text = (b.textContent || '').toLowerCase()
          return text.includes('⏳') || patterns.some(p => text.includes(p) && text.includes('...'))
        })
      },
      { patterns: loadingPatterns },
      { timeout }
    )
    return true
  } catch {
    return false
  }
}

/**
 * Fill an amount input field.
 */
export async function fillInput(page: Page, amount: string, index = 0): Promise<void> {
  const input = page.locator('input[type="number"], input[inputmode="decimal"]').nth(index)
  await input.waitFor({ state: 'visible', timeout: TIMEOUT.READ })
  await input.clear()
  await input.fill(amount)
  await page.waitForTimeout(TIMEOUT.SHORT)
}

/**
 * Click a button by its text content.
 */
export async function clickButton(
  page: Page,
  text: string,
  options?: { timeout?: number; force?: boolean }
): Promise<void> {
  const button = page.locator(`button:has-text("${text}")`).first()
  await button.waitFor({ state: 'visible', timeout: options?.timeout || TIMEOUT.READ })
  // Wait until button is enabled
  await page.waitForFunction(
    btnText => {
      const btns = Array.from(document.querySelectorAll('button'))
      const btn = btns.find(b => b.textContent?.includes(btnText))
      return btn && !btn.disabled
    },
    text,
    { timeout: options?.timeout || TIMEOUT.READ }
  )
  await button.click({ force: options?.force })
  await page.waitForTimeout(500)
}

/**
 * Navigate to a specific page path using SPA client-side routing.
 * Uses window.history to avoid full page reload (which loses wagmi state).
 */
export async function navigateTo(page: Page, path: string): Promise<void> {
  // Use React Router's navigation by dispatching a popstate event
  await page.evaluate(targetPath => {
    window.history.pushState({}, '', targetPath)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)
  await page.waitForTimeout(TIMEOUT.SHORT)
  // Wait for content to settle
  await page.waitForLoadState('networkidle').catch(() => {})
}

/**
 * Check if a specific text is visible on the page.
 */
export async function hasText(page: Page, text: string): Promise<boolean> {
  return (await page.locator(`text=${text}`).count()) > 0
}

/**
 * Wait for balance to be displayed and return its text.
 */
export async function getBalanceText(page: Page, tokenSymbol: string): Promise<string> {
  const balanceEl = page.locator(`text=/${tokenSymbol}/i`).first()
  if ((await balanceEl.count()) > 0) {
    return await balanceEl.innerText()
  }
  return ''
}

/**
 * Click a tab (e.g., Mint/Redeem toggle, Deposit/Withdraw).
 */
export async function clickTab(page: Page, tabText: string): Promise<void> {
  const tab = page.locator(`button:has-text("${tabText}")`).first()
  if ((await tab.count()) > 0) {
    await tab.click()
    await page.waitForTimeout(TIMEOUT.SHORT)
  }
}

/**
 * Capture dialog messages for assertion.
 * Returns a function to get collected messages.
 */
export function captureDialogs(page: Page): () => string[] {
  const messages: string[] = []
  page.on('dialog', async dialog => {
    messages.push(dialog.message())
    await dialog.accept()
  })
  return () => messages
}

/**
 * Wait for an element containing text to appear.
 */
export async function waitForText(
  page: Page,
  text: string | RegExp,
  timeout = TIMEOUT.READ
): Promise<boolean> {
  try {
    if (typeof text === 'string') {
      await page.locator(`text=${text}`).first().waitFor({ state: 'visible', timeout })
    } else {
      await page
        .locator(`text=/${text.source}/${text.flags}`)
        .first()
        .waitFor({ state: 'visible', timeout })
    }
    return true
  } catch {
    return false
  }
}

/**
 * Read on-chain ERC20 balance via the wallet bridge.
 * Returns the raw balance as bigint.
 */
export async function readBalance(
  page: Page,
  tokenAddr: string,
  owner: string = TEST_ADDRESS
): Promise<bigint> {
  const result = await page.evaluate(
    async ({ token, ownerAddr }) => {
      return await (window as any).__e2e_readERC20Balance(token, ownerAddr)
    },
    { token: tokenAddr, ownerAddr: owner }
  )
  return BigInt(result)
}

/**
 * Read on-chain balance with polling until it differs from a reference value.
 * Sepolia RPC may return stale state right after tx confirmation.
 */
export async function readBalanceUntilChanged(
  page: Page,
  tokenAddr: string,
  referenceBalance: bigint,
  owner: string = TEST_ADDRESS,
  maxRetries = 6,
  intervalMs = 3000
): Promise<bigint> {
  for (let i = 0; i < maxRetries; i++) {
    const balance = await readBalance(page, tokenAddr, owner)
    if (balance !== referenceBalance) return balance
    if (i < maxRetries - 1) await page.waitForTimeout(intervalMs)
  }
  return await readBalance(page, tokenAddr, owner)
}

/**
 * Assert that on-chain ERC20 balance increased after an operation.
 * Polls up to ~18s for Sepolia state to settle.
 */
export async function expectBalanceIncrease(
  page: Page,
  tokenAddr: string,
  beforeBalance: bigint,
  owner: string = TEST_ADDRESS
): Promise<void> {
  const afterBalance = await readBalanceUntilChanged(page, tokenAddr, beforeBalance, owner)
  expect(afterBalance).toBeGreaterThan(beforeBalance)
}

/**
 * Assert that on-chain ERC20 balance decreased after an operation.
 * Polls up to ~18s for Sepolia state to settle.
 */
export async function expectBalanceDecrease(
  page: Page,
  tokenAddr: string,
  beforeBalance: bigint,
  owner: string = TEST_ADDRESS
): Promise<void> {
  const afterBalance = await readBalanceUntilChanged(page, tokenAddr, beforeBalance, owner)
  expect(afterBalance).toBeLessThan(beforeBalance)
}
