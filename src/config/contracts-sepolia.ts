// Bitres Contract Addresses - Sepolia Testnet (Chain ID: 11155111)
// Auto-generated from Ignition deployment: FullSystemSepolia
// Last updated: 2025-12-26

export const CONTRACTS_SEPOLIA = {
  // Mock Tokens (our deployment for testing)
  WBTC: '0x8A039012D394546975Dbe226d3aF65ECDb330CdF' as `0x${string}`,
  USDC: '0xe334638a1E13f401192aace9847902506e54896E' as `0x${string}`,
  USDT: '0x485104B36e2feb49fbB1682A9F970ba4DeE32486' as `0x${string}`,
  WETH: '0x90349Ef644cff8a62baB72A77366101a9432385C' as `0x${string}`,

  // Core Tokens
  BRS: '0x5af09d6660db34AEC6638EA9C14F00c069120356' as `0x${string}`,
  BTD: '0x4e7a23F4d22A1Fb6eA9898a3FC1E4f228BE9131c' as `0x${string}`,
  BTB: '0xd055e39aD8F9e35eBcF72E7d9FE91aB479c04be1' as `0x${string}`,

  // Staking Tokens (ERC4626)
  stBTD: '0x0D2b32d6AE7C7150070138479b5d0494Db698F04' as `0x${string}`,
  stBTB: '0x1402c8DE5710b0D8E67d7af8eBe24F459F9323E1' as `0x${string}`,

  // Oracles
  ChainlinkBTCUSD: '0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43' as `0x${string}`,  // Real Chainlink feed
  ChainlinkWBTCBTC: '0xEC25D05E8F663284169C20811Cd2A67B841111fd' as `0x${string}`, // Mock (1:1)
  MockPyth: '0x0c960B665CAa4c11e107376C453589BAc5fAeE61' as `0x${string}`,
  MockRedstone: '0xD87Eb13499375F57C59dB8b336aA19be0165FD3D' as `0x${string}`,
  IdealUSDManager: '0x0986301e69dd8137cC6915Cb945a56279f0d21d6' as `0x${string}`,
  PriceOracle: '0xb6396a8fC224A327dd88894b618062df07247ADF' as `0x${string}`,
  TWAPOracle: '0x23a18B8Dbb8E69e7526297740238f7c45F660B42' as `0x${string}`,

  // Uniswap V2 Pairs (our own deployment)
  BTBBTDPair: '0xfC0E030546D4E20A08818280BEEF50a41E669eb0' as `0x${string}`,
  BRSBTDPair: '0xdD57732ac64828b2d49aC2DFfe17b70198c3f087' as `0x${string}`,
  BTDUSDCPair: '0x713b10fD9A864a2ccA25870A5661eb759909aeC4' as `0x${string}`,
  WBTCUSDCPair: '0xD2E8F9B130216Dde52428DA7b031a81758c576dC' as `0x${string}`,

  // Core Contracts
  ConfigCore: '0xd51BD70cFfe4b94c6B0cD9EC6E150e1cecb7B613' as `0x${string}`,
  ConfigGov: '0x891AC38F584144E8d1d3FAE325F1F9598b918D6A' as `0x${string}`,
  Config: '0xd51BD70cFfe4b94c6B0cD9EC6E150e1cecb7B613' as `0x${string}`,  // alias
  Treasury: '0x94Fe2a85d021E2412d03b42f0a8A24016d54efC2' as `0x${string}`,
  Minter: '0x50ed7d062169Cc6318FA89648500115f522e24Cb' as `0x${string}`,
  InterestPool: '0x5d5252013ccC99F226fD93E3C0974809f89D273a' as `0x${string}`,
  FarmingPool: '0xf04Bc786215C3b2D362844056cBDD7E75af0EECf' as `0x${string}`,
  StakingRouter: '0x0cab3ffbaEFcd50eBe708dBdf34D014568c330b9' as `0x${string}`,
}

export const NETWORK_CONFIG_SEPOLIA = {
  chainId: 11155111,
  chainName: 'Sepolia Testnet',
  rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
  blockExplorer: 'https://sepolia.etherscan.io',
}

export default CONTRACTS_SEPOLIA
