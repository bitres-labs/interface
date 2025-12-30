// Bitres Contract Addresses - Sepolia Testnet (Chain ID: 11155111)
// Auto-generated from contracts.json - DO NOT EDIT MANUALLY
// Run deploy script in bitres repo to update contracts.json, this file imports from it

import contractsData from './contracts.json'

const { tokens, contracts, pairs, oracles } = contractsData
const uniswap = (contractsData as { uniswap?: { UniswapV2Factory?: string; UniswapV2Router?: string } }).uniswap

// Official Uniswap V2 on Sepolia (fallback if not in contracts.json)
const UNISWAP_V2_SEPOLIA = {
  FACTORY: '0xF62c03E08ada871A0bEb309762E260a7a6a880E6',
  ROUTER: '0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3',
}

export const CONTRACTS_SEPOLIA = {
  // Mock Tokens (from contracts.json)
  WBTC: tokens.WBTC as `0x${string}`,
  USDC: tokens.USDC as `0x${string}`,
  USDT: tokens.USDT as `0x${string}`,
  WETH: tokens.WETH as `0x${string}`,

  // Core Tokens
  BRS: tokens.BRS as `0x${string}`,
  BTD: tokens.BTD as `0x${string}`,
  BTB: tokens.BTB as `0x${string}`,

  // Staking Tokens (ERC4626)
  stBTD: tokens.stBTD as `0x${string}`,
  stBTB: tokens.stBTB as `0x${string}`,

  // Oracles - Chainlink Price Feeds on Sepolia
  ChainlinkBTCUSD: '0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43' as `0x${string}`,  // Real Chainlink BTC/USD
  ChainlinkETHUSD: '0x694AA1769357215DE4FAC081bf1f309aDC325306' as `0x${string}`,  // Real Chainlink ETH/USD
  ChainlinkUSDCUSD: '0x0000000000000000000000000000000000000000' as `0x${string}`, // Not available on Sepolia (mainnet: 0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6)
  ChainlinkUSDTUSD: '0x0000000000000000000000000000000000000000' as `0x${string}`, // Not available on Sepolia (mainnet: 0x3E7d1eAB13ad0104d2750B8863b489D65364e32D)
  ChainlinkWBTCBTC: oracles.ChainlinkWBTCBTC as `0x${string}`,
  MockPyth: oracles.MockPyth as `0x${string}`,
  MockRedstone: '0x0000000000000000000000000000000000000000' as `0x${string}`, // Not used on Sepolia
  IdealUSDManager: contracts.IdealUSDManager as `0x${string}`,
  PriceOracle: contracts.PriceOracle as `0x${string}`,
  TWAPOracle: contracts.TWAPOracle as `0x${string}`,

  // Uniswap V2 Pairs
  BTBBTDPair: pairs.BTB_BTD as `0x${string}`,
  BRSBTDPair: pairs.BRS_BTD as `0x${string}`,
  BTDUSDCPair: pairs.BTD_USDC as `0x${string}`,
  WBTCUSDCPair: pairs.WBTC_USDC as `0x${string}`,

  // Core Contracts
  ConfigCore: contracts.ConfigCore as `0x${string}`,
  ConfigGov: contracts.ConfigGov as `0x${string}`,
  Config: contracts.ConfigCore as `0x${string}`,  // alias
  Treasury: contracts.Treasury as `0x${string}`,
  Minter: contracts.Minter as `0x${string}`,
  InterestPool: contracts.InterestPool as `0x${string}`,
  FarmingPool: contracts.FarmingPool as `0x${string}`,
  StakingRouter: '0x0000000000000000000000000000000000000000' as `0x${string}`, // Removed from system

  // Official Uniswap V2 on Sepolia
  UniswapV2Factory: (uniswap?.UniswapV2Factory || UNISWAP_V2_SEPOLIA.FACTORY) as `0x${string}`,
  UniswapV2Router: (uniswap?.UniswapV2Router || UNISWAP_V2_SEPOLIA.ROUTER) as `0x${string}`,

  // Faucet (for test token distribution)
  Faucet: ((contracts as { Faucet?: string }).Faucet || '0x0000000000000000000000000000000000000000') as `0x${string}`,
}

export const NETWORK_CONFIG_SEPOLIA = {
  chainId: 11155111,
  chainName: 'Sepolia Testnet',
  rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
  blockExplorer: 'https://sepolia.etherscan.io',
}

export default CONTRACTS_SEPOLIA
