import { defineWalletSetup } from '@synthetixio/synpress'
import { MetaMask } from '@synthetixio/synpress/playwright'

// Hardhat test account #0 seed phrase
const SEED_PHRASE = 'test test test test test test test test test test test junk'
const PASSWORD = 'Tester@1234'

export default defineWalletSetup(PASSWORD, async (context, walletPage) => {
  const metamask = new MetaMask(context, walletPage, PASSWORD)

  // Import wallet using seed phrase
  await metamask.importWallet(SEED_PHRASE)

  // Add Hardhat local network
  await metamask.addNetwork({
    name: 'Hardhat',
    rpcUrl: 'http://localhost:8545',
    chainId: 31337,
    symbol: 'ETH',
  })

  // Switch to Hardhat network
  await metamask.switchNetwork('Hardhat')
})
