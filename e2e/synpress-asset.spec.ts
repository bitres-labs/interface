/**
 * Synpress E2E Test: Asset page minimal checks
 */

import { expect } from '@playwright/test'
import { metaMaskFixtures } from './utils/metamask-fixtures-router'
import BasicSetup from '../test/wallet-setup/okx.setup'
import { navigateTo } from './utils/test-helpers'

const test = metaMaskFixtures(BasicSetup, 0)

test.describe('Asset Page', () => {
  test('should render asset headings', async ({ page }) => {
    await navigateTo(page, '/asset')

    await expect(page.getByRole('heading', { name: 'Wallet' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Staking Positions' })).toBeVisible()
  })
})
