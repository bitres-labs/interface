/**
 * Minimal smoke test to verify OKX extension loads.
 */

import { expect } from '@playwright/test'
import { metaMaskFixtures } from './utils/metamask-fixtures-router'
import BasicSetup from '../test/wallet-setup/okx.setup'

const test = metaMaskFixtures(BasicSetup, 0)
test.setTimeout(120_000)

test('should load OKX extension and app', async ({ page, metamaskPage }) => {
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)

  const extensionUrl = metamaskPage.url()
  expect(extensionUrl).toContain('chrome-extension://')
  expect(extensionUrl.startsWith('chrome-error://')).toBe(false)
})
