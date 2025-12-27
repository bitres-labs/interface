/**
 * Stake transaction smoke test (OKX wallet)
 */

import { expect } from '@playwright/test'
import { metaMaskFixtures } from './utils/metamask-fixtures-router'
import BasicSetup from '../test/wallet-setup/okx.setup'
import {
  clickTab,
  connectWallet,
  fillAmount,
  handleApprove,
  handleTransaction,
  navigateTo,
  WAIT
} from './utils/test-helpers'

const test = metaMaskFixtures(BasicSetup, 0)

test.describe('Stake TX smoke', () => {
  test('can submit a stake transaction when enabled', async ({ page, metamask }) => {
    test.setTimeout(120000)

    await navigateTo(page, '/stake')
    await connectWallet(page, metamask)
    await clickTab(page, 'Stake')
    await page.waitForTimeout(WAIT.MEDIUM)

    await fillAmount(page, '1')
    await page.waitForTimeout(WAIT.MEDIUM)

    const stakeButton = page.locator('button:has-text("Stake")').last()
    await expect(stakeButton).toBeVisible()

    if (await stakeButton.isDisabled()) {
      test.skip(true, 'Stake is disabled, skipping tx smoke')
    }

    await stakeButton.click()
    await page.waitForTimeout(WAIT.MEDIUM)

    await handleApprove(metamask)
    await page.waitForTimeout(WAIT.TX)

    await handleTransaction(metamask)
    await page.waitForTimeout(WAIT.TX)
  })
})
