import { expect, test } from '@playwright/test'

test.describe('Mint UI smoke', () => {
  test('shows mint inputs and basic controls', async ({ page }) => {
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })

    const mintTab = page.getByRole('button', { name: /^mint$/i }).first()
    if (await mintTab.count()) {
      await mintTab.click()
    }

    const amountInput = page.locator('input[type="number"], input[inputmode="decimal"]').first()
    await expect(amountInput).toBeVisible()

    const maxButton = page.getByRole('button', { name: /max/i }).first()
    await expect(maxButton).toBeVisible()

    const mintButton = page.getByRole('button', { name: /^mint$/i }).first()
    await expect(mintButton).toBeVisible()
  })
})
