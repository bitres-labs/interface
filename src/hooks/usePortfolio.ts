import { useMemo } from 'react'
import { useAccount, useBalance } from 'wagmi'
import {
  useWBTCBalance,
  useWETHBalance,
  useBTDBalance,
  useBTBBalance,
  useBRSBalance,
  useUSDCBalance,
  useUSDTBalance,
} from './useBalances'
import { useStakedBTD, useStakedBTB } from './useStaking'
import { usePendingReward, useUserInfo } from './useFarming'
import { useTokenPrices } from './useAPY'
import { formatUnits } from 'viem'

function toNumber(value: any) {
  const num = Number(value ?? 0)
  return Number.isFinite(num) ? num : 0
}

/**
 * Shared portfolio calculation hook
 * Used by both HomePage and AssetPage to ensure consistent data
 */
export function usePortfolio() {
  const { address, isConnected } = useAccount()

  // ETH balance
  const { data: ethBalance } = useBalance({ address })

  // Token balances
  const { balance: wbtcBalance } = useWBTCBalance()
  const { balance: wethBalance } = useWETHBalance()
  const { balance: usdcBalance } = useUSDCBalance()
  const { balance: usdtBalance } = useUSDTBalance()
  const { balance: btdBalance } = useBTDBalance()
  const { balance: btbBalance } = useBTBBalance()
  const { balance: brsBalance } = useBRSBalance()

  const { staked: stakedBTD } = useStakedBTD()
  const { staked: stakedBTB } = useStakedBTB()

  // Farming positions (all 9 pools)
  const farming0 = useUserInfo(0)
  const farming1 = useUserInfo(1)
  const farming2 = useUserInfo(2)
  const farming3 = useUserInfo(3)
  const farming4 = useUserInfo(4)
  const farming5 = useUserInfo(5)
  const farming6 = useUserInfo(6)
  const farming7 = useUserInfo(7)
  const farming8 = useUserInfo(8)

  // Pending rewards from all pools
  const pending0 = usePendingReward(0)
  const pending1 = usePendingReward(1)
  const pending2 = usePendingReward(2)
  const pending3 = usePendingReward(3)
  const pending4 = usePendingReward(4)
  const pending5 = usePendingReward(5)
  const pending6 = usePendingReward(6)
  const pending7 = usePendingReward(7)
  const pending8 = usePendingReward(8)

  // Token prices
  const prices = useTokenPrices()

  const portfolio = useMemo(() => {
    if (!isConnected) {
      return {
        totalValue: 0,
        walletBalance: '0.00',
        staked: '0.00',
        farming: '0.00',
        rewards: '0.00',
        totalPendingBRS: 0,
        tokens: [],
      }
    }

    const ethValue = ethBalance ? Number(formatUnits(ethBalance.value, 18)) : 0
    const ethPriceUSD = 3000 // Approximate ETH price
    const wethValue = toNumber(wethBalance)

    // Wallet balances value
    const walletValue =
      ethValue * ethPriceUSD +
      wethValue * ethPriceUSD +
      toNumber(wbtcBalance) * prices.WBTC +
      toNumber(usdcBalance) * 1.0 +
      toNumber(usdtBalance) * 1.0 +
      toNumber(btdBalance) * prices.BTD +
      toNumber(btbBalance) * prices.BTB +
      toNumber(brsBalance) * prices.BRS

    // Staked value (stBTD + stBTB)
    const stakedValue = toNumber(stakedBTD) * prices.BTD + toNumber(stakedBTB) * prices.BTB

    // Farming value (LP tokens in all pools)
    // Pool configuration:
    // 0: BRS/BTD LP
    // 1: BTD/USDC LP
    // 2: BTB/BTD LP
    // 3: USDC single
    // 4: USDT single
    // 5: WBTC single
    // 6: stBTD single
    // 7: stBTB single
    // 8: BRS single
    const lpPrices = {
      0: prices.BRS * 0.5 + prices.BTD * 0.5, // BRS/BTD LP
      1: prices.BTD * 0.5 + prices.USDC * 0.5, // BTD/USDC LP
      2: prices.BTB * 0.5 + prices.BTD * 0.5, // BTB/BTD LP
      3: prices.USDC, // USDC (from Chainlink, fallback $1 on Sepolia)
      4: prices.USDT, // USDT (from Chainlink, fallback $1 on Sepolia)
      5: prices.WBTC, // WBTC
      6: prices.BTD, // stBTD
      7: prices.BTB, // stBTB
      8: prices.BRS, // BRS
    }

    const farmingValue =
      toNumber(farming0.stakedAmount) * lpPrices[0] +
      toNumber(farming1.stakedAmount) * lpPrices[1] +
      toNumber(farming2.stakedAmount) * lpPrices[2] +
      toNumber(farming3.stakedAmount) * lpPrices[3] +
      toNumber(farming4.stakedAmount) * lpPrices[4] +
      toNumber(farming5.stakedAmount) * lpPrices[5] +
      toNumber(farming6.stakedAmount) * lpPrices[6] +
      toNumber(farming7.stakedAmount) * lpPrices[7] +
      toNumber(farming8.stakedAmount) * lpPrices[8]

    // Total pending rewards (BRS)
    const totalPendingBRS =
      toNumber(pending0.pendingReward) +
      toNumber(pending1.pendingReward) +
      toNumber(pending2.pendingReward) +
      toNumber(pending3.pendingReward) +
      toNumber(pending4.pendingReward) +
      toNumber(pending5.pendingReward) +
      toNumber(pending6.pendingReward) +
      toNumber(pending7.pendingReward) +
      toNumber(pending8.pendingReward)

    const rewardsValue = totalPendingBRS * prices.BRS

    const totalValue = walletValue + stakedValue + farmingValue + rewardsValue

    return {
      totalValue,
      walletBalance: walletValue.toFixed(2),
      staked: stakedValue.toFixed(2),
      farming: farmingValue.toFixed(2),
      rewards: rewardsValue.toFixed(2),
      totalPendingBRS,
      tokens: [
        {
          symbol: 'BTD',
          amount: toNumber(btdBalance),
          value: toNumber(btdBalance) * prices.BTD,
        },
        {
          symbol: 'BTB',
          amount: toNumber(btbBalance),
          value: toNumber(btbBalance) * prices.BTB,
        },
        {
          symbol: 'BRS',
          amount: toNumber(brsBalance),
          value: toNumber(brsBalance) * prices.BRS,
        },
        {
          symbol: 'WBTC',
          amount: toNumber(wbtcBalance),
          value: toNumber(wbtcBalance) * prices.WBTC,
        },
        {
          symbol: 'WETH',
          amount: wethValue,
          value: wethValue * ethPriceUSD,
        },
        {
          symbol: 'ETH',
          amount: ethValue,
          value: ethValue * ethPriceUSD,
        },
        {
          symbol: 'USDC',
          amount: toNumber(usdcBalance),
          value: toNumber(usdcBalance) * 1.0,
        },
        {
          symbol: 'USDT',
          amount: toNumber(usdtBalance),
          value: toNumber(usdtBalance) * 1.0,
        },
      ],
    }
  }, [
    isConnected,
    ethBalance,
    wbtcBalance,
    wethBalance,
    usdcBalance,
    usdtBalance,
    btdBalance,
    btbBalance,
    brsBalance,
    stakedBTD,
    stakedBTB,
    farming0,
    farming1,
    farming2,
    farming3,
    farming4,
    farming5,
    farming6,
    farming7,
    farming8,
    pending0,
    pending1,
    pending2,
    pending3,
    pending4,
    pending5,
    pending6,
    pending7,
    pending8,
    prices,
  ])

  return portfolio
}
