/**
 * Swap transaction smoke test (OKX wallet)
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

test.describe('Swap TX smoke', () => {
  test('can submit a swap transaction when enabled', async ({ page, metamask }) => {
    test.setTimeout(120000)

    await navigateTo(page, '/swap')
    await connectWallet(page, metamask)
    await clickTab(page, 'Swap')
    await page.waitForTimeout(WAIT.MEDIUM)

    await fillAmount(page, '1')
    await page.waitForTimeout(WAIT.MEDIUM)

    const swapButton = page.locator('button:has-text("Swap")').last()
    if (!(await swapButton.count())) {
      test.skip(true, 'Swap button not found, skipping tx smoke')
    }
    await expect(swapButton).toBeVisible()
    if (await swapButton.isDisabled()) {
      test.skip(true, 'Swap is disabled, skipping tx smoke')
    }

    await swapButton.click()
    await page.waitForTimeout(WAIT.MEDIUM)

    await handleApprove(metamask)
    await page.waitForTimeout(WAIT.TX)

    await handleTransaction(metamask)
    await page.waitForTimeout(WAIT.TX)
  })
})
