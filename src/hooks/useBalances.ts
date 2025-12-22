import { useReadContract, useAccount, useBalance } from 'wagmi'
import { formatUnits } from 'viem'
import { CONTRACTS, TOKEN_DECIMALS } from '@/config/contracts'
import { ERC20_ABI as ERC20ABI } from '@/abis' // All ERC20 tokens use similar ABI
import { REFETCH_CONFIG_BY_TYPE } from '@/config/refetch'

// Hook to read ERC20 token balance
function useERC20Balance(tokenAddress: `0x${string}`, decimals: number) {
  const { address } = useAccount()

  const { data, isLoading, error, refetch } = useReadContract({
    address: tokenAddress,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      ...REFETCH_CONFIG_BY_TYPE.balance,
    },
  })

  return {
    balance: data ? formatUnits(data as bigint, decimals) : '0',
    balanceRaw: data as bigint | undefined,
    isLoading,
    error,
    refetch,
  }
}

// ETH Balance
export function useETHBalance() {
  const { address } = useAccount()

  const { data, isLoading, error, refetch } = useBalance({
    address,
    query: REFETCH_CONFIG_BY_TYPE.balance,
  })

  return {
    balance: data ? formatUnits(data.value, data.decimals) : '0',
    balanceRaw: data?.value,
    isLoading,
    error,
    refetch,
  }
}

// WBTC Balance
export function useWBTCBalance() {
  return useERC20Balance(CONTRACTS.WBTC, TOKEN_DECIMALS.WBTC)
}

// USDC Balance
export function useUSDCBalance() {
  return useERC20Balance(CONTRACTS.USDC, TOKEN_DECIMALS.USDC)
}

// USDT Balance
export function useUSDTBalance() {
  return useERC20Balance(CONTRACTS.USDT, TOKEN_DECIMALS.USDT)
}

// BTD Balance
export function useBTDBalance() {
  return useERC20Balance(CONTRACTS.BTD, TOKEN_DECIMALS.BTD)
}

// BTB Balance
export function useBTBBalance() {
  return useERC20Balance(CONTRACTS.BTB, TOKEN_DECIMALS.BTB)
}

// BRS Balance
export function useBRSBalance() {
  return useERC20Balance(CONTRACTS.BRS, TOKEN_DECIMALS.BRS)
}

// WETH Balance
export function useWETHBalance() {
  return useERC20Balance(CONTRACTS.WETH, TOKEN_DECIMALS.WETH)
}

// stBTD Balance
export function useStBTDBalance() {
  return useERC20Balance(CONTRACTS.stBTD, TOKEN_DECIMALS.stBTD)
}

// stBTB Balance
export function useStBTBBalance() {
  return useERC20Balance(CONTRACTS.stBTB, TOKEN_DECIMALS.stBTB)
}

// Hook to read all balances at once
export function useAllBalances() {
  const eth = useETHBalance()
  const wbtc = useWBTCBalance()
  const weth = useWETHBalance()
  const usdc = useUSDCBalance()
  const usdt = useUSDTBalance()
  const btd = useBTDBalance()
  const btb = useBTBBalance()
  const brs = useBRSBalance()
  const stBTD = useStBTDBalance()
  const stBTB = useStBTBBalance()

  const refetchAll = () => {
    eth.refetch()
    wbtc.refetch()
    weth.refetch()
    usdc.refetch()
    usdt.refetch()
    btd.refetch()
    btb.refetch()
    brs.refetch()
    stBTD.refetch()
    stBTB.refetch()
  }

  return {
    balances: {
      ETH: eth.balance,
      WBTC: wbtc.balance,
      WETH: weth.balance,
      USDC: usdc.balance,
      USDT: usdt.balance,
      BTD: btd.balance,
      BTB: btb.balance,
      BRS: brs.balance,
      stBTD: stBTD.balance,
      stBTB: stBTB.balance,
    },
    isLoading:
      eth.isLoading ||
      wbtc.isLoading ||
      weth.isLoading ||
      usdc.isLoading ||
      usdt.isLoading ||
      btd.isLoading ||
      btb.isLoading ||
      brs.isLoading ||
      stBTD.isLoading ||
      stBTB.isLoading,
    refetchAll,
  }
}

// Hook for token allowance (for approvals)
export function useTokenAllowance(tokenAddress: `0x${string}`, spenderAddress: `0x${string}`) {
  const { address } = useAccount()

  const { data, isLoading, error, refetch } = useReadContract({
    address: tokenAddress,
    abi: ERC20ABI,
    functionName: 'allowance',
    args: address ? [address, spenderAddress] : undefined,
    query: {
      enabled: !!address,
    },
  })

  return {
    allowance: data as bigint | undefined,
    isLoading,
    error,
    refetch,
  }
}
