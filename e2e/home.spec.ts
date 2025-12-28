import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test('should load home page successfully', async ({ page }) => {
    await page.goto('/')

    // Check page title
    await expect(page).toHaveTitle(/Bitres/i)
  })

  test('should display bottom navigation on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // Check bottom navigation exists (mobile only)
    const bottomNav = page.locator('nav.md\\:hidden')
    await expect(bottomNav).toBeVisible()

    // Check all nav items are visible in bottom nav
    await expect(bottomNav.getByText('Home')).toBeVisible()
    await expect(bottomNav.getByText('Farm')).toBeVisible()
    await expect(bottomNav.getByText('Swap')).toBeVisible()
    await expect(bottomNav.getByText('Stake')).toBeVisible()
    await expect(bottomNav.getByText('Asset')).toBeVisible()
  })

  test('should navigate to farm page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // Click Farm link in bottom navigation
    const bottomNav = page.locator('nav.md\\:hidden')
    await bottomNav.getByRole('link', { name: /Farm/i }).click()
    await expect(page).toHaveURL(/.*farm/)
  })

  test('should navigate to stake page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    const bottomNav = page.locator('nav.md\\:hidden')
    await bottomNav.getByRole('link', { name: /Stake/i }).click()
    await expect(page).toHaveURL(/.*stake/)
  })

  test('should navigate to swap page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // Swap button is in the center of bottom nav
    const bottomNav = page.locator('nav.md\\:hidden')
    await bottomNav.locator('a[href="/swap"]').click()
    await expect(page).toHaveURL(/.*swap/)
  })

  test('should navigate to asset page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    const bottomNav = page.locator('nav.md\\:hidden')
    await bottomNav.getByRole('link', { name: /Asset/i }).click()
    await expect(page).toHaveURL(/.*asset/)
  })
})
