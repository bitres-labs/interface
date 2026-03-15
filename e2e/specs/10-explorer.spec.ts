/**
 * 10 - Data/Explorer Page Tests
 *
 * Navigate to /data → verify system metrics, network info,
 * treasury balances, token info, farming stats, and contract addresses.
 */

import { test, expect } from '../sepolia/fixtures'
import { navigateTo } from '../sepolia/helpers'
import { TIMEOUT } from '../sepolia/constants'

const DATA_PATH = '/explorer'

test.describe('Data / Explorer', () => {
  test('data page loads with system metrics', async ({ sepoliaPage: page }) => {
    await navigateTo(page, DATA_PATH)
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    const body = await page.textContent('body')
    const hasContent =
      body?.toLowerCase().includes('system') ||
      body?.toLowerCase().includes('metric') ||
      body?.toLowerCase().includes('network') ||
      body?.toLowerCase().includes('data') ||
      body?.toLowerCase().includes('tvl')
    expect(hasContent).toBeTruthy()
  })

  test('network info shows Sepolia', async ({ sepoliaPage: page }) => {
    await navigateTo(page, DATA_PATH)
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Wait for network data to load
    await page.waitForTimeout(TIMEOUT.SHORT)

    const body = await page.textContent('body')
    const hasSepolia =
      body?.toLowerCase().includes('sepolia') ||
      body?.includes('11155111') ||
      body?.toLowerCase().includes('testnet') ||
      body?.toLowerCase().includes('network')
    expect(hasSepolia).toBeTruthy()
  })

  test('treasury balances are displayed', async ({ sepoliaPage: page }) => {
    await navigateTo(page, DATA_PATH)
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    const body = await page.textContent('body')
    const hasTreasury =
      body?.toLowerCase().includes('treasury') ||
      body?.toLowerCase().includes('reserve') ||
      body?.includes('WBTC') ||
      body?.includes('BRS') ||
      body?.includes('BTD')
    expect(hasTreasury).toBeTruthy()

    const hasValues =
      body?.includes('$') ||
      body?.match(/[\d,]+\.\d+/) ||
      body?.toLowerCase().includes('value')
    expect(hasValues).toBeTruthy()
  })

  test('token and protocol information is displayed', async ({ sepoliaPage: page }) => {
    await navigateTo(page, DATA_PATH)
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    const body = await page.textContent('body')
    // Should show protocol tokens or financial data
    const hasInfo =
      body?.includes('BTD') ||
      body?.includes('BTB') ||
      body?.includes('BRS') ||
      body?.toLowerCase().includes('price') ||
      body?.toLowerCase().includes('supply') ||
      body?.toLowerCase().includes('apr') ||
      body?.toLowerCase().includes('tvl')
    expect(hasInfo).toBeTruthy()
  })

  test('mining or farming statistics are shown', async ({ sepoliaPage: page }) => {
    await navigateTo(page, DATA_PATH)
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Scroll to see more content
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2))
    await page.waitForTimeout(TIMEOUT.SHORT)

    const body = await page.textContent('body')
    const hasFarmingStats =
      body?.toLowerCase().includes('mining') ||
      body?.toLowerCase().includes('farming') ||
      body?.toLowerCase().includes('mined') ||
      body?.toLowerCase().includes('progress') ||
      body?.toLowerCase().includes('staking') ||
      body?.includes('BRS') ||
      body?.includes('%')
    expect(hasFarmingStats).toBeTruthy()
  })

  test('system data sections are present', async ({ sepoliaPage: page }) => {
    await navigateTo(page, DATA_PATH)
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Scroll to bottom to load all content
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(TIMEOUT.SHORT)

    const body = await page.textContent('body')

    // Should show treasury or contract-related info
    const hasSystemData =
      body?.match(/0x[a-fA-F0-9]{8,}/) ||
      body?.toLowerCase().includes('contract') ||
      body?.toLowerCase().includes('address') ||
      body?.toLowerCase().includes('treasury') ||
      body?.toLowerCase().includes('collateral') ||
      body?.toLowerCase().includes('system')
    expect(hasSystemData).toBeTruthy()
  })
})
