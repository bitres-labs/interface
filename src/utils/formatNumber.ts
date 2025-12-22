/**
 * Smart number formatting
 * - Normal case: show 2 decimal places
 * - If less than 0.01: show first significant digit plus 3 more, total 4 digits
 * - Remove trailing zeros
 *
 * @param value Number or string to format
 * @returns Formatted string
 *
 * @example
 * formatSmartNumber(123.456) // "123.46"
 * formatSmartNumber(1.234) // "1.23"
 * formatSmartNumber(0.0123) // "0.01"
 * formatSmartNumber(0.00123) // "0.00123"
 * formatSmartNumber(0.0000063874) // "0.000006387"
 */
export function formatSmartNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(num) || num === 0) return '0'

  const absNum = Math.abs(num)

  let result: string

  // Normal case: 2 decimal places
  if (absNum >= 0.01) {
    result = num.toFixed(2)
  } else {
    // Less than 0.01: find first significant digit, show 4 digits total
    // Convert to string and find position of first non-zero digit
    const str = absNum.toString()

    // Handle scientific notation
    if (str.includes('e')) {
      const [, exponent] = str.split('e')
      const exp = parseInt(exponent)
      if (exp < 0) {
        // e.g.: 6.387e-9
        const decimals = Math.abs(exp) + 3 // Show 3 more digits after first digit
        result = num.toFixed(decimals)
      } else {
        result = num.toFixed(2)
      }
    } else {
      // Normal decimal format: 0.00000123
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
        // Show up to 3 digits after first non-zero digit
        const totalDecimals = firstNonZeroIndex + 4
        result = num.toFixed(totalDecimals)
      } else {
        result = num.toFixed(2)
      }
    }
  }

  // Remove trailing zeros
  return removeTrailingZeros(result)
}

/**
 * Remove trailing zeros from number string
 */
export function removeTrailingZeros(numStr: string): string {
  if (!numStr.includes('.')) return numStr
  return numStr.replace(/\.?0+$/, '')
}

/**
 * Format large numbers with thousand separators
 */
export function formatWithCommas(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '0'

  const parts = num.toString().split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.join('.')
}
