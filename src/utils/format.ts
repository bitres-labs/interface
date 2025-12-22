/**
 * Unified formatting utility functions
 * Used throughout the application for formatting numbers, currency, etc.
 *
 * Global rule: All number display uses truncation instead of rounding
 */

/**
 * Truncate number to specified decimal places (no rounding)
 * @param value Number value
 * @param decimals Number of decimal places to keep
 * @returns Truncated number
 *
 * Examples:
 * - truncateNumber(1.2399, 2) → 1.23
 * - truncateNumber(1.9999, 2) → 1.99
 * - truncateNumber(0.9999, 2) → 0.99
 */
export function truncateNumber(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return 0
  const multiplier = Math.pow(10, decimals)
  return Math.floor(value * multiplier) / multiplier
}

/**
 * Format and truncate number (with thousand separators)
 * @param value Number value
 * @param decimals Number of decimal places to keep
 * @param minDecimals Minimum decimal places (optional)
 * @returns Formatted string
 */
export function formatTruncated(value: number, decimals: number, minDecimals: number = 0): string {
  if (!Number.isFinite(value)) return '0'

  const truncated = truncateNumber(value, decimals)
  return truncated.toLocaleString(undefined, {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Format compact number display (full number with thousand separators, truncated)
 * @param value Number or string
 * @returns Formatted string (e.g.: "1,234.56")
 */
export function formatCompact(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (!Number.isFinite(num)) return '0'

  const abs = Math.abs(num)
  const sign = num < 0 ? '-' : ''

  // Only use K/M/B abbreviations for positive numbers
  if (num >= 0) {
    if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`
    if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`
    if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`
  }

  return `${num.toFixed(2)}`
}

/**
 * Format currency display (with $ symbol and thousand separators, truncated)
 * @param value Number value
 * @returns Formatted string (e.g.: "$1,234,567.89", "$345.67", "$0.0012")
 */
export function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return '$0'
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''

  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(2)}K`
  if (abs >= 1) return `${sign}$${abs.toFixed(2)}`
  if (abs === 0) return '$0'

  return `${sign}$${abs.toFixed(4)}`
}

/**
 * Format USD display (truncated)
 * @param value Number value
 * @returns Formatted string, decimal places auto-adjusted based on size
 */
export function formatUSD(value: number): string {
  if (!Number.isFinite(value)) return '0'

  if (value >= 1 || value <= -1) {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // < 1: use 4 decimal places, no thousand separators
  return value.toFixed(4)
}

/**
 * Format number with thousand separators (truncated)
 * @param value Number or string
 * @returns Formatted string (e.g.: "1,234.56")
 */
export function formatWithCommas(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (!Number.isFinite(num)) return '0'

  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Format token amount display (truncated)
 * @param amount Token amount
 * @param symbol Token symbol (used to determine precision)
 * @returns Formatted string
 *
 * Precision rules:
 * - Stablecoins (USD, USDT, USDC, BTB, BTD, BRS, stBTB, stBTD): 2 decimals
 * - BTC series (BTC, WBTC): 8 decimals
 * - ETH series (ETH, WETH): 6 decimals
 */
export function formatTokenAmount(amount: number, symbol: string): string {
  if (!Number.isFinite(amount)) return '0'
  if (amount === 0) return '0'

  const upperSymbol = symbol.toUpperCase()

  if (upperSymbol === 'BTC' || upperSymbol === 'WBTC') {
    const fixed = amount.toFixed(6)
    return removeTrailingZeros(fixed)
  }

  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  // Remove trailing meaningless zeros and decimal point
  const cleaned = formatted.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
  return cleaned
}

/**
 * Get display precision based on token symbol
 * @param symbol Token symbol
 * @returns Number of decimal places
 *
 * Precision rules:
 * - Stablecoins (USD, USDT, USDC, BTB, BTD, BRS, stBTB, stBTD): 2 decimals
 * - BTC series (BTC, WBTC): 8 decimals
 * - ETH series (ETH, WETH): 6 decimals
 */
export function getTokenDecimals(symbol: string): number {
  const upperSymbol = symbol.toUpperCase()

  // BTC series: 8 decimals
  if (upperSymbol === 'BTC' || upperSymbol === 'WBTC') {
    return 8
  }

  // ETH series: 6 decimals
  if (upperSymbol === 'ETH' || upperSymbol === 'WETH') {
    return 6
  }

  // Stablecoins and other tokens: 2 decimals
  return 2
}

/**
 * Format LP token amount display (smart precision, truncated)
 * @param amount LP token amount
 * @returns Formatted string
 *
 * Precision rules:
 * - If >= 1: show 4 decimal places
 * - If < 1: find first non-zero digit, show 4 digits from that position
 */
export function formatLPAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount === 0) return '0'

  const absAmount = Math.abs(amount)

  // If >= 1, show 4 decimal places (truncated)
  if (absAmount >= 1) {
    return formatTruncated(amount, 4, 0)
  }

  // If < 1, find first non-zero digit, show 4 digits from that position
  const str = absAmount.toString()

  // Handle scientific notation
  if (str.includes('e')) {
    const [, exponent] = str.split('e')
    const exp = parseInt(exponent)
    if (exp < 0) {
      // Decimal places = absolute exponent + 3 (show 4 digits)
      const decimals = Math.abs(exp) + 3
      return formatTruncated(amount, decimals, 0)
    }
  }

  // Normal decimal format
  const parts = str.split('.')
  if (parts.length === 2) {
    const decimalPart = parts[1]
    // Find position of first non-zero digit
    let firstNonZeroIndex = 0
    for (let i = 0; i < decimalPart.length; i++) {
      if (decimalPart[i] !== '0') {
        firstNonZeroIndex = i
        break
      }
    }
    // Total decimals = leading zeros + 4 significant digits
    const totalDecimals = firstNonZeroIndex + 4
    return formatTruncated(amount, totalDecimals, 0)
  }

  // Default: return 4 decimal places
  return formatTruncated(amount, 4, 0)
}

/**
 * Smart number formatting (truncated)
 * - Normal case: show 2 decimal places
 * - If < 0.01: show first significant digit plus 3 more
 * - Remove trailing zeros
 */
export function formatSmartNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (!Number.isFinite(num)) return '0'
  if (num === 0) return '0'

  const absNum = Math.abs(num)

  // Normal: >= 0.01 keep 2 decimals and remove trailing zeros
  if (absNum >= 0.01) {
    return removeTrailingZeros(num.toFixed(2))
  }

  // Less than 0.01: find first non-zero, keep 3 more digits
  const str = absNum.toString()

  if (str.includes('e')) {
    const [, exponent] = str.split('e')
    const exp = parseInt(exponent)
    if (exp < 0) {
      const decimals = Math.abs(exp) + 3
      return removeTrailingZeros(num.toFixed(decimals))
    }
    return removeTrailingZeros(num.toFixed(2))
  }

  const parts = str.split('.')
  if (parts.length !== 2) {
    return removeTrailingZeros(num.toFixed(2))
  }

  const decimalPart = parts[1]
  let firstNonZeroIndex = 0
  for (let i = 0; i < decimalPart.length; i++) {
    if (decimalPart[i] !== '0') {
      firstNonZeroIndex = i
      break
    }
  }
  const totalDecimals = firstNonZeroIndex + 4
  return removeTrailingZeros(num.toFixed(totalDecimals))
}

/**
 * Remove trailing zeros from number string
 */
export function removeTrailingZeros(numStr: string): string {
  if (!numStr.includes('.')) return numStr
  return numStr.replace(/\.?0+$/, '')
}

/**
 * Format LP token balance display (for Farm page LP pools, truncated)
 * @param amount LP token amount
 * @returns Formatted string
 *
 * Precision rules (truncated, no rounding):
 * 1. Normal case (number >= 1): 2 decimal places
 * 2. If number < 1: show 4 consecutive digits starting from first non-zero digit
 *
 * Examples:
 * - 1234.56789 → "1,234.56"
 * - 0.56789 → "0.5678"
 * - 0.0056789 → "0.005678"
 * - 0.00000056789 → "0.0000005678"
 */
export function formatLPBalance(amount: number): string {
  if (!Number.isFinite(amount) || amount === 0) return '0'

  const absAmount = Math.abs(amount)

  // Rule 1: number >= 1, show 2 decimal places (truncated)
  if (absAmount >= 1) {
    return formatTruncated(amount, 2, 0)
  }

  // Rule 2: number < 1, show 4 consecutive digits after first non-zero
  const str = absAmount.toString()

  // Handle scientific notation (e.g.: 1e-8)
  if (str.includes('e')) {
    const [, exponent] = str.split('e')
    const exp = parseInt(exponent)
    if (exp < 0) {
      // Leading zeros = absolute exponent - 1
      // Total decimals = leading zeros + 4 significant digits
      const leadingZeros = Math.abs(exp) - 1
      const totalDecimals = leadingZeros + 4
      return formatTruncated(amount, totalDecimals, 0)
    }
  }

  // Normal decimal format (e.g.: 0.0056789)
  const parts = str.split('.')
  if (parts.length === 2) {
    const decimalPart = parts[1]
    // Find position of first non-zero digit
    let firstNonZeroIndex = 0
    for (let i = 0; i < decimalPart.length; i++) {
      if (decimalPart[i] !== '0') {
        firstNonZeroIndex = i
        break
      }
    }
    // Total decimals = leading zeros + 4 significant digits
    const totalDecimals = firstNonZeroIndex + 4
    return formatTruncated(amount, totalDecimals, 0)
  }

  // Default: return 2 decimal places (truncated)
  return formatTruncated(amount, 2, 0)
}

/**
 * Smart percentage formatting (truncated)
 * @param value Percentage value (already in percentage form, e.g. 0.05 means 0.05%)
 * @returns Formatted percentage string
 *
 * Rules:
 * - If >= 1%: show 2 decimal places (e.g.: "12.34%")
 * - If < 1%: show 4 digits starting from first non-zero (e.g.: "0.1234%", "0.001234%")
 *
 * Examples:
 * - 12.3456 → "12.34%"
 * - 0.123456 → "0.1234%"
 * - 0.00123456 → "0.001234%"
 * - 0.000000123456 → "0.0000001234%"
 */
export function formatSmartPercentage(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '0%'

  const absValue = Math.abs(value)

  // If >= 1%, show 2 decimal places (truncated)
  if (absValue >= 1) {
    return `${formatTruncated(value, 2, 0)}%`
  }

  // If < 1%, show 4 digits starting from first non-zero digit
  const str = absValue.toString()

  // Handle scientific notation (e.g.: 1e-8)
  if (str.includes('e')) {
    const [, exponent] = str.split('e')
    const exp = parseInt(exponent)
    if (exp < 0) {
      // Total decimals = absolute exponent + 3 (show 4 digits)
      const totalDecimals = Math.abs(exp) + 3
      const truncated = truncateNumber(value, totalDecimals)
      return `${truncated.toFixed(totalDecimals).replace(/\.?0+$/, '')}%`
    }
  }

  // Normal decimal format (e.g.: 0.00123456)
  const parts = str.split('.')
  if (parts.length === 2) {
    const decimalPart = parts[1]
    // Find position of first non-zero digit
    let firstNonZeroIndex = 0
    for (let i = 0; i < decimalPart.length; i++) {
      if (decimalPart[i] !== '0') {
        firstNonZeroIndex = i
        break
      }
    }
    // Total decimals = leading zeros + 4 significant digits
    const totalDecimals = firstNonZeroIndex + 4
    const truncated = truncateNumber(value, totalDecimals)
    return `${truncated.toFixed(totalDecimals).replace(/\.?0+$/, '')}%`
  }

  // Default: return 2 decimal places (truncated)
  return `${formatTruncated(value, 2, 0)}%`
}
