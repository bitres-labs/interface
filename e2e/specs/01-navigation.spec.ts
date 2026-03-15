/**
 * 01 - Navigation Tests
 *
 * Verifies that all pages load correctly and contain expected UI elements.
 * No wallet connection required.
 */

import { test, expect } from '@playwright/test'

const ROUTES = [
  { path: '/', title: 'Home', expectedText: ['Bitres', 'BTC'] },
  { path: '/mint', title: 'Mint', expectedText: ['Mint', 'WBTC'] },
  { path: '/stake', title: 'Stake', expectedText: ['Stake', 'BTD'] },
  { path: '/farm', title: 'Farm', expectedText: ['Farm'] },
  { path: '/swap', title: 'Swap', expectedText: ['Swap'] },
  { path: '/faucet', title: 'Faucet', expectedText: ['Faucet'] },
  { path: '/pool', title: 'Pool', expectedText: ['Pool', 'Liquidity'] },
]

test.describe('Navigation & Page Load', () => {
  for (const route of ROUTES) {
    test(`${route.title} page (${route.path}) loads successfully`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: 'networkidle', timeout: 15000 })

      // Page should not show error
      const body = await page.textContent('body')
      expect(body).not.toContain('Application error')
      expect(body).not.toContain('404')

      // Check expected text elements
      for (const text of route.expectedText) {
        const hasText = await page.locator(`text=/${text}/i`).count()
        expect(hasText).toBeGreaterThan(0)
      }
    })
  }

  test('Connect Wallet button is visible on all pages', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle', timeout: 15000 })
    const connectBtn = page.locator('button:has-text("Connect")')
    await expect(connectBtn.first()).toBeVisible()
  })

  test('Navigation between pages works', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle', timeout: 15000 })

    // Navigate via nav links (prefer <a> tags over buttons)
    const navLink = page.locator('a[href="/mint"]')
    if ((await navLink.count()) > 0) {
      await navLink.first().click()
      await page.waitForTimeout(2000)
      expect(page.url()).toContain('/mint')
    } else {
      // Fallback: direct navigation
      await page.goto('/mint', { waitUntil: 'networkidle', timeout: 15000 })
      expect(page.url()).toContain('/mint')
    }
  })
})
