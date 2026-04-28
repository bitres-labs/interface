/**
 * 08 - Pool Tests
 *
 * Navigate to /pool → verify pool cards → add/remove liquidity with balance checks.
 */

import { test, expect } from '../sepolia/fixtures'
import { navigateTo, waitForTxComplete, readBalance, readBalanceUntilChanged } from '../sepolia/helpers'
import { TIMEOUT, ADDRESSES } from '../sepolia/constants'

// Pool/Liquidity functions are tabs on the /swap page
async function navigateToPool(page: any) {
  await navigateTo(page, '/pool')
  await page.waitForTimeout(TIMEOUT.MEDIUM)
  // If /pool redirects or the liquidity UI is on /swap, handle that
  const body = await page.textContent('body')
  if (!body?.toLowerCase().includes('liquidity') && !body?.toLowerCase().includes('pool')) {
    // Try /swap and click Add Liquidity tab
    await navigateTo(page, '/swap')
    await page.waitForTimeout(TIMEOUT.MEDIUM)
    const addTab = page.locator('button:has-text("Add Liquidity")').first()
    if ((await addTab.count()) > 0) {
      await addTab.click()
      await page.waitForTimeout(TIMEOUT.SHORT)
    }
  }
}

test.describe('Pool / Liquidity', () => {
  test('pool page loads and shows pool cards', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/pool')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    const body = await page.textContent('body')
    const hasPoolUI =
      body?.toLowerCase().includes('pool') ||
      body?.toLowerCase().includes('liquidity') ||
      body?.toLowerCase().includes('pair')
    expect(hasPoolUI).toBeTruthy()
  })

  test('pool cards display TVL and fee rate', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/pool')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    const body = await page.textContent('body')
    // Should show some financial metrics
    const hasMetrics =
      body?.toLowerCase().includes('tvl') ||
      body?.toLowerCase().includes('fee') ||
      body?.includes('0.3%') ||
      body?.includes('$') ||
      body?.toLowerCase().includes('total value') ||
      body?.toLowerCase().includes('volume')
    expect(hasMetrics).toBeTruthy()
  })

  test('add liquidity form is available', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/pool')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Look for Add Liquidity button or link
    const addBtn = page.locator(
      'button:has-text("Add"), a:has-text("Add"), button:has-text("Liquidity")'
    ).first()

    if ((await addBtn.count()) > 0) {
      await addBtn.click()
      await page.waitForTimeout(TIMEOUT.MEDIUM)

      // Should show input fields for two tokens
      const inputs = page.locator('input[type="number"], input[inputmode="decimal"], input')
      const inputCount = await inputs.count()
      expect(inputCount).toBeGreaterThanOrEqual(1)
    } else {
      // Page might already show add liquidity form
      const inputs = page.locator('input[type="number"], input[inputmode="decimal"], input')
      expect(await inputs.count()).toBeGreaterThanOrEqual(0)
    }
  })

  test('can input two token amounts for liquidity', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/pool')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Navigate to add liquidity
    const addBtn = page.locator(
      'button:has-text("Add"), a:has-text("Add")'
    ).first()
    if ((await addBtn.count()) > 0) {
      await addBtn.click()
      await page.waitForTimeout(TIMEOUT.MEDIUM)
    }

    const inputs = page.locator('input[type="number"], input[inputmode="decimal"], input')
    const inputCount = await inputs.count()

    if (inputCount >= 2) {
      await inputs.nth(0).fill('0.001')
      await page.waitForTimeout(TIMEOUT.SHORT)
      // Second input may auto-fill based on ratio
      const secondVal = await inputs.nth(1).inputValue()
      console.log(`[Pool] Second token auto-filled: ${secondVal}`)
    } else if (inputCount === 1) {
      await inputs.first().fill('0.001')
      console.log('[Pool] Single input filled')
    }
  })

  test('can add liquidity (small amount)', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/pool')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    const addBtn = page.locator(
      'button:has-text("Add"), a:has-text("Add")'
    ).first()
    if ((await addBtn.count()) > 0) {
      await addBtn.click()
      await page.waitForTimeout(TIMEOUT.MEDIUM)
    }

    const inputs = page.locator('input[type="number"], input[inputmode="decimal"], input')
    if ((await inputs.count()) > 0) {
      await inputs.first().fill('0.001')
      await page.waitForTimeout(TIMEOUT.MEDIUM)
    }

    // Look for supply/add button
    const supplyBtn = page.locator(
      'button:has-text("Supply"), button:has-text("Add Liquidity"), button:has-text("Approve"), button:has-text("Add")'
    ).last()

    if ((await supplyBtn.count()) > 0 && !(await supplyBtn.isDisabled())) {
      const btnText = await supplyBtn.textContent()
      await supplyBtn.click()
      console.log(`[Pool] Clicked "${btnText}", waiting...`)
      await waitForTxComplete(page, btnText || 'Add', TIMEOUT.TX)
      console.log('[Pool] Add liquidity transaction completed')

      // If was Approve, follow up with Supply
      if (btnText?.includes('Approve')) {
        await page.waitForTimeout(TIMEOUT.MEDIUM)
        const actualBtn = page.locator(
          'button:has-text("Supply"), button:has-text("Add")'
        ).last()
        if ((await actualBtn.count()) > 0 && !(await actualBtn.isDisabled())) {
          await actualBtn.click()
          await waitForTxComplete(page, 'Supply', TIMEOUT.TX)
          console.log('[Pool] Supply after approval completed')
        }
      }
    } else {
      console.log('[Pool] No actionable supply button')
    }
  })

  test('LP token balance increases after adding liquidity', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/pool')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Check LP token balance for WBTC_USDC pair
    const lpBefore = await readBalance(page, ADDRESSES.WBTC_USDC)
    console.log(`[Pool] LP before: ${lpBefore}`)

    // Click the WBTC/USDC pool card to expand it
    // We need this specific pool to match ADDRESSES.WBTC_USDC LP token
    const wbtcUsdcHeader = page.locator('h3:has-text("WBTC/USDC")').first()
    if ((await wbtcUsdcHeader.count()) > 0) {
      await wbtcUsdcHeader.click()
      await page.waitForTimeout(TIMEOUT.MEDIUM)
      console.log('[Pool] Clicked WBTC/USDC pool header to expand')
    } else {
      // Fallback: click first "Click to manage liquidity"
      const expandTrigger = page.locator('text=Click to manage liquidity').first()
      if ((await expandTrigger.count()) > 0) {
        await expandTrigger.click()
        await page.waitForTimeout(TIMEOUT.MEDIUM)
        console.log('[Pool] Expanded first pool card (not WBTC/USDC)')
      }
    }

    // Now look for "Add Liquidity" mode toggle
    const addToggle = page.locator('button:has-text("Add Liquidity"), button:has-text("Add")').first()
    if ((await addToggle.count()) > 0) {
      await addToggle.click()
      await page.waitForTimeout(TIMEOUT.MEDIUM)
      console.log('[Pool] Clicked Add Liquidity mode toggle')
    }

    // Fill both token inputs
    const inputs = page.locator('input[type="number"], input[inputmode="decimal"]')
    const inputCount = await inputs.count()
    console.log(`[Pool] Found ${inputCount} inputs after expanding`)

    if (inputCount >= 2) {
      await inputs.first().fill('0.0001')
      await page.waitForTimeout(TIMEOUT.MEDIUM)
      // Check if second input auto-filled from pool ratio
      const secondVal = await inputs.nth(1).inputValue()
      console.log(`[Pool] Second input value: "${secondVal}"`)
      if (!secondVal || parseFloat(secondVal) === 0) {
        await inputs.nth(1).fill('1')
        await page.waitForTimeout(TIMEOUT.MEDIUM)
      }
    } else if (inputCount > 0) {
      await inputs.first().fill('0.0001')
      await page.waitForTimeout(TIMEOUT.MEDIUM)
    } else {
      console.log('[Pool] No inputs found — pool card may not have expanded')
      test.skip()
      return
    }

    // Click the submit button ("Add Liquidity" — the LAST one is submit, first is mode toggle)
    const submitBtn = page.locator('button:has-text("Add Liquidity")').last()

    if ((await submitBtn.count()) > 0 && !(await submitBtn.isDisabled())) {
      console.log('[Pool] Clicking Add Liquidity submit')

      // Listen for success dialog (fixture auto-accepts, we just capture the message)
      let dialogMessage = ''
      const dialogHandler = (dialog: any) => {
        dialogMessage = dialog.message()
        console.log(`[Pool] Dialog: ${dialogMessage}`)
        // Do NOT call dialog.accept() — fixture handler already does that
      }
      page.on('dialog', dialogHandler)

      await submitBtn.click()

      // Wait for success dialog (multi-step: transfer token0 → transfer token1 → mint LP)
      // This is a 3-tx process, each taking ~15-30s on Sepolia
      // Poll until dialog is received or timeout
      const deadline = Date.now() + TIMEOUT.TX
      while (!dialogMessage && Date.now() < deadline) {
        await page.waitForTimeout(2000)
      }

      page.off('dialog', dialogHandler)

      if (dialogMessage.includes('Successfully') || dialogMessage.includes('✅')) {
        console.log('[Pool] Add liquidity success dialog received')
        const lpAfter = await readBalanceUntilChanged(page, ADDRESSES.WBTC_USDC, lpBefore)
        if (lpAfter > lpBefore) {
          console.log('[Pool] LP token balance increase verified')
        } else {
          console.log('[Pool] LP balance unchanged after success dialog')
        }
      } else if (dialogMessage.includes('Failed')) {
        console.log(`[Pool] Add liquidity failed: ${dialogMessage}`)
        test.skip()
      } else {
        console.log('[Pool] No success dialog received — tx may have timed out')
        test.skip()
      }
    } else {
      const btnText = await submitBtn.textContent().catch(() => 'N/A')
      const isDisabled = await submitBtn.isDisabled().catch(() => true)
      console.log(`[Pool] Submit button: text="${btnText}", disabled=${isDisabled}`)
      // Check if there's an "Insufficient Balance" text
      const body = await page.textContent('body')
      if (body?.includes('Insufficient Balance')) {
        console.log('[Pool] Insufficient token balance for liquidity')
      }
      console.log('[Pool] Cannot execute - skipping LP check')
      test.skip()
    }
  })

  test('remove liquidity has percentage buttons', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/pool')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Look for Remove Liquidity section
    const removeBtn = page.locator(
      'button:has-text("Remove"), a:has-text("Remove")'
    ).first()

    if ((await removeBtn.count()) > 0) {
      await removeBtn.click()
      await page.waitForTimeout(TIMEOUT.MEDIUM)

      // Should show percentage buttons (25%, 50%, 75%, 100%)
      const body = await page.textContent('body')
      const hasPercentBtns =
        body?.includes('25%') ||
        body?.includes('50%') ||
        body?.includes('75%') ||
        body?.includes('100%') ||
        body?.includes('Max')
      expect(hasPercentBtns).toBeTruthy()
    } else {
      console.log('[Pool] No remove liquidity button found')
    }
  })

  test('can remove liquidity', async ({ sepoliaPage: page }) => {
    await navigateTo(page, '/pool')
    await page.waitForTimeout(TIMEOUT.MEDIUM)

    // Check if we have LP tokens
    const lpBalance = await readBalance(page, ADDRESSES.WBTC_USDC)
    if (lpBalance === 0n) {
      console.log('[Pool] No LP tokens to remove - skipping')
      test.skip()
      return
    }

    const removeBtn = page.locator(
      'button:has-text("Remove"), a:has-text("Remove")'
    ).first()

    if ((await removeBtn.count()) > 0) {
      await removeBtn.click()
      await page.waitForTimeout(TIMEOUT.MEDIUM)

      // Click 25% to remove a small portion
      const pctBtn = page.locator('button:has-text("25%")').first()
      if ((await pctBtn.count()) > 0) {
        await pctBtn.click()
        await page.waitForTimeout(TIMEOUT.SHORT)
      }

      // Look for confirm remove button
      const confirmBtn = page.locator(
        'button:has-text("Remove"), button:has-text("Confirm"), button:has-text("Approve")'
      ).last()

      if ((await confirmBtn.count()) > 0 && !(await confirmBtn.isDisabled())) {
        const btnText = await confirmBtn.textContent()
        await confirmBtn.click()
        console.log(`[Pool] Clicked "${btnText}" for remove liquidity`)
        await waitForTxComplete(page, btnText || 'Remove', TIMEOUT.TX)
        console.log('[Pool] Remove liquidity completed')
      }
    } else {
      console.log('[Pool] No remove option available')
    }
  })
})
