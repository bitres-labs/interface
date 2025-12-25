/**
 * Minimal Synpress smoke test to verify MetaMask extension loads in CI.
 */

import { expect } from '@playwright/test'
import { metaMaskFixtures } from './utils/metamask-fixtures-router'
import BasicSetup from '../test/wallet-setup/basic.setup'

const test = metaMaskFixtures(BasicSetup, 0)
test.setTimeout(120_000)

test('should load MetaMask extension and app', async ({ page, metamaskPage }) => {
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)

  const extensionUrl = metamaskPage.url()
  expect(extensionUrl).toContain('chrome-extension://')
  expect(extensionUrl.startsWith('chrome-error://')).toBe(false)
})
