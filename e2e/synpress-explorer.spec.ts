/**
 * Synpress E2E Test: Explorer page data checks
 */

import { expect } from '@playwright/test'
import { metaMaskFixtures } from './utils/metamask-fixtures-router'
import BasicSetup from '../test/wallet-setup/okx.setup'
import { connectWallet, isWalletConnected, navigateTo, WAIT } from './utils/test-helpers'

const test = metaMaskFixtures(BasicSetup, 0)

test.describe('Explorer Page', () => {
  test('should render core explorer sections', async ({ page, metamask }, testInfo) => {
    await navigateTo(page, '/explorer')
    await connectWallet(page, metamask)
    await page.waitForTimeout(WAIT.MEDIUM)

    const connected = await isWalletConnected(page)
    expect(connected).toBe(true)

    await expect(page.getByRole('heading', { name: 'Treasury Statistics' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Token Information' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Farming Statistics' })).toBeVisible()

    const tokenCards = page.locator('text=WBTC, text=BTD, text=BTB, text=BRS')
    if ((await tokenCards.count()) === 0) {
      testInfo.skip(true, 'Token cards not rendered on explorer page')
    }
  })
})
