import { chromium, expect, test } from '@playwright/test'
import { getExtensionIdFromUrl, prepareOkxExtension } from './utils/okx-extension'

test.setTimeout(120_000)

test('okx extension loads', async () => {
  const { extensionPath, manifestName } = await prepareOkxExtension()
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox'
    ],
    ignoreDefaultArgs: [
      '--disable-extensions',
      '--disable-component-extensions-with-background-pages',
      '--disable-extensions-except',
      '--enable-automation'
    ]
  })

  try {
    await new Promise(r => setTimeout(r, 8000))
    const workerUrls = context.serviceWorkers().map(sw => sw.url())
    const pageUrls = context.pages().map(page => page.url())
    const extensionIds = [
      ...workerUrls.map(getExtensionIdFromUrl),
      ...pageUrls.map(getExtensionIdFromUrl)
    ].filter(Boolean)
    const uniqueIds = [...new Set(extensionIds)]

    expect(uniqueIds.length, `No extension id found for ${manifestName}`).toBeGreaterThan(0)
  } finally {
    await context.close()
  }
})
