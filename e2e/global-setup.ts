/**
 * Global Setup for Sepolia E2E Tests
 *
 * Runs once before all tests to ensure Oracle prices are synced.
 */

import { syncOraclePrice } from './sepolia/oracle-sync.js'

async function globalSetup() {
  // Only run for sepolia project
  if (process.env.PLAYWRIGHT_PROJECT === 'sepolia' || !process.env.PLAYWRIGHT_PROJECT) {
    try {
      await syncOraclePrice()
    } catch (e: any) {
      console.log(`[GlobalSetup] Oracle sync failed (non-fatal): ${e.message?.split('\n')[0]}`)
    }
  }
}

export default globalSetup
