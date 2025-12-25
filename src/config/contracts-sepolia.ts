// Bitres Contract Addresses - Sepolia Testnet (Chain ID: 11155111)
// Auto-generated from Ignition deployment: FullSystemSepolia
// Last updated: 2025-12-25

export const CONTRACTS_SEPOLIA = {
  // Official Sepolia Testnet Tokens
  // Users can get these from standard faucets:
  // - WETH: Wrap ETH directly (Uniswap WETH9)
  // - USDC: faucet.circle.com
  // - WBTC/USDT: Aave faucet (app.aave.com -> Faucet)
  WBTC: '0x29f2D40B0605204364af54EC677bD022dA425d03' as `0x${string}`,  // Aave V3 testnet
  USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as `0x${string}`,  // Circle official
  USDT: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0' as `0x${string}`,  // Aave V3 testnet
  WETH: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14' as `0x${string}`,  // Uniswap WETH9

  // Core Tokens
  BRS: '0xFc06003c597c3846f1567f06caea0da3A3cA1317' as `0x${string}`,
  BTD: '0x6B348c913C3DB469330cB2AEE38C03d5a34E8b7F' as `0x${string}`,
  BTB: '0x41f83b087A65967Ae7A2f6b0627Ea560794DC52F' as `0x${string}`,

  // Staking Tokens (ERC4626)
  stBTD: '0xead259C29F5D3C968116129A30b17E8d2c68AFda' as `0x${string}`,
  stBTB: '0x1310f909Bd114c8De4ad1CBBcE44396Ef66615C1' as `0x${string}`,

  // Oracles
  ChainlinkBTCUSD: '0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43' as `0x${string}`,  // Real Chainlink feed
  ChainlinkWBTCBTC: '0x7b38E6b3DA8C435372C81578Ea9aAC66A5b64EAF' as `0x${string}`, // Mock (1:1)
  MockPyth: '0x85e89EB85D974E4176F3b9C483F3C618F29e3A40' as `0x${string}`,
  MockRedstone: '0x229DC59c4Ab4f7C4B10c05C315dd3775e3bc7C92' as `0x${string}`,
  IdealUSDManager: '0xdD0b39c75b785d073573179C7176C0Bb9859a3A5' as `0x${string}`,
  PriceOracle: '0xDf59cC48741FE8DEaf18546EFFD83D6b8a932669' as `0x${string}`,
  TWAPOracle: '0xC0b8f94EeBBa1f585E21777711e16c4082494061' as `0x${string}`,

  // Uniswap V2 Pairs (our own deployment)
  BTBBTDPair: '0x6b5a2836418Ff339da2031d67b5dF5B0B7608879' as `0x${string}`,
  BRSBTDPair: '0xE72299471E88C80Fe8d56766f01388b46611D9E8' as `0x${string}`,
  BTDUSDCPair: '0x02c97e4b154ed10C7f35e90Db4d2CDD31f961E97' as `0x${string}`,
  WBTCUSDCPair: '0xaf56b67be80E4D7004b28c1Fa24D4116CE8dEdF1' as `0x${string}`,

  // Core Contracts
  ConfigCore: '0x4B57d5eD3CBE5644EeFCF65bBcbBc79418857308' as `0x${string}`,
  ConfigGov: '0x03DbB3cC421252567444525f005628F516a070d0' as `0x${string}`,
  Config: '0x4B57d5eD3CBE5644EeFCF65bBcbBc79418857308' as `0x${string}`,  // alias
  Treasury: '0x9692416ae11ea5b8832828aA0a189a6bfB1df844' as `0x${string}`,
  Minter: '0x3FcF9E82A2F629F74C99d0336c4E888A1AE5c15a' as `0x${string}`,
  InterestPool: '0x992516dA0F7Cf0531487Ec6cd2Fb68A9b80917E8' as `0x${string}`,
  FarmingPool: '0x6ee04C1Ed13B7c99F399142d065F53D86dC8fe8c' as `0x${string}`,
  StakingRouter: '0x0E668b023c74e9403d6A3d6bB3Cf56576E3e01b7' as `0x${string}`,
}

export const NETWORK_CONFIG_SEPOLIA = {
  chainId: 11155111,
  chainName: 'Sepolia Testnet',
  rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
  blockExplorer: 'https://sepolia.etherscan.io',
}

export default CONTRACTS_SEPOLIA
