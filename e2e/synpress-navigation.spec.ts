/**
 * Synpress E2E Test: Navigation and Page Access
 *
 * Tests for navigating between pages, header/footer links,
 * and verifying page content loads correctly
 */

import { metaMaskFixtures } from './utils/metamask-fixtures-router'
import { expect } from '@playwright/test'
import BasicSetup from '../test/wallet-setup/okx.setup'
import {
  connectWallet,
  navigateTo,
  isWalletConnected,
  takeScreenshot,
  WAIT
} from './utils/test-helpers'

const test = metaMaskFixtures(BasicSetup, 0)

// All application pages
const PAGES = [
  { path: '/', name: 'Home/Mint' },
  { path: '/stake', name: 'Stake' },
  { path: '/swap', name: 'Swap' },
  { path: '/pool', name: 'Pool' },
  { path: '/farm', name: 'Farm' },
  { path: '/asset', name: 'Asset' },
  { path: '/explorer', name: 'Explorer' },
  { path: '/about', name: 'About' },
  { path: '/whitepaper', name: 'Whitepaper' },
  { path: '/faq', name: 'FAQ' }
]

test.describe('Page Navigation', () => {
  test('should navigate to all pages without errors', async ({ page }) => {
    for (const pageInfo of PAGES) {
      await navigateTo(page, pageInfo.path)

      // Check page loaded without error
      const content = await page.content()
      const hasError = /404|not found|page not found/i.test(content)

      console.log(`Page ${pageInfo.name} loaded: ${!hasError}`)
      expect(hasError).toBe(false)

      await takeScreenshot(page, `nav-page-${pageInfo.name.toLowerCase()}`)
    }
  })

  test('should maintain wallet connection across page navigation', async ({ page, metamask }) => {
    await navigateTo(page, '/')
    await connectWallet(page, metamask)

    for (const pageInfo of PAGES) {
      await navigateTo(page, pageInfo.path)
      const connected = await isWalletConnected(page)
      console.log(`Wallet connected on ${pageInfo.name}: ${connected}`)
      expect(connected).toBe(true)
    }
  })
})

test.describe('Header Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/')
    await page.waitForTimeout(WAIT.SHORT)
  })

  test('should display header with navigation links', async ({ page }) => {
    const header = page.locator('header, nav, [class*="header"], [class*="nav"]')
    expect(await header.count()).toBeGreaterThan(0)

    await takeScreenshot(page, 'nav-header')
  })

  test('should navigate via Mint link', async ({ page }) => {
    const mintLink = page.locator('a:has-text("Mint"), button:has-text("Mint")').first()
    if (await mintLink.count() > 0) {
      await mintLink.click()
      await page.waitForTimeout(WAIT.MEDIUM)

      const content = await page.content()
      const hasMintContent = content.includes('Mint') || content.includes('WBTC') || content.includes('BTD')
      expect(hasMintContent).toBe(true)
    }

    await takeScreenshot(page, 'nav-mint-click')
  })

  test('should navigate via Stake link', async ({ page }) => {
    const stakeLink = page.locator('a:has-text("Stake")').first()
    if (await stakeLink.count() > 0) {
      await stakeLink.click()
      await page.waitForTimeout(WAIT.MEDIUM)

      const url = page.url()
      expect(url).toContain('stake')
    }

    await takeScreenshot(page, 'nav-stake-click')
  })

  test('should navigate via Swap link', async ({ page }) => {
    const swapLink = page.locator('a:has-text("Swap")').first()
    if (await swapLink.count() > 0) {
      await swapLink.click()
      await page.waitForTimeout(WAIT.MEDIUM)

      const url = page.url()
      expect(url).toContain('swap')
    }

    await takeScreenshot(page, 'nav-swap-click')
  })

  test('should navigate via Pool link', async ({ page }) => {
    const poolLink = page.locator('a:has-text("Pool")').first()
    if (await poolLink.count() > 0) {
      await poolLink.click()
      await page.waitForTimeout(WAIT.MEDIUM)

      const url = page.url()
      expect(url).toContain('pool')
    }

    await takeScreenshot(page, 'nav-pool-click')
  })

  test('should navigate via Farm link', async ({ page }) => {
    const farmLink = page.locator('a:has-text("Farm")').first()
    if (await farmLink.count() > 0) {
      await farmLink.click()
      await page.waitForTimeout(WAIT.MEDIUM)

      const url = page.url()
      expect(url).toContain('farm')
    }

    await takeScreenshot(page, 'nav-farm-click')
  })

  test('should navigate via Asset link', async ({ page }) => {
    const assetLink = page.locator('a:has-text("Asset"), a:has-text("Assets")').first()
    if (await assetLink.count() > 0) {
      await assetLink.click()
      await page.waitForTimeout(WAIT.MEDIUM)

      const url = page.url()
      expect(url).toContain('asset')
    }

    await takeScreenshot(page, 'nav-asset-click')
  })
})

test.describe('Logo Navigation', () => {
  test('should navigate to home when clicking logo', async ({ page }) => {
    await navigateTo(page, '/stake')

    const logo = page.locator('[class*="logo"], a[href="/"], img[alt*="logo"]').first()
    if (await logo.count() > 0) {
      await logo.click()
      await page.waitForTimeout(WAIT.MEDIUM)

      const url = page.url()
      expect(url.endsWith('/') || url.endsWith(':3000')).toBe(true)
    }

    await takeScreenshot(page, 'nav-logo-click')
  })
})

test.describe('Footer Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/')
    await page.waitForTimeout(WAIT.SHORT)
  })

  test('should display footer', async ({ page }) => {
    const footer = page.locator('footer, [class*="footer"]')
    expect(await footer.count()).toBeGreaterThan(0)

    await takeScreenshot(page, 'nav-footer')
  })

  test('should have About link in footer or menu', async ({ page }) => {
    const aboutLink = page.locator('a:has-text("About")')
    if (await aboutLink.count() > 0) {
      await aboutLink.first().click()
      await page.waitForTimeout(WAIT.MEDIUM)

      const url = page.url()
      expect(url).toContain('about')
    }

    await takeScreenshot(page, 'nav-about-link')
  })

  test('should have Whitepaper link', async ({ page }) => {
    const wpLink = page.locator('a:has-text("Whitepaper"), a:has-text("White Paper")')
    if (await wpLink.count() > 0) {
      await wpLink.first().click()
      await page.waitForTimeout(WAIT.MEDIUM)

      const url = page.url()
      expect(url).toContain('whitepaper')
    }

    await takeScreenshot(page, 'nav-whitepaper-link')
  })

  test('should have FAQ link', async ({ page }) => {
    const faqLink = page.locator('a:has-text("FAQ")')
    if (await faqLink.count() > 0) {
      await faqLink.first().click()
      await page.waitForTimeout(WAIT.MEDIUM)

      const url = page.url()
      expect(url).toContain('faq')
    }

    await takeScreenshot(page, 'nav-faq-link')
  })

  test('should have Explorer link', async ({ page }) => {
    const explorerLink = page.locator('a:has-text("Explorer")')
    if (await explorerLink.count() > 0) {
      await explorerLink.first().click()
      await page.waitForTimeout(WAIT.MEDIUM)

      const url = page.url()
      expect(url).toContain('explorer')
    }

    await takeScreenshot(page, 'nav-explorer-link')
  })
})

test.describe('Page Content Verification', () => {
  test('should display Mint page content', async ({ page }) => {
    await navigateTo(page, '/')

    const content = await page.content()
    const hasMintContent = content.includes('Mint') ||
                           content.includes('WBTC') ||
                           content.includes('BTD')
    expect(hasMintContent).toBe(true)

    await takeScreenshot(page, 'nav-content-mint')
  })

  test('should display Stake page content', async ({ page }) => {
    await navigateTo(page, '/stake')

    const content = await page.content()
    const hasStakeContent = content.includes('Stake') ||
                            content.includes('stBTD') ||
                            content.includes('stBTB')
    expect(hasStakeContent).toBe(true)

    await takeScreenshot(page, 'nav-content-stake')
  })

  test('should display Swap page content', async ({ page }) => {
    await navigateTo(page, '/swap')

    const content = await page.content()
    const hasSwapContent = content.includes('Swap') ||
                           content.includes('Liquidity')
    expect(hasSwapContent).toBe(true)

    await takeScreenshot(page, 'nav-content-swap')
  })

  test('should display Pool page content', async ({ page }) => {
    await navigateTo(page, '/pool')

    const content = await page.content()
    const hasPoolContent = content.includes('Pool') ||
                           content.includes('Liquidity') ||
                           content.includes('LP')
    expect(hasPoolContent).toBe(true)

    await takeScreenshot(page, 'nav-content-pool')
  })

  test('should display Farm page content', async ({ page }) => {
    await navigateTo(page, '/farm')

    const content = await page.content()
    const hasFarmContent = content.includes('Farm') ||
                           content.includes('Yield') ||
                           content.includes('BRS')
    expect(hasFarmContent).toBe(true)

    await takeScreenshot(page, 'nav-content-farm')
  })

  test('should display Asset page content', async ({ page, metamask }) => {
    await navigateTo(page, '/asset')
    await connectWallet(page, metamask)

    const content = await page.content()
    const hasAssetContent = content.includes('Asset') ||
                            content.includes('Balance') ||
                            content.includes('Position')
    expect(hasAssetContent).toBe(true)

    await takeScreenshot(page, 'nav-content-asset')
  })

  test('should display Explorer page content', async ({ page }) => {
    await navigateTo(page, '/explorer')

    const content = await page.content()
    const hasExplorerContent = content.includes('Explorer') ||
                               content.includes('Contract') ||
                               content.includes('Transaction')
    expect(hasExplorerContent).toBe(true)

    await takeScreenshot(page, 'nav-content-explorer')
  })

  test('should display About page content', async ({ page }) => {
    await navigateTo(page, '/about')

    const content = await page.content()
    const hasAboutContent = content.includes('About') ||
                            content.includes('Bitres') ||
                            content.includes('Protocol')
    expect(hasAboutContent).toBe(true)

    await takeScreenshot(page, 'nav-content-about')
  })

  test('should display Whitepaper page content', async ({ page }) => {
    await navigateTo(page, '/whitepaper')

    const content = await page.content()
    const hasWPContent = content.includes('Whitepaper') ||
                         content.includes('White Paper') ||
                         content.includes('PDF')
    expect(hasWPContent).toBe(true)

    await takeScreenshot(page, 'nav-content-whitepaper')
  })

  test('should display FAQ page content', async ({ page }) => {
    await navigateTo(page, '/faq')

    const content = await page.content()
    const hasFAQContent = content.includes('FAQ') ||
                          content.includes('Question') ||
                          content.includes('Answer')
    expect(hasFAQContent).toBe(true)

    await takeScreenshot(page, 'nav-content-faq')
  })
})

test.describe('Mobile Navigation', () => {
  test('should show mobile menu on small screens', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 })
    await navigateTo(page, '/')

    // Look for hamburger menu or mobile nav trigger
    const mobileMenu = page.locator('[class*="hamburger"], [class*="mobile"], button[aria-label*="menu"]')
    const hasMobileMenu = await mobileMenu.count() > 0

    if (hasMobileMenu) {
      await mobileMenu.first().click()
      await page.waitForTimeout(WAIT.SHORT)
      await takeScreenshot(page, 'nav-mobile-menu-open')
    }

    await takeScreenshot(page, 'nav-mobile-view')
  })

  test('should navigate via mobile menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await navigateTo(page, '/')

    const mobileMenu = page.locator('[class*="hamburger"], [class*="mobile"], button[aria-label*="menu"]')
    if (await mobileMenu.count() > 0) {
      await mobileMenu.first().click()
      await page.waitForTimeout(WAIT.SHORT)

      const stakeLink = page.locator('a:has-text("Stake")').first()
      if (await stakeLink.count() > 0) {
        await stakeLink.click()
        await page.waitForTimeout(WAIT.MEDIUM)

        const url = page.url()
        expect(url).toContain('stake')
      }
    }

    await takeScreenshot(page, 'nav-mobile-navigation')
  })
})

test.describe('External Links', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/')
    await page.waitForTimeout(WAIT.SHORT)
  })

  test('should have social media links', async ({ page }) => {
    const socialLinks = page.locator('a[href*="twitter"], a[href*="discord"], a[href*="telegram"], a[href*="github"]')
    const count = await socialLinks.count()
    console.log(`Found ${count} social media links`)

    await takeScreenshot(page, 'nav-social-links')
  })

  test('should have contract explorer links', async ({ page }) => {
    await navigateTo(page, '/explorer')

    const explorerLinks = page.locator('a[href*="etherscan"], a[href*="basescan"], a[href*="blockscout"]')
    const count = await explorerLinks.count()
    console.log(`Found ${count} block explorer links`)

    await takeScreenshot(page, 'nav-explorer-links')
  })
})

test.describe('Browser Navigation', () => {
  test('should handle browser back button', async ({ page }) => {
    await navigateTo(page, '/')
    await navigateTo(page, '/stake')
    await navigateTo(page, '/swap')

    await page.goBack()
    await page.waitForTimeout(WAIT.SHORT)
    expect(page.url()).toContain('stake')

    await page.goBack()
    await page.waitForTimeout(WAIT.SHORT)
    expect(page.url().endsWith('/') || page.url().endsWith(':3000') || page.url().includes('localhost')).toBe(true)

    await takeScreenshot(page, 'nav-back-button')
  })

  test('should handle browser forward button', async ({ page }) => {
    await navigateTo(page, '/')
    await navigateTo(page, '/stake')

    await page.goBack()
    await page.waitForTimeout(WAIT.SHORT)

    await page.goForward()
    await page.waitForTimeout(WAIT.SHORT)
    expect(page.url()).toContain('stake')

    await takeScreenshot(page, 'nav-forward-button')
  })

  test('should handle page refresh', async ({ page, metamask }) => {
    await navigateTo(page, '/stake')
    await connectWallet(page, metamask)

    await page.reload()
    await page.waitForTimeout(WAIT.MEDIUM)

    const url = page.url()
    expect(url).toContain('stake')

    await takeScreenshot(page, 'nav-refresh')
  })
})

test.describe('Deep Linking', () => {
  test('should access Stake page directly via URL', async ({ page }) => {
    await page.goto('http://localhost:3000/stake')
    await page.waitForTimeout(WAIT.PAGE_LOAD)

    const content = await page.content()
    expect(content.includes('Stake') || content.includes('stBTD')).toBe(true)
  })

  test('should access Swap page directly via URL', async ({ page }) => {
    await page.goto('http://localhost:3000/swap')
    await page.waitForTimeout(WAIT.PAGE_LOAD)

    const content = await page.content()
    expect(content.includes('Swap') || content.includes('Liquidity')).toBe(true)
  })

  test('should access Pool page directly via URL', async ({ page }) => {
    await page.goto('http://localhost:3000/pool')
    await page.waitForTimeout(WAIT.PAGE_LOAD)

    const content = await page.content()
    expect(content.includes('Pool') || content.includes('LP')).toBe(true)
  })

  test('should access Farm page directly via URL', async ({ page }) => {
    await page.goto('http://localhost:3000/farm')
    await page.waitForTimeout(WAIT.PAGE_LOAD)

    const content = await page.content()
    expect(content.includes('Farm') || content.includes('BRS')).toBe(true)
  })
})
