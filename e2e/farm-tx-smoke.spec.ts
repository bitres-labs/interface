/**
 * Farm/Claim transaction smoke test (OKX wallet)
 */

import { expect } from '@playwright/test'
import { metaMaskFixtures } from './utils/metamask-fixtures-router'
import BasicSetup from '../test/wallet-setup/okx.setup'
import {
  clickTab,
  connectWallet,
  handleTransaction,
  navigateTo,
  WAIT
} from './utils/test-helpers'

const test = metaMaskFixtures(BasicSetup, 0)

test.describe('Farm TX smoke', () => {
  test('can submit a claim transaction when enabled', async ({ page, metamask }) => {
    test.setTimeout(120000)

    await navigateTo(page, '/farm')
    await connectWallet(page, metamask)
    await clickTab(page, 'Farm')
    await page.waitForTimeout(WAIT.MEDIUM)

    const claimButton = page.locator('button:has-text("Claim All"), button:has-text("Claim")').first()
    if (!(await claimButton.count())) {
      test.skip(true, 'Claim button not found, skipping tx smoke')
    }
    await expect(claimButton).toBeVisible()
    if (await claimButton.isDisabled()) {
      test.skip(true, 'Claim is disabled, skipping tx smoke')
    }

    await claimButton.click()
    await page.waitForTimeout(WAIT.MEDIUM)

    await handleTransaction(metamask)
    await page.waitForTimeout(WAIT.TX)
  })
})
