// Bitres Contract Addresses - Sepolia Testnet (Chain ID: 11155111)
// Auto-generated from contracts.json - DO NOT EDIT MANUALLY
// Run deploy script in bitres repo to update contracts.json, this file imports from it

import contractsData from './contracts.json'

const { tokens, contracts, pairs, oracles } = contractsData

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

  // Oracles
  ChainlinkBTCUSD: oracles.ChainlinkBTCUSD as `0x${string}`,
  ChainlinkETHUSD: '0x694AA1769357215DE4FAC081bf1f309aDC325306' as `0x${string}`,  // Real Chainlink feed (static)
  ChainlinkWBTCBTC: oracles.ChainlinkWBTCBTC as `0x${string}`,
  MockPyth: oracles.MockPyth as `0x${string}`,
  MockRedstone: oracles.MockRedstone as `0x${string}`,
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
  StakingRouter: contracts.StakingRouter as `0x${string}`,
}

export const NETWORK_CONFIG_SEPOLIA = {
  chainId: 11155111,
  chainName: 'Sepolia Testnet',
  rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
  blockExplorer: 'https://sepolia.etherscan.io',
}

export default CONTRACTS_SEPOLIA
