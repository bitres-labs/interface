import { describe, it, expect } from 'vitest'
import {
  formatCompact,
  formatCurrency,
  formatUSD,
  formatWithCommas,
  formatTokenAmount,
  formatSmartNumber,
} from './format'

describe('formatCompact', () => {
  it('should format thousands with K suffix', () => {
    expect(formatCompact(1500)).toBe('1.5K')
    expect(formatCompact(2000)).toBe('2.0K')
    expect(formatCompact(999)).toBe('999.00')
  })

  it('should format millions with M suffix', () => {
    expect(formatCompact(1500000)).toBe('1.5M')
    expect(formatCompact(2300000)).toBe('2.3M')
  })

  it('should format billions with B suffix', () => {
    expect(formatCompact(1500000000)).toBe('1.5B')
    expect(formatCompact(5000000000)).toBe('5.0B')
  })

  it('should handle zero', () => {
    expect(formatCompact(0)).toBe('0.00')
  })

  it('should handle negative numbers', () => {
    // Negative numbers don't get K/M/B suffix, fall through to toFixed(2)
    expect(formatCompact(-1500)).toBe('-1500.00')
  })

  it('should handle string input', () => {
    expect(formatCompact('2500')).toBe('2.5K')
  })

  it('should handle invalid input', () => {
    expect(formatCompact('invalid')).toBe('0')
    expect(formatCompact(NaN)).toBe('0')
  })
})

describe('formatCurrency', () => {
  it('should format values >= 1M with M suffix', () => {
    expect(formatCurrency(1500000)).toBe('$1.50M')
    expect(formatCurrency(2340000)).toBe('$2.34M')
  })

  it('should format values >= 1K with K suffix', () => {
    expect(formatCurrency(1500)).toBe('$1.50K')
    expect(formatCurrency(2340)).toBe('$2.34K')
  })

  it('should format values >= 1 with 2 decimals', () => {
    expect(formatCurrency(123.456)).toBe('$123.46')
    expect(formatCurrency(1.23)).toBe('$1.23')
  })

  it('should handle zero', () => {
    expect(formatCurrency(0)).toBe('$0')
  })

  it('should format small values with 4 decimals', () => {
    expect(formatCurrency(0.001234)).toBe('$0.0012')
    expect(formatCurrency(0.000001)).toBe('$0.0000')
  })
})

describe('formatUSD', () => {
  it('should format large numbers with 2 decimals', () => {
    expect(formatUSD(1234.567)).toBe('1,234.57')
    expect(formatUSD(1000000)).toBe('1,000,000.00')
  })

  it('should format small numbers with 4 decimals', () => {
    expect(formatUSD(0.1234)).toBe('0.1234')
    expect(formatUSD(0.001)).toBe('0.0010')
  })

  it('should handle zero', () => {
    // Zero is < 1, so it gets 4 decimals
    expect(formatUSD(0)).toBe('0.0000')
  })

  it('should handle invalid input', () => {
    expect(formatUSD(NaN)).toBe('0')
    expect(formatUSD(Infinity)).toBe('0')
  })
})

describe('formatWithCommas', () => {
  it('should add thousand separators', () => {
    expect(formatWithCommas(1234)).toBe('1,234.00')
    expect(formatWithCommas(1234567)).toBe('1,234,567.00')
  })

  it('should handle decimals', () => {
    expect(formatWithCommas(1234.56)).toBe('1,234.56')
    expect(formatWithCommas(1234567.89)).toBe('1,234,567.89')
  })

  it('should handle zero', () => {
    expect(formatWithCommas(0)).toBe('0.00')
  })

  it('should handle negative numbers', () => {
    expect(formatWithCommas(-1234)).toBe('-1,234.00')
  })
})

describe('formatTokenAmount', () => {
  it('should format WBTC with up to 6 decimals', () => {
    expect(formatTokenAmount(1.23456789, 'WBTC')).toBe('1.234568')
    expect(formatTokenAmount(0.00001, 'WBTC')).toBe('0.00001')
  })

  it('should format other tokens with up to 2 decimals', () => {
    expect(formatTokenAmount(1234.567, 'BTD')).toBe('1,234.57')
    expect(formatTokenAmount(1000.001, 'BRS')).toBe('1,000')
  })

  it('should handle zero', () => {
    expect(formatTokenAmount(0, 'WBTC')).toBe('0')
    expect(formatTokenAmount(0, 'BTD')).toBe('0')
  })

  it('should handle invalid input', () => {
    expect(formatTokenAmount(NaN, 'WBTC')).toBe('0')
  })
})

describe('formatSmartNumber', () => {
  it('should format numbers based on magnitude', () => {
    expect(formatSmartNumber(0.000001)).toBe('0.000001')
    expect(formatSmartNumber(0.1)).toBe('0.1') // Trailing zeros removed
    expect(formatSmartNumber(1.5)).toBe('1.5') // Trailing zeros removed
    expect(formatSmartNumber(100.5)).toBe('100.5') // Trailing zeros removed
    expect(formatSmartNumber(1000.5)).toBe('1000.5') // No commas in this function
  })

  it('should handle zero', () => {
    expect(formatSmartNumber(0)).toBe('0')
  })

  it('should handle invalid input', () => {
    expect(formatSmartNumber(NaN)).toBe('0')
  })

  it('should handle scientific notation with negative exponent', () => {
    // Very small numbers in scientific notation
    const verySmall = 6.387e-9 // 0.000000006387
    const result = formatSmartNumber(verySmall)
    expect(result).toContain('0.000000006') // Should show first digit + 3 more
  })

  it('should handle scientific notation with positive exponent (small number)', () => {
    // Edge case: Small number (< 0.01) with positive exponent in scientific notation
    // This can happen with very specific number representations
    const num = 5e-3 // 0.005 - may be represented with positive exponent in some cases
    const result = formatSmartNumber(num)
    expect(result).toContain('0.005') // Should handle correctly
  })

  it('should handle scientific notation with positive exponent (large number)', () => {
    // Large numbers in scientific notation (>= 0.01)
    const large = 1.5e3 // 1500
    const result = formatSmartNumber(large)
    expect(result).toBe('1500') // Should format as regular number
  })

  it('should handle numbers without decimal point', () => {
    // Integer case (line 138)
    const integer = 100
    const result = formatSmartNumber(integer)
    expect(result).toBe('100')
  })

  it('should handle string input', () => {
    expect(formatSmartNumber('123.456')).toBe('123.46')
    expect(formatSmartNumber('0.001234')).toBe('0.001234')
  })

  it('should handle negative numbers', () => {
    expect(formatSmartNumber(-123.456)).toBe('-123.46')
    expect(formatSmartNumber(-0.001234)).toBe('-0.001234')
  })

  it('should remove trailing zeros correctly', () => {
    expect(formatSmartNumber(1.0)).toBe('1')
    expect(formatSmartNumber(1.5)).toBe('1.5')
    expect(formatSmartNumber(1.5)).toBe('1.5')
    expect(formatSmartNumber(0.1)).toBe('0.1')
  })
})
