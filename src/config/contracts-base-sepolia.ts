// Bitres Contract Addresses - Base Sepolia Testnet (Chain ID: 84532)
// Auto-generated from contracts-base-sepolia.json - DO NOT EDIT ADDRESSES MANUALLY

import contractsData from './contracts-base-sepolia.json'

const ZERO = '0x0000000000000000000000000000000000000000' as `0x${string}`
const { tokens, contracts, pairs, oracles } = contractsData
const uniswap = (
  contractsData as { uniswap?: { UniswapV2Factory?: string; UniswapV2Router?: string } }
).uniswap

const address = (value?: string) => (value || ZERO) as `0x${string}`

export const CONTRACTS_BASE_SEPOLIA = {
  // BTC collateral. The WBTC key is retained for legacy ABI/UI paths; it points to cbBTC on Base.
  WBTC: address(tokens.WBTC || tokens.cbBTC),
  cbBTC: address(tokens.cbBTC || tokens.WBTC),
  USDC: address(tokens.USDC),
  USDT: address(tokens.USDT),
  WETH: address(tokens.WETH || '0x4200000000000000000000000000000000000006'),

  // Core Tokens
  BRS: address(tokens.BRS),
  BTD: address(tokens.BTD),
  BTB: address(tokens.BTB),
  stBTD: address(tokens.stBTD),
  stBTB: address(tokens.stBTB),

  // Oracles
  ChainlinkBTCUSD: address(oracles.ChainlinkBTCUSD),
  ChainlinkETHUSD: ZERO,
  ChainlinkUSDCUSD: address(oracles.ChainlinkUSDCUSD),
  ChainlinkUSDTUSD: address(oracles.ChainlinkUSDTUSD),
  ChainlinkWBTCBTC: address(oracles.ChainlinkWBTCBTC),
  MockPyth: address(oracles.MockPyth),
  MockRedstone: ZERO,
  CPIOracle: ZERO,
  FFROracle: ZERO,
  IdealUSDManager: address(contracts.IdealUSDManager),
  PriceOracle: address(contracts.PriceOracle),
  TWAPOracle: address(contracts.TWAPOracle),

  // Uniswap V2 compatible bootstrap pairs
  BTBBTDPair: address(pairs.BTB_BTD),
  BRSBTDPair: address(pairs.BRS_BTD),
  BTDUSDCPair: address(pairs.BTD_USDC),
  WBTCUSDCPair: address(pairs.WBTC_USDC),

  // Core Contracts
  ConfigCore: address(contracts.ConfigCore),
  ConfigGov: address(contracts.ConfigGov),
  Config: address(contracts.ConfigCore),
  Treasury: address(contracts.Treasury),
  Minter: address(contracts.Minter),
  InterestPool: address(contracts.InterestPool),
  FarmingPool: address(contracts.FarmingPool),
  StakingRouter: ZERO,

  UniswapV2Factory: address(uniswap?.UniswapV2Factory),
  UniswapV2Router: address(uniswap?.UniswapV2Router),

  Faucet: address(contracts.Faucet),
}

export const NETWORK_CONFIG_BASE_SEPOLIA = {
  chainId: 84532,
  chainName: 'Base Sepolia',
  rpcUrl: 'https://base-sepolia-rpc.publicnode.com',
  blockExplorer: 'https://sepolia.basescan.org',
}

export default CONTRACTS_BASE_SEPOLIA
