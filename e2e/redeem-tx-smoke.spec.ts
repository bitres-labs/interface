/**
 * Redeem transaction smoke test (OKX wallet)
 */

import { expect } from '@playwright/test'
import { metaMaskFixtures } from './utils/metamask-fixtures-router'
import BasicSetup from '../test/wallet-setup/okx.setup'
import {
  connectWallet,
  fillAmount,
  handlePermit,
  handleTransaction,
  navigateTo,
  WAIT
} from './utils/test-helpers'

const test = metaMaskFixtures(BasicSetup, 0)

test.describe('Redeem TX smoke', () => {
  test('can submit a redeem transaction when enabled', async ({ page, metamask }) => {
    test.setTimeout(120000)

    await navigateTo(page, '/')
    await connectWallet(page, metamask)
    await page.waitForTimeout(WAIT.SHORT)

    const redeemTab = page.locator('button:has-text("Redeem BTD")').first()
    if (await redeemTab.count()) {
      await redeemTab.click()
      await page.waitForTimeout(WAIT.SHORT)
    }

    await fillAmount(page, '1')
    await page.waitForTimeout(WAIT.MEDIUM)

    const redeemButton = page
      .locator('button:has-text("Redeem BTD"), button:has-text("Redeem")')
      .last()
    await expect(redeemButton).toBeVisible()

    if (await redeemButton.isDisabled()) {
      test.skip(true, 'Redeem is disabled, skipping tx smoke')
    }

    await redeemButton.click()
    await page.waitForTimeout(WAIT.MEDIUM)

    await handlePermit(metamask)
    await page.waitForTimeout(WAIT.TX)

    await handleTransaction(metamask)
    await page.waitForTimeout(WAIT.TX)
  })
})
