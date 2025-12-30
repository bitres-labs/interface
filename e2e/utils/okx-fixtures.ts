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
    await this.confirmInPopup(['Sign', 'Confirm', 'Approve', 'Continue'])
  }

  async approveNetworkChange() {
    await this.confirmInPopup(['Add', 'Switch', 'Approve', 'Confirm'])
  }

  private async confirmInPopup(labels: string[], timeout = 30_000) {
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

          // Scroll down to reveal hidden buttons (OKX often hides confirm buttons)
          await popup.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight)
            const main = document.querySelector('main, [role="main"], .container, .content')
            if (main) main.scrollTop = main.scrollHeight
          }).catch(() => undefined)
          await sleep(300)

          if (await tryClickLabels(popup, labels)) {
            await sleep(1000)
            continue
          }

          const frame = await waitForSesFrame(popup, 2000)
          if (frame) {
            // Also scroll in frame
            await frame.evaluate(() => {
              window.scrollTo(0, document.body.scrollHeight)
            }).catch(() => undefined)
            await sleep(300)

            if (await tryClickLabels(frame, labels)) {
              await sleep(1000)
              continue
            }
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
  seedOrPrivateKey: string,
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

  // Detect if input is private key (0x + 64 hex chars) or seed phrase
  const isPrivateKey = /^(0x)?[a-fA-F0-9]{64}$/.test(seedOrPrivateKey.trim())
  console.log('[OKX] Input type:', isPrivateKey ? 'Private Key' : 'Seed Phrase')
  console.log('[OKX] Key prefix:', seedOrPrivateKey.substring(0, 10) + '...')

  if (isPrivateKey) {
    // Switch to private key tab (use role selector to avoid matching title)
    const privateKeyTab = frame.getByRole('tab', { name: /private key/i })
    const tabCount = await privateKeyTab.count()
    console.log('[OKX] Private key tab count:', tabCount)
    if (tabCount > 0) {
      await privateKeyTab.click()
      await sleep(1000)
      console.log('[OKX] Switched to private key tab')
    }

    // Fill private key input (usually a textarea or single input)
    const pkInput = frame.locator('textarea, input[type="password"], input[type="text"]').first()
    console.log('[OKX] Filling private key...')
    await pkInput.fill(seedOrPrivateKey.trim())
    console.log('[OKX] Private key filled')

    // Click confirm to submit private key
    await frame.getByRole('button', { name: /confirm/i }).click()
    console.log('[OKX] Waiting for network selection screen...')
    await page.waitForTimeout(5000)

    // Handle "Select network" screen - select EVM and confirm
    // This screen appears outside of the iframe, need to poll for it
    try {
      // Wait for page to load and look for network selection
      const deadline = Date.now() + 20000
      let found = false
      while (Date.now() < deadline && !found) {
        // Try main page first
        const evmOption = page.locator('text=EVM-compatible networks').first()
        if (await evmOption.count() > 0) {
          console.log('[OKX] Found EVM option on main page')
          await evmOption.click()
          found = true
          break
        }

        // Try frames
        for (const frameObj of page.frames()) {
          const frameEvmOption = frameObj.locator('text=EVM-compatible networks').first()
          if (await frameEvmOption.count() > 0) {
            console.log('[OKX] Found EVM option in frame')
            await frameEvmOption.click()
            found = true
            break
          }
        }

        if (!found) {
          await sleep(500)
        }
      }

      if (found) {
        await sleep(1000)
        // Click Confirm button - check main page and frames
        let confirmClicked = false

        // Try main page first
        const confirmBtn = page.locator('button:has-text("Confirm")').first()
        if (await confirmBtn.count() > 0) {
          console.log('[OKX] Clicking Confirm button on main page')
          await confirmBtn.click()
          confirmClicked = true
        }

        // Try frames if not found on main page
        if (!confirmClicked) {
          for (const frameObj of page.frames()) {
            const frameConfirmBtn = frameObj.locator('button:has-text("Confirm")').first()
            if (await frameConfirmBtn.count() > 0) {
              console.log('[OKX] Clicking Confirm button in frame')
              await frameConfirmBtn.click()
              confirmClicked = true
              break
            }
          }
        }

        if (confirmClicked) {
          await page.waitForTimeout(2000)
        } else {
          console.log('[OKX] Confirm button not found')
        }
      } else {
        console.log('[OKX] Network selection screen not found, may have already passed')
      }
    } catch (e) {
      console.log('[OKX] Network selection error (may be OK):', e)
    }

    // Handle "Secure your wallet" screen - click Next to proceed to password
    try {
      console.log('[OKX] Looking for Secure wallet screen...')
      await page.waitForTimeout(2000)

      // Look for Next button on main page or in frames
      let nextClicked = false
      const nextBtn = page.locator('button:has-text("Next")').first()
      if (await nextBtn.count() > 0) {
        console.log('[OKX] Clicking Next on Secure wallet screen')
        await nextBtn.click()
        nextClicked = true
      }

      if (!nextClicked) {
        for (const frameObj of page.frames()) {
          const frameNextBtn = frameObj.locator('button:has-text("Next")').first()
          if (await frameNextBtn.count() > 0) {
            console.log('[OKX] Clicking Next in frame')
            await frameNextBtn.click()
            nextClicked = true
            break
          }
        }
      }

      if (nextClicked) {
        await page.waitForTimeout(2000)
      }
    } catch (e) {
      console.log('[OKX] Secure wallet screen not found (may be OK):', e)
    }
  } else {
    // Fill seed phrase (12 inputs)
    const words = seedOrPrivateKey.split(' ')
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
  }

  frame = await waitForSesFrame(page)
  if (!frame) {
    throw new Error('OKX onboarding frame not found after seed next')
  }
  await frame.locator('input[type="password"]').nth(0).fill(walletPassword)
  await frame.locator('input[type="password"]').nth(1).fill(walletPassword)
  await frame.getByRole('button', { name: /confirm/i }).click()
  await page.waitForTimeout(1000)

  const startButton = page.getByRole('button', { name: /start your web3 journey/i })
  await startButton.waitFor({ timeout: OKX_ONBOARDING_TIMEOUT })
  await startButton.click()
  await page.waitForTimeout(2000)

  // Try to add bitres.org to trusted sites to avoid phishing warning
  try {
    await addTrustedSite(page, extensionId, 'bitres.org')
  } catch (e) {
    console.log('[OKX] Could not add trusted site (will handle phishing warning in tests):', e)
  }

  return page
}

// Add a domain to OKX trusted sites whitelist
async function addTrustedSite(page: Page, extensionId: string, domain: string) {
  console.log(`[OKX] Attempting to add ${domain} to trusted sites...`)

  // Navigate to OKX settings
  await page.goto(`chrome-extension://${extensionId}/notification.html#/settings`)
  await page.waitForTimeout(2000)

  // Look for Security settings
  const securityLink = page.locator('text=Security').first()
  if (await securityLink.count() > 0) {
    await securityLink.click()
    await page.waitForTimeout(1000)

    // Look for Trusted Sites or similar option
    const trustedSitesLink = page.locator('text=/Trusted|Whitelist|Safe sites/i').first()
    if (await trustedSitesLink.count() > 0) {
      await trustedSitesLink.click()
      await page.waitForTimeout(1000)

      // Look for Add button
      const addBtn = page.locator('button:has-text("Add"), text=Add site').first()
      if (await addBtn.count() > 0) {
        await addBtn.click()
        await page.waitForTimeout(500)

        // Fill domain input
        const domainInput = page.locator('input[type="text"], input[placeholder*="domain"], input[placeholder*="site"]').first()
        if (await domainInput.count() > 0) {
          await domainInput.fill(domain)
          await page.waitForTimeout(500)

          // Click confirm/save
          const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Save"), button:has-text("Add")').first()
          if (await confirmBtn.count() > 0) {
            await confirmBtn.click()
            await page.waitForTimeout(1000)
            console.log(`[OKX] Successfully added ${domain} to trusted sites`)
            return
          }
        }
      }
    }
  }

  // If we couldn't find the settings path, try alternative approaches
  // Try going directly to phishing settings URL if it exists
  const possibleUrls = [
    `chrome-extension://${extensionId}/notification.html#/settings/security`,
    `chrome-extension://${extensionId}/notification.html#/settings/security/trusted-sites`,
    `chrome-extension://${extensionId}/notification.html#/phishing-whitelist`,
  ]

  for (const url of possibleUrls) {
    try {
      await page.goto(url)
      await page.waitForTimeout(1500)

      // Check if we're on a page with whitelist functionality
      const pageContent = await page.content()
      if (pageContent.includes('trusted') || pageContent.includes('whitelist') || pageContent.includes('safe')) {
        console.log(`[OKX] Found settings page at ${url}`)
        // Try to add the domain here
        const input = page.locator('input').first()
        if (await input.count() > 0) {
          await input.fill(domain)
          const btn = page.locator('button').first()
          if (await btn.count() > 0) {
            await btn.click()
            console.log(`[OKX] Added ${domain} via ${url}`)
            return
          }
        }
      }
    } catch {
      // Continue to next URL
    }
  }

  console.log(`[OKX] Could not find trusted sites settings - phishing warning will need to be handled in tests`)
}

export const okxFixtures = (walletSetup: ReturnType<typeof defineWalletSetup>, slowMo = 0) => {
  return base.extend<OkxFixtures>({
    _contextPath: async ({ browserName }, use, testInfo) => {
      testInfo.setTimeout(300_000) // 5 minutes for wallet setup and tests
      const contextPath = await createTempContextDir(browserName, testInfo.testId)
      await use(contextPath)
      const error = await removeTempContextDir(contextPath)
      if (error) {
        console.error(error)
      }
    },
    context: async ({ _contextPath }, use) => {
      const { walletPassword } = walletSetup
      // Support both private key and seed phrase
      const seedOrKey = process.env.OKX_PRIVATE_KEY || process.env.OKX_SEED_PHRASE || DEFAULT_SEED_PHRASE

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
      _okxPage = await onboardOkx(context, extensionId, seedOrKey, walletPassword)

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
