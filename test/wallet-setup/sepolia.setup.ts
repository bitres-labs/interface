import { defineWalletSetup } from '@synthetixio/synpress'
import { MetaMask } from '@synthetixio/synpress/playwright'

// Get seed phrase from environment variable
const SEED_PHRASE = process.env.TEST_SEED_PHRASE || ''
const PASSWORD = 'Tester@1234'

if (!SEED_PHRASE) {
  console.warn('WARNING: TEST_SEED_PHRASE not set. Wallet tests will fail.')
}

export default defineWalletSetup(PASSWORD, async (context, walletPage) => {
  const metamask = new MetaMask(context, walletPage, PASSWORD)

  // Import wallet using seed phrase
  await metamask.importWallet(SEED_PHRASE)

  // Switch to Sepolia network (built-in to MetaMask)
  await metamask.switchNetwork('Sepolia')
})
