import { chromium, type BrowserContext, type Frame, type Page, test as base } from '@playwright/test'
import { createTempContextDir, removeTempContextDir, defineWalletSetup } from '@synthetixio/synpress-cache'
import { getExtensionIdFromUrl, prepareOkxExtension } from './okx-extension'

const DEFAULT_SEED_PHRASE = 'test test test test test test test test test test test junk'
const OKX_ONBOARDING_TIMEOUT = 30_000

type OkxFixtures = {
  _contextPath: string
  metamask: OkxWallet
  extensionId: string
  metamaskPage: Page
  page: Page
}

let _okxPage: Page

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

class OkxWallet {
  constructor(private context: BrowserContext, private extensionId: string) {}

  async connectToDapp() {
    await this.confirmInPopup(['Connect', 'Approve', 'Confirm'])
  }

  async confirmTransaction() {
    await this.confirmInPopup(['Confirm', 'Approve'])
  }

  async confirmSignature() {
    await this.confirmInPopup(['Sign', 'Confirm', 'Approve'])
  }

  async approveNetworkChange() {
    await this.confirmInPopup(['Add', 'Switch', 'Approve', 'Confirm'])
  }

  private async confirmInPopup(labels: string[], timeout = 15_000) {
    const deadline = Date.now() + timeout
    while (Date.now() < deadline) {
      const pages = this.context
        .pages()
        .filter(page => !page.isClosed() && page.url().includes(this.extensionId))

      for (const popup of pages) {
        if (popup.isClosed()) continue
        await popup.waitForLoadState('domcontentloaded').catch(() => undefined)
        await popup.bringToFront().catch(() => undefined)

        try {
          if (await popup.getByText(/connected/i).count()) {
            await popup.close().catch(() => undefined)
            return
          }

          if (await tryClickLabels(popup, labels)) {
            await sleep(1000)
            continue
          }

          const frame = await waitForSesFrame(popup, 2000)
          if (frame && (await tryClickLabels(frame, labels))) {
            await sleep(1000)
            continue
          }
        } catch {
          // ignore closed/invalid pages and keep polling
        }
      }

      await sleep(500)
    }
  }
}

async function tryClickLabels(scope: Page | Frame, labels: string[]) {
  for (const label of labels) {
    const labelPattern = new RegExp(label, 'i')
    const roleButton = scope.getByRole('button', { name: labelPattern })
    if (await roleButton.count()) {
      await roleButton.first().click()
      return true
    }

    const textButton = scope.locator('button', { hasText: labelPattern })
    if (await textButton.count()) {
      await textButton.first().click()
      return true
    }
  }
  return false
}

async function waitForOkxPopup(context: BrowserContext, extensionId: string, timeout = 10_000) {
  const existing = context.pages().find(page =>
    page.url().includes(extensionId) &&
    (page.url().includes('notification') || page.url().includes('connect') || page.url().includes('popup'))
  )
  if (existing) {
    await existing.waitForLoadState('domcontentloaded').catch(() => undefined)
    return existing
  }

  try {
    const page = await context.waitForEvent('page', { timeout })
    await page.waitForLoadState('domcontentloaded')
    if (
      page.url().includes(extensionId) &&
      (page.url().includes('notification') || page.url().includes('connect') || page.url().includes('popup'))
    ) {
      return page
    }
  } catch {
    return undefined
  }

  return undefined
}

async function waitForSesFrame(page: Page, timeout = OKX_ONBOARDING_TIMEOUT) {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    const frame = page.frames().find(f => f.url().includes('ses.html'))
    if (frame) return frame
    await sleep(500)
  }
  return undefined
}

async function getOkxExtensionId(context: BrowserContext) {
  for (const worker of context.serviceWorkers()) {
    const id = getExtensionIdFromUrl(worker.url())
    if (id) return id
  }

  try {
    const worker = await context.waitForEvent('serviceworker', { timeout: 10_000 })
    const id = getExtensionIdFromUrl(worker.url())
    if (id) return id
  } catch {
    // ignore
  }

  throw new Error('OKX extension ID not found - extension may not have loaded')
}

async function onboardOkx(
  context: BrowserContext,
  extensionId: string,
  seedPhrase: string,
  walletPassword: string
) {
  const page = await context.newPage()
  await page.goto(`chrome-extension://${extensionId}/notification.html#/initialize`)
  await page.waitForTimeout(2000)

  await page.getByText('Import wallet', { exact: false }).click()
  await page.waitForTimeout(1000)
  await page.getByText('Seed phrase or private key', { exact: false }).click()
  await page.waitForTimeout(2000)

  let frame = await waitForSesFrame(page)
  if (!frame) {
    throw new Error('OKX onboarding frame not found')
  }

  const words = seedPhrase.split(' ')
  for (let i = 0; i < 12; i += 1) {
    await frame.locator('input').nth(i).fill(words[i])
  }

  await frame.getByRole('button', { name: /confirm/i }).click()
  await page.waitForTimeout(1000)

  frame = await waitForSesFrame(page)
  if (!frame) {
    throw new Error('OKX onboarding frame not found after seed confirm')
  }
  await frame.getByRole('button', { name: /next/i }).click()
  await page.waitForTimeout(1000)

  frame = await waitForSesFrame(page)
  if (!frame) {
    throw new Error('OKX onboarding frame not found after seed next')
  }
  await frame.locator('input[type="password"]').nth(0).fill(walletPassword)
  await frame.locator('input[type="password"]').nth(1).fill(walletPassword)
  await frame.getByRole('button', { name: /confirm/i }).click()
  await page.waitForTimeout(1000)

  try {
    const startSelectors = [
      page.getByRole('button', { name: /start your web3 journey/i }),
      page.getByRole('button', { name: /start/i }),
      page.getByRole('button', { name: /done/i })
    ]
    let clicked = false
    for (const selector of startSelectors) {
      if (await selector.count()) {
        await selector.first().click()
        clicked = true
        break
      }
    }
    if (!clicked) {
      const frame = await waitForSesFrame(page, 2000)
      if (frame) {
        const frameButtons = [
          frame.getByRole('button', { name: /start your web3 journey/i }),
          frame.getByRole('button', { name: /start/i }),
          frame.getByRole('button', { name: /done/i })
        ]
        for (const selector of frameButtons) {
          if (await selector.count()) {
            await selector.first().click()
            clicked = true
            break
          }
        }
      }
    }
    if (clicked) {
      await page.waitForTimeout(2000)
    }
  } catch {
    // If the start screen is not present, continue without failing onboarding.
  }

  return page
}

export const okxFixtures = (walletSetup: ReturnType<typeof defineWalletSetup>, slowMo = 0) => {
  return base.extend<OkxFixtures>({
    _contextPath: async ({ browserName }, use, testInfo) => {
      testInfo.setTimeout(120_000)
      const contextPath = await createTempContextDir(browserName, testInfo.testId)
      await use(contextPath)
      const error = await removeTempContextDir(contextPath)
      if (error) {
        console.error(error)
      }
    },
    context: async ({ _contextPath }, use) => {
      const { walletPassword } = walletSetup
      const seedPhrase = process.env.OKX_SEED_PHRASE || DEFAULT_SEED_PHRASE

      const { extensionPath } = await prepareOkxExtension()
      const context = await chromium.launchPersistentContext(_contextPath, {
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
        ],
        slowMo
      })

      await sleep(3000)
      const extensionId = await getOkxExtensionId(context)
      _okxPage = await onboardOkx(context, extensionId, seedPhrase, walletPassword)

      await use(context)

      await context.close()
    },
    page: async ({ context }, use) => {
      const page = await context.newPage()
      await use(page)
      await page.close()
    },
    metamaskPage: async ({ context: _ }, use) => {
      await use(_okxPage)
    },
    extensionId: async ({ context }, use) => {
      const extensionId = await getOkxExtensionId(context)
      await use(extensionId)
    },
    metamask: async ({ context, extensionId }, use) => {
      const okx = new OkxWallet(context, extensionId)
      await use(okx)
    }
  })
}
