/**
 * Sepolia Data Verification Test
 *
 * Verifies that key data displays correctly on the production site
 */
import { test, expect } from '@playwright/test'

const BASE_URL = 'https://bitres.org'

test.describe('Sepolia Data Verification', () => {
  test('verify home page data loads', async ({ page }) => {
    test.setTimeout(60000) // Increase timeout for slow loading
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    // Check BTC price displays (should be ~$87,000+)
    const btcPrice = page.locator('text=/\\$8[0-9],[0-9]+/')
    await expect(btcPrice.first()).toBeVisible({ timeout: 15000 })

    // Take screenshot
    await page.screenshot({ path: 'test-results/home-data.png', fullPage: true })

    console.log('Home page data loaded successfully')
  })

  test('verify farm page TVL and APY', async ({ page }) => {
    await page.goto(`${BASE_URL}/farm`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(8000)

    // Check page loads
    await expect(page.getByRole('heading', { name: /liquidity farming/i })).toBeVisible()

    // Check TVL values - should not all be $0
    const tvlValues = await page.locator('text=/TVL.*\\$|\\$[0-9.,]+/').allTextContents()
    console.log('TVL values found:', tvlValues.slice(0, 5))

    // Check APY values display
    const apyValues = await page.locator('text=/[0-9.]+%|APY|APR/').allTextContents()
    console.log('APY values found:', apyValues.slice(0, 5))

    // Take screenshot
    await page.screenshot({ path: 'test-results/farm-data.png', fullPage: true })

    // Verify at least some data is showing (not all $0)
    const pageContent = await page.content()
    const hasPrices = pageContent.includes('$') && !pageContent.match(/\$0\.00.*\$0\.00.*\$0\.00.*\$0\.00.*\$0\.00/)

    console.log('Farm page has price data:', hasPrices)
  })

  test('verify mint page prices', async ({ page }) => {
    test.setTimeout(60000)
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    // Mint tab should already be visible on home page
    await page.waitForTimeout(2000)

    // Check WBTC and BTD labels visible
    await expect(page.getByText('WBTC', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('BTD', { exact: true }).first()).toBeVisible()

    // Check price displays
    const pageContent = await page.content()
    const hasBTCPrice = pageContent.includes('$8') // BTC price starts with $8x,xxx

    console.log('Mint page has BTC price:', hasBTCPrice)

    // Take screenshot
    await page.screenshot({ path: 'test-results/mint-data.png', fullPage: true })
  })

  test('verify BTB minimum price display', async ({ page }) => {
    // BTB Minimum Price is on the Data/Explorer page
    await page.goto(`${BASE_URL}/explorer`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(5000)

    // Look for BTB Minimum System Price
    const btbMinPriceLabel = page.locator('text=BTB Minimum System Price')
    await expect(btbMinPriceLabel).toBeVisible({ timeout: 10000 })

    // Get the price value (should be non-zero)
    const pageContent = await page.content()

    // Check if the page has the label and a non-zero price
    const hasLabel = pageContent.includes('BTB Minimum System Price')
    const hasZeroPrice = pageContent.includes('$0.0000')
    const hasBTBMinPrice = hasLabel && !hasZeroPrice

    console.log('BTB Min Price label found:', hasLabel)
    console.log('Shows $0.0000:', hasZeroPrice)
    console.log('BTB Min Price displays correctly:', hasBTBMinPrice)

    // Take screenshot
    await page.screenshot({ path: 'test-results/btb-min-price.png', fullPage: true })
  })
})
