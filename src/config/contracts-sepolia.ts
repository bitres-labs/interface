// Bitres Contract Addresses - Sepolia Testnet (Chain ID: 11155111)
// Auto-generated from Ignition deployment: FullSystemSepolia
// Last updated: 2025-12-27

export const CONTRACTS_SEPOLIA = {
  // Mock Tokens (our deployment for testing)
  WBTC: '0x21fe6147Bf502E6D0B2a1D5A10fC03955e3530D6' as `0x${string}`,
  USDC: '0x797126c49eA522f4a1701d8e353f93D1E256dB3E' as `0x${string}`,
  USDT: '0xeEA1a231D6C72B884B040b1a412583668C846332' as `0x${string}`,
  WETH: '0x79b3f17Fe0519E7112Da567D22Acd0906B97461D' as `0x${string}`,

  // Core Tokens
  BRS: '0x13C8BfbC335e93a2c8078de5EBBe1c3579EEE4b2' as `0x${string}`,
  BTD: '0x289f174B7f1D301B18c8De24972048C92f2EC6B4' as `0x${string}`,
  BTB: '0xe027be739cFccf3d8C1Ad20008AdbcA635B54bEe' as `0x${string}`,

  // Staking Tokens (ERC4626)
  stBTD: '0x5D838fdE9F612B2a06505432646202f346C8afC5' as `0x${string}`,
  stBTB: '0x0492afb3C10Aa5c0Ac136157D6f2Cf4c129A0b0e' as `0x${string}`,

  // Oracles
  ChainlinkBTCUSD: '0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43' as `0x${string}`,  // Real Chainlink feed
  ChainlinkWBTCBTC: '0xFa5c0847E7BdBD527341eb58b8Ef92A004a81343' as `0x${string}`, // Mock (1:1)
  MockPyth: '0xDb44663eEdDf0f905489c1AcA9C8DC3fB4E84534' as `0x${string}`,
  MockRedstone: '0xb0002ad8971b6f97D6dBD265C3255E29Ab784d3A' as `0x${string}`,
  IdealUSDManager: '0x11bd2ca6a6060a445c170B3f32aed4B822C8563c' as `0x${string}`,
  PriceOracle: '0xa0e776576b685F083386d286526D5d72eD988dF5' as `0x${string}`,
  TWAPOracle: '0x6F4B2d3b878CED1A07Fa81F1Bb0faa9f2f383cE9' as `0x${string}`,

  // Uniswap V2 Pairs (our own deployment)
  BTBBTDPair: '0x351bCc368016af556c340E99ed2d195ec5505cd5' as `0x${string}`,
  BRSBTDPair: '0x73D5E2A60fA5Be805A4261eB57a524E9AD753321' as `0x${string}`,
  BTDUSDCPair: '0xc0eA9877E3998C1C2a1a6aea1c4476533472EeBe' as `0x${string}`,
  WBTCUSDCPair: '0x07315bE96dfb7ac66D5357498dC31143A0784bac' as `0x${string}`,

  // Core Contracts
  ConfigCore: '0x2Ea137cE51D41f649B2c013C2A92904156062569' as `0x${string}`,
  ConfigGov: '0xD6ef3DE5ce7C0C915D51dBdca1f1A7C70227C762' as `0x${string}`,
  Config: '0x2Ea137cE51D41f649B2c013C2A92904156062569' as `0x${string}`,  // alias
  Treasury: '0x6DAaEAB4A2048D25b2Be86637e723059803508f1' as `0x${string}`,
  Minter: '0x2D8f61935c604Fe0a0d62dF5F671AF203dFbb511' as `0x${string}`,
  InterestPool: '0xFD41128585a08Cc847143701c9bb06b0b561d724' as `0x${string}`,
  FarmingPool: '0x2Ce8E8B844B2913ff29B7f76D23Ed037bfaB97fC' as `0x${string}`,
  StakingRouter: '0x5492957Ed4d49BC7B121Acd310FFd8AAE8B0d664' as `0x${string}`,
}

export const NETWORK_CONFIG_SEPOLIA = {
  chainId: 11155111,
  chainName: 'Sepolia Testnet',
  rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
  blockExplorer: 'https://sepolia.etherscan.io',
}

export default CONTRACTS_SEPOLIA
