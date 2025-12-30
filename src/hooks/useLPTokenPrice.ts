import { useReadContract, useReadContracts } from 'wagmi'
import { useMemo } from 'react'
import { formatUnits } from 'viem'
import { useTokenPrices } from './useAPY'
import { CONTRACTS } from '@/config/contracts'

// UniswapV2Pair ABI (minimal)
const PAIR_ABI = [
  {
    inputs: [],
    name: 'getReserves',
    outputs: [
      { internalType: 'uint112', name: 'reserve0', type: 'uint112' },
      { internalType: 'uint112', name: 'reserve1', type: 'uint112' },
      { internalType: 'uint32', name: 'blockTimestampLast', type: 'uint32' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'token0',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'token1',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

// ERC20 ABI for symbol
const ERC20_ABI = [
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

/**
 * Calculate LP Token price based on reserves and total supply
 * Formula: (reserve0 * price0 + reserve1 * price1) / totalSupply
 */
export function useLPTokenPrice(lpTokenAddress: `0x${string}` | undefined) {
  const prices = useTokenPrices()

  // Get reserves, totalSupply, and token addresses
  const { data: reserves } = useReadContract({
    address: lpTokenAddress,
    abi: PAIR_ABI,
    functionName: 'getReserves',
    query: {
      enabled: !!lpTokenAddress,
    },
  })

  const { data: totalSupply } = useReadContract({
    address: lpTokenAddress,
    abi: PAIR_ABI,
    functionName: 'totalSupply',
    query: {
      enabled: !!lpTokenAddress,
    },
  })

  const { data: token0Address } = useReadContract({
    address: lpTokenAddress,
    abi: PAIR_ABI,
    functionName: 'token0',
    query: {
      enabled: !!lpTokenAddress,
    },
  })

  const { data: token1Address } = useReadContract({
    address: lpTokenAddress,
    abi: PAIR_ABI,
    functionName: 'token1',
    query: {
      enabled: !!lpTokenAddress,
    },
  })

  // Get token symbols and decimals
  const { data: tokenData } = useReadContracts({
    contracts: [
      {
        address: token0Address,
        abi: ERC20_ABI,
        functionName: 'symbol',
      },
      {
        address: token0Address,
        abi: ERC20_ABI,
        functionName: 'decimals',
      },
      {
        address: token1Address,
        abi: ERC20_ABI,
        functionName: 'symbol',
      },
      {
        address: token1Address,
        abi: ERC20_ABI,
        functionName: 'decimals',
      },
    ],
    query: {
      enabled: !!token0Address && !!token1Address,
    },
  })

  const lpPrice = useMemo(() => {
    if (!reserves || !totalSupply || !tokenData) {
      return 0
    }

    const [reserve0, reserve1] = reserves
    const token0Symbol = tokenData[0]?.result as string
    const token0Decimals = tokenData[1]?.result as number
    const token1Symbol = tokenData[2]?.result as string
    const token1Decimals = tokenData[3]?.result as number

    if (!token0Symbol || !token1Symbol || !token0Decimals || !token1Decimals) {
      return 0
    }

    // Convert reserves to numbers
    const reserve0Num = Number(formatUnits(reserve0, token0Decimals))
    const reserve1Num = Number(formatUnits(reserve1, token1Decimals))
    const totalSupplyNum = Number(formatUnits(totalSupply, 18)) // LP tokens are always 18 decimals

    if (totalSupplyNum === 0) {
      return 0
    }

    // Get token prices
    let token0Price = 1
    let token1Price = 1

    // Map token symbols to prices (all from Chainlink or LP spot prices)
    const priceMap: Record<string, number> = {
      BRS: prices.BRS,
      BTD: prices.BTD,
      BTB: prices.BTB,
      USDC: prices.USDC,
      USDT: prices.USDT,
      WBTC: prices.WBTC,
      WETH: prices.WETH || 0,
    }

    token0Price = priceMap[token0Symbol] || 1
    token1Price = priceMap[token1Symbol] || 1

    // Calculate LP token price
    // Price = (reserve0 * price0 + reserve1 * price1) / totalSupply
    const totalValue = reserve0Num * token0Price + reserve1Num * token1Price
    const lpTokenPrice = totalValue / totalSupplyNum

    return lpTokenPrice
  }, [reserves, totalSupply, tokenData, prices])

  return lpPrice
}

/**
 * Get LP token prices for all three LP pools
 */
export function useAllLPTokenPrices() {
  const lpPrice0 = useLPTokenPrice(CONTRACTS.BRSBTDPair as `0x${string}`)
  const lpPrice1 = useLPTokenPrice(CONTRACTS.BTDUSDCPair as `0x${string}`)
  const lpPrice2 = useLPTokenPrice(CONTRACTS.BTBBTDPair as `0x${string}`)

  return useMemo(
    () => ({
      0: lpPrice0,
      1: lpPrice1,
      2: lpPrice2,
    }),
    [lpPrice0, lpPrice1, lpPrice2]
  )
}
