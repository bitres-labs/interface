import { useMemo } from 'react'
import { useReadContract } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { CONTRACTS } from '@/config/contracts'
import { stBTD_ABI as stBTDABI } from '@/abis'
import { stBTB_ABI as stBTBABI } from '@/abis'

// ============================================================================
// CONFIGURATION
// ============================================================================

type TokenType = 'BTD' | 'BTB'

const STTOKEN_CONFIG = {
  BTD: {
    contract: CONTRACTS.stBTD,
    abi: stBTDABI,
  },
  BTB: {
    contract: CONTRACTS.stBTB,
    abi: stBTBABI,
  },
} as const

// ============================================================================
// EXCHANGE RATE HOOKS
// ============================================================================

/**
 * Generic hook to get exchange rate for stToken ↔ Token
 * @param tokenType 'BTD' or 'BTB'
 * @returns exchangeRate (stToken → Token) and inverseRate (Token → stToken)
 */
function useStTokenRate(tokenType: TokenType) {
  const config = STTOKEN_CONFIG[tokenType]

  // Read the conversion rate: how many stTokens for 1 Token
  const { data: sharesFor1Token } = useReadContract({
    address: config.contract,
    abi: config.abi,
    functionName: 'convertToShares',
    args: [parseUnits('1', 18)], // 1 Token
  })

  // Read the conversion rate: how many Tokens for 1 stToken
  const { data: assetsFor1Share } = useReadContract({
    address: config.contract,
    abi: config.abi,
    functionName: 'convertToAssets',
    args: [parseUnits('1', 18)], // 1 stToken
  })

  const exchangeRate = useMemo(() => {
    if (!assetsFor1Share) return 1
    return Number(formatUnits(assetsFor1Share as bigint, 18))
  }, [assetsFor1Share])

  const inverseRate = useMemo(() => {
    if (!sharesFor1Token) return 1
    return Number(formatUnits(sharesFor1Token as bigint, 18))
  }, [sharesFor1Token])

  return {
    exchangeRate, // How many Tokens per 1 stToken (stToken → Token)
    inverseRate, // How many stTokens per 1 Token (Token → stToken)
  }
}

// ============================================================================
// EXPORTED CONVENIENCE HOOKS
// ============================================================================

/**
 * Get exchange rate and conversion functions for BTD ↔ stBTD
 */
export function useBTDStakeRate() {
  return useStTokenRate('BTD')
}

/**
 * Get exchange rate and conversion functions for BTB ↔ stBTB
 */
export function useBTBStakeRate() {
  return useStTokenRate('BTB')
}

// ============================================================================
// OUTPUT CALCULATION
// ============================================================================

/**
 * Calculate output amount for staking swap
 * @param inputAmount Input amount as string
 * @param isDeposit true = Token → stToken, false = stToken → Token
 * @param tokenType 'BTD' or 'BTB'
 * @returns Calculated output amount as string
 */
export function useCalculateStakeOutput(
  inputAmount: string,
  isDeposit: boolean,
  tokenType: TokenType
) {
  const rate = useStTokenRate(tokenType)

  const calculateAmount = () => {
    if (!inputAmount || !rate) return '0'

    try {
      const input = parseFloat(inputAmount)
      if (isNaN(input) || input <= 0) return '0'

      if (isDeposit) {
        // Token → stToken: use inverseRate
        const output = input * rate.inverseRate
        return output.toFixed(6)
      } else {
        // stToken → Token: use exchangeRate
        const output = input * rate.exchangeRate
        return output.toFixed(6)
      }
    } catch {
      return '0'
    }
  }

  return calculateAmount()
}
