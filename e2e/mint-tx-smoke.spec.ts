/**
 * Mint transaction smoke test (OKX wallet)
 */

import { expect } from '@playwright/test'
import { metaMaskFixtures } from './utils/metamask-fixtures-router'
import BasicSetup from '../test/wallet-setup/okx.setup'
import {
  connectWallet,
  fillAmount,
  handleApprove,
  handleTransaction,
  navigateTo,
  WAIT
} from './utils/test-helpers'

const test = metaMaskFixtures(BasicSetup, 0)

test.describe('Mint TX smoke', () => {
  test('can submit a mint transaction when enabled', async ({ page, metamask }) => {
    test.setTimeout(120000)

    await navigateTo(page, '/')
    await connectWallet(page, metamask)
    await page.waitForTimeout(WAIT.SHORT)

    const mintTab = page.getByRole('button', { name: /^mint$/i }).first()
    if (await mintTab.count()) {
      await mintTab.click()
      await page.waitForTimeout(WAIT.SHORT)
    }

    await fillAmount(page, '0.001')
    await page.waitForTimeout(WAIT.MEDIUM)

    const mintButton = page.locator('button:has-text("Mint BTD"), button:has-text("Mint")').last()
    await expect(mintButton).toBeVisible()

    if (await mintButton.isDisabled()) {
      test.skip(true, 'Mint is disabled, skipping tx smoke')
    }

    await mintButton.click()
    await page.waitForTimeout(WAIT.MEDIUM)

    await handleApprove(metamask)
    await page.waitForTimeout(WAIT.TX)

    await handleTransaction(metamask)
    await page.waitForTimeout(WAIT.TX)
  })
})
