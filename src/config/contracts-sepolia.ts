// Bitres Contract Addresses - Sepolia Testnet (Chain ID: 11155111)
// Auto-generated from Ignition deployment: FullSystemSepolia
// Last updated: 2025-12-28

export const CONTRACTS_SEPOLIA = {
  // Mock Tokens (our deployment for testing)
  WBTC: '0x7A945c8B5ca13a82bf554A6B7b3894B7C1c3aC3a' as `0x${string}`,
  USDC: '0x9F93d1D7d45C201c57A8c5DD88D97952C0018D29' as `0x${string}`,
  USDT: '0xA9142324F7F6e698E004a6701D458330C18266Ce' as `0x${string}`,
  WETH: '0x444EdAebE827fF8825223a373836577d8A8A5fbc' as `0x${string}`,

  // Core Tokens
  BRS: '0x032B73f7bD14732ab48F90bc392f004B8CD5E85F' as `0x${string}`,
  BTD: '0x256B5353b19aC1C9bcd8D9F2DDb1D1261536F626' as `0x${string}`,
  BTB: '0xeb047790217E1ad0118aDD43D0Fb08Ef28290Ff2' as `0x${string}`,

  // Staking Tokens (ERC4626)
  stBTD: '0x2AA6480e5394a99E9D030870E89b21D8c8C192e4' as `0x${string}`,
  stBTB: '0xF9289c8B5ca13a82bf554A6B7b3894B7C1c3aC3a' as `0x${string}`,

  // Oracles
  ChainlinkBTCUSD: '0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43' as `0x${string}`,  // Real Chainlink feed
  ChainlinkETHUSD: '0x694AA1769357215DE4FAC081bf1f309aDC325306' as `0x${string}`,  // Real Chainlink feed
  ChainlinkWBTCBTC: '0xfe67e85888e63A702e7B727639e46d44Dde2398E' as `0x${string}`,
  MockPyth: '0x455f13fDe5643FE682efa0FA2b333De798E8990b' as `0x${string}`,
  MockRedstone: '0x5B9aF7C13F71933ac7BF6209A857026323733a17' as `0x${string}`,
  IdealUSDManager: '0x3597b47F69f4584798dd89502c39C768618F1b52' as `0x${string}`,
  PriceOracle: '0xEd6331Ea4aF01d6ad78B4b8f58d6B560307cc778' as `0x${string}`,
  TWAPOracle: '0xDAe58148743fD5C3142f638FF13a89d77E03866C' as `0x${string}`,

  // Uniswap V2 Pairs (our own deployment)
  BTBBTDPair: '0x728767C143Cf475f8515dded91cCFbea46Cd913d' as `0x${string}`,
  BRSBTDPair: '0xE30E3eD48d2D9034C98c3fD83383b2c6a158F1F9' as `0x${string}`,
  BTDUSDCPair: '0x8F8b8CFB0DB63d936ab6904F5f53678A9fc204f8' as `0x${string}`,
  WBTCUSDCPair: '0x2D81ca6aee91671380e6707CB916e9187Ebf73E1' as `0x${string}`,

  // Core Contracts
  ConfigCore: '0xFB22D9F847618C8E06fA30F200b4534204F0592C' as `0x${string}`,
  ConfigGov: '0xEA8F3E67795F1f8969FfC6d615D91A328b5E08dE' as `0x${string}`,
  Config: '0xFB22D9F847618C8E06fA30F200b4534204F0592C' as `0x${string}`,  // alias
  Treasury: '0x98Aa30EFC5bD306091c155e4bEA26BFC72160485' as `0x${string}`,
  Minter: '0xBdaebDb50cF72fF55bd875F20dA06C5b58A5f110' as `0x${string}`,
  InterestPool: '0xB15d09476E67554D670bd07E8Cd8C31DE4984b4e' as `0x${string}`,
  FarmingPool: '0xC8B17f8BAFD7CE7147d1127Cc9E6D2998de51c84' as `0x${string}`,
  StakingRouter: '0xf43f634e1756A8Cd466D0c62D2D1dc7724CA8ECD' as `0x${string}`,
}

export const NETWORK_CONFIG_SEPOLIA = {
  chainId: 11155111,
  chainName: 'Sepolia Testnet',
  rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
  blockExplorer: 'https://sepolia.etherscan.io',
}

export default CONTRACTS_SEPOLIA
