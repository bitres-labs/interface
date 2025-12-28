/**
 * Sepolia Debug Test - Check page state without wallet
 */
import { test, expect } from '@playwright/test'

const BASE_URL = 'https://bitres.org'

test.describe('Sepolia Debug', () => {
  test('check mint page console errors', async ({ page }) => {
    const consoleErrors: string[] = []
    const consoleWarnings: string[] = []
    const networkErrors: string[] = []

    page.on('console', msg => {
      const text = msg.text()
      if (msg.type() === 'error') {
        consoleErrors.push(text)
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(text)
      }
    })

    page.on('requestfailed', request => {
      networkErrors.push(`${request.url()} - ${request.failure()?.errorText}`)
    })

    // Navigate
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    // Click Mint tab
    const mintTab = page.locator('button:has-text("Mint")').first()
    await mintTab.click()
    await page.waitForTimeout(2000)

    console.log('\n=== Console Errors ===')
    consoleErrors.forEach(err => console.log(err.slice(0, 300)))

    console.log('\n=== Console Warnings ===')
    consoleWarnings.slice(0, 10).forEach(warn => console.log(warn.slice(0, 200)))

    console.log('\n=== Network Errors ===')
    networkErrors.forEach(err => console.log(err))

    // Take screenshot
    await page.screenshot({ path: 'test-results/sepolia-debug-mint.png', fullPage: true })

    // Check page content
    const content = await page.content()

    // Look for error messages in UI
    const errorElements = await page.locator('[class*="error"], [class*="Error"], text=/error/i').all()
    console.log('\n=== UI Error Elements ===')
    for (const el of errorElements.slice(0, 5)) {
      const text = await el.textContent()
      if (text) console.log(text.slice(0, 200))
    }

    // Check for price display
    const hasPrice = content.includes('$') && (content.includes('87') || content.includes('BTC'))
    console.log('\n=== Price Info ===')
    console.log('Has price display:', hasPrice)

    // Check button state
    const mintButton = page.locator('button:has-text("Mint BTD"), button:has-text("Connect Wallet")').last()
    const buttonText = await mintButton.textContent()
    const buttonDisabled = await mintButton.isDisabled()
    console.log('Button text:', buttonText)
    console.log('Button disabled:', buttonDisabled)
  })

  test('check contract call simulation', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')

    // Intercept RPC calls
    const rpcCalls: { method: string; params: unknown; error?: string }[] = []

    await page.route('**/*', async route => {
      const request = route.request()

      if (request.method() === 'POST' && request.url().includes('infura') || request.url().includes('sepolia')) {
        try {
          const postData = request.postDataJSON()
          if (postData?.method) {
            rpcCalls.push({ method: postData.method, params: postData.params })
          }
        } catch {}
      }

      await route.continue()
    })

    // Wait for initial data load
    await page.waitForTimeout(5000)

    console.log('\n=== RPC Calls ===')
    rpcCalls.forEach(call => {
      console.log(`${call.method}: ${JSON.stringify(call.params).slice(0, 100)}`)
    })

    // Check for eth_call failures
    const failedCalls = rpcCalls.filter(c => c.error)
    if (failedCalls.length > 0) {
      console.log('\n=== Failed RPC Calls ===')
      failedCalls.forEach(call => console.log(call))
    }
  })
})
