import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_SERVER === 'true' || !process.env.CI
const retries = Number(process.env.PLAYWRIGHT_RETRIES ?? (process.env.CI ? 2 : 1))

// Load environment variables from .env files
dotenv.config({ path: path.resolve(__dirname, '.env') })
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

/**
 * Playwright E2E Test Configuration
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: './e2e',

  // Global setup: sync Oracle prices for Sepolia tests
  globalSetup: './e2e/global-setup.ts',

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: 'html',

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://localhost:3000',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'sepolia',
      testDir: './e2e/specs',
      timeout: 180 * 1000,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'https://bitres.org',
        actionTimeout: 30 * 1000,
      },
    },
  ],

  // Run your local dev server before starting the tests (chromium project only)
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer,
    timeout: 120 * 1000,
  },
})
