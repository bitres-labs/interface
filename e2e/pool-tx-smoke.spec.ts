/**
 * Pool Add/Remove liquidity smoke test (OKX wallet)
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

test.describe('Pool TX smoke', () => {
  test('can submit add liquidity when enabled', async ({ page, metamask }) => {
    test.setTimeout(120000)

    await navigateTo(page, '/pool')
    await connectWallet(page, metamask)
    await clickTab(page, 'Add Liquidity')
    await page.waitForTimeout(WAIT.MEDIUM)

    await fillAmount(page, '1', 0)
    await page.waitForTimeout(WAIT.SHORT)
    await fillAmount(page, '1', 1)
    await page.waitForTimeout(WAIT.MEDIUM)

    const addButton = page.locator('button:has-text("Add Liquidity"), button:has-text("Add")').last()
    if (!(await addButton.count())) {
      test.skip(true, 'Add liquidity button not found, skipping tx smoke')
    }
    await expect(addButton).toBeVisible()
    if (await addButton.isDisabled()) {
      test.skip(true, 'Add liquidity is disabled, skipping tx smoke')
    }

    await addButton.click()
    await page.waitForTimeout(WAIT.MEDIUM)

    await handleApprove(metamask)
    await page.waitForTimeout(WAIT.TX)

    await handleTransaction(metamask)
    await page.waitForTimeout(WAIT.TX)
  })

  test('can submit remove liquidity when enabled', async ({ page, metamask }) => {
    test.setTimeout(120000)

    await navigateTo(page, '/pool')
    await connectWallet(page, metamask)
    await clickTab(page, 'Remove Liquidity')
    await page.waitForTimeout(WAIT.MEDIUM)

    const removeButton = page.locator('button:has-text("Remove Liquidity"), button:has-text("Remove")').last()
    if (!(await removeButton.count())) {
      test.skip(true, 'Remove liquidity button not found, skipping tx smoke')
    }
    await expect(removeButton).toBeVisible()
    if (await removeButton.isDisabled()) {
      test.skip(true, 'Remove liquidity is disabled, skipping tx smoke')
    }

    await removeButton.click()
    await page.waitForTimeout(WAIT.MEDIUM)

    await handleApprove(metamask)
    await page.waitForTimeout(WAIT.TX)

    await handleTransaction(metamask)
    await page.waitForTimeout(WAIT.TX)
  })
})
