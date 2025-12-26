import { expect, test, type Page } from '@playwright/test'

const BASE_URL = process.env.E2E_BASE_URL ?? 'https://bitres.org'

async function gotoPath(page: Page, path: string) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' })
}

test.describe('Bitres production smoke', () => {
  test('loads the homepage and shows key UI', async ({ page }) => {
    await gotoPath(page, '/')

    await expect(page).toHaveTitle(/bitres/i)
    const header = page.locator('header')
    await expect(header.getByRole('link', { name: /home/i })).toBeVisible()
    await expect(header.getByRole('button', { name: /trade/i }).first()).toBeVisible()
    await expect(header.getByRole('button', { name: /earn/i }).first()).toBeVisible()
    await expect(header.getByRole('link', { name: /data/i })).toBeVisible()
    await expect(header.getByRole('link', { name: /asset/i })).toBeVisible()

    const connectButton = header.getByTestId('rk-connect-button')
    await expect(connectButton).toBeVisible()
  })

  test('navigation tabs switch pages', async ({ page }) => {
    await gotoPath(page, '/')
    const header = page.locator('header')

    await header.getByRole('button', { name: /trade/i }).first().click()
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveURL(/\/swap$/i)

    await header.getByRole('button', { name: /earn/i }).first().click()
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveURL(/\/farm$/i)

    await header.getByRole('link', { name: /data/i }).click()
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveURL(/\/explorer$/i)

    await header.getByRole('link', { name: /asset/i }).click()
    await page.waitForLoadState('domcontentloaded')
    await expect(page).toHaveURL(/\/asset$/i)
  })
})

test.describe('Mint and Redeem UI', () => {
  test('shows mint tab inputs and disabled action', async ({ page }) => {
    await gotoPath(page, '/')

    const mintTab = page.getByRole('button', { name: /^mint$/i }).first()
    await mintTab.click()

    await expect(page.getByText('WBTC', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('BTD', { exact: true }).first()).toBeVisible()

    const amountInput = page.locator('input[type="number"], input[inputmode="decimal"]').first()
    await expect(amountInput).toBeVisible()
    await expect(page.getByRole('button', { name: /max/i }).first()).toBeVisible()

    const connectMint = page.locator('button:has-text("Connect Wallet")').filter({ hasText: /mint/i }).first()
    if (await connectMint.count()) {
      await expect(connectMint).toBeVisible()
    }
  })

  test('shows redeem tabs and breakdown', async ({ page }) => {
    await gotoPath(page, '/')

    const redeemBtdTab = page.getByRole('button', { name: /redeem btd/i }).first()
    await redeemBtdTab.click()
    await expect(page.getByText('WBTC', { exact: true }).first()).toBeVisible()

    const redeemBtbTab = page.getByRole('button', { name: /redeem btb/i }).first()
    await redeemBtbTab.click()
    await expect(page.getByText('BTB', { exact: true }).first()).toBeVisible()
  })
})

test.describe('Swap UI', () => {
  test('shows swap fields and token selectors', async ({ page }) => {
    await gotoPath(page, '/swap')

    await expect(page.getByRole('button', { name: /^swap$/i }).first()).toBeVisible()
    const inputs = page.locator('input[type="number"], input[inputmode="decimal"]')
    await expect(inputs.first()).toBeVisible()

    const selects = page.locator('select')
    expect(await selects.count()).toBeGreaterThan(0)

    const swapButton = page.getByRole('button', { name: /swap/i }).last()
    await expect(swapButton).toBeVisible()
  })
})

test.describe('Pool UI', () => {
  test('shows pool list and stats', async ({ page }) => {
    await gotoPath(page, '/pool')

    await expect(page.getByRole('heading', { name: /liquidity pools/i })).toBeVisible()
    const content = await page.content()
    expect(content.includes('Connect your wallet') || content.includes('Liquidity')).toBe(true)
  })
})

test.describe('Farm UI', () => {
  test('shows farm pools and APR info', async ({ page }) => {
    await gotoPath(page, '/farm')

    await expect(page.getByRole('heading', { name: /liquidity farming/i })).toBeVisible()
    const poolCards = page.locator('[class*="card"], [class*="pool"], [class*="farm"]')
    await expect(poolCards.first()).toBeVisible()

    const content = await page.content()
    expect(content.includes('APR') || content.includes('APY') || content.includes('TVL')).toBe(true)
  })
})

test.describe('Stake UI', () => {
  test('shows stake form elements', async ({ page }) => {
    await gotoPath(page, '/stake')

    await expect(page.getByRole('button', { name: /^stake$/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /unstake/i }).first()).toBeVisible()
    await expect(page.locator('input[type="number"], input[inputmode="decimal"]').first()).toBeVisible()
  })
})

test.describe('Data and Asset pages', () => {
  test('loads explorer page content', async ({ page }) => {
    await gotoPath(page, '/explorer')

    const content = await page.content()
    expect(content.includes('Explorer') || content.includes('Data') || content.includes('Transaction')).toBe(true)
  })

  test('loads asset page content', async ({ page }) => {
    await gotoPath(page, '/asset')

    const content = await page.content()
    expect(content.includes('Asset') || content.includes('Portfolio') || content.includes('Balance')).toBe(true)
  })
})
