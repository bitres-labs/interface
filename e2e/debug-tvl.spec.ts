/**
 * Debug TVL - Check Farm page TVL calculation
 */
import { test, expect } from '@playwright/test'

const BASE_URL = 'https://bitres.org'

test.describe('Debug TVL', () => {
  test('check farm page TVL console logs', async ({ page }) => {
    const consoleLogs: { type: string; text: string }[] = []

    // Capture all console messages
    page.on('console', msg => {
      const text = msg.text()
      consoleLogs.push({ type: msg.type(), text })
    })

    // Navigate to site
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    // Click Farm tab
    const farmTab = page.locator('a[href="/farm"], button:has-text("Farm")').first()
    await farmTab.click()
    await page.waitForTimeout(5000)

    // Print debug logs
    console.log('\n========== DEBUG LOGS ==========\n')

    // Filter for our debug logs
    const tokenPrices = consoleLogs.filter(l => l.text.includes('[Token Prices]'))
    const poolInfo = consoleLogs.filter(l => l.text.includes('[Pool Info'))
    const lpPrices = consoleLogs.filter(l => l.text.includes('[LP Price]'))
    const tvlCalc = consoleLogs.filter(l => l.text.includes('[Farm Pool'))

    console.log('=== Token Prices ===')
    tokenPrices.forEach(l => console.log(l.text))

    console.log('\n=== Pool Info ===')
    poolInfo.forEach(l => console.log(l.text))

    console.log('\n=== LP Prices ===')
    lpPrices.forEach(l => console.log(l.text))

    console.log('\n=== TVL Calculation ===')
    tvlCalc.forEach(l => console.log(l.text))

    // Check for errors
    const errors = consoleLogs.filter(l => l.type === 'error')
    if (errors.length > 0) {
      console.log('\n=== Errors ===')
      errors.forEach(l => console.log(l.text.slice(0, 500)))
    }

    // Take screenshot
    await page.screenshot({ path: 'test-results/debug-tvl-farm.png', fullPage: true })

    // Check TVL display on page
    const pageContent = await page.content()

    // Look for TVL values
    const tvlElements = await page.locator('text=/\\$[0-9.,]+/').all()
    console.log('\n=== TVL Values on Page ===')
    for (const el of tvlElements.slice(0, 10)) {
      const text = await el.textContent()
      console.log(text)
    }
  })
})
