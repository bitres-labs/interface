import { describe, it, expect } from 'vitest'
import { formatSmartNumber, removeTrailingZeros, formatWithCommas } from './formatNumber'

describe('formatNumber utilities', () => {
  describe('formatSmartNumber', () => {
    describe('Normal cases (>= 0.01)', () => {
      it('should format normal numbers with 2 decimal places', () => {
        expect(formatSmartNumber(123.456)).toBe('123.46')
        expect(formatSmartNumber(1.234)).toBe('1.23')
        expect(formatSmartNumber(100)).toBe('100')
        expect(formatSmartNumber(0.99)).toBe('0.99')
      })

      it('should handle string input', () => {
        expect(formatSmartNumber('123.456')).toBe('123.46')
        expect(formatSmartNumber('1.234')).toBe('1.23')
      })

      it('should remove trailing zeros for normal numbers', () => {
        expect(formatSmartNumber(1.0)).toBe('1')
        expect(formatSmartNumber(1.10)).toBe('1.1')
        expect(formatSmartNumber(100.00)).toBe('100')
      })

      it('should handle boundary value 0.01', () => {
        expect(formatSmartNumber(0.01)).toBe('0.01')
      })

      it('should handle large numbers', () => {
        expect(formatSmartNumber(999999.99)).toBe('999999.99')
        expect(formatSmartNumber(1000000)).toBe('1000000')
      })
    })

    describe('Small numbers (< 0.01)', () => {
      it('should show 4 significant digits for small decimals', () => {
        // 0.00123 → first non-zero at position 2, show 4 digits from there
        expect(formatSmartNumber(0.00123)).toBe('0.00123')
      })

      it('should handle very small numbers', () => {
        // 0.0000063874 → first non-zero at position 5, show 4 digits
        expect(formatSmartNumber(0.0000063874)).toBe('0.000006387')
      })

      it('should handle 0.001', () => {
        expect(formatSmartNumber(0.001)).toBe('0.001')
      })

      it('should remove trailing zeros for small numbers', () => {
        expect(formatSmartNumber(0.00100)).toBe('0.001')
        expect(formatSmartNumber(0.001000)).toBe('0.001')
      })
    })

    describe('Scientific notation', () => {
      it('should handle scientific notation for very small numbers', () => {
        // 6.387e-9 → should show exp + 3 decimals
        const result = formatSmartNumber(6.387e-9)
        expect(parseFloat(result)).toBeCloseTo(6.387e-9, 12)
      })

      it('should handle 1e-10', () => {
        const result = formatSmartNumber(1e-10)
        expect(parseFloat(result)).toBeCloseTo(1e-10, 13)
      })

      it('should handle positive exponent in scientific notation', () => {
        expect(formatSmartNumber(1.23e5)).toBe('123000')
      })
    })

    describe('Edge cases', () => {
      it('should return "0" for zero', () => {
        expect(formatSmartNumber(0)).toBe('0')
        expect(formatSmartNumber(0.0)).toBe('0')
        expect(formatSmartNumber('0')).toBe('0')
      })

      it('should return "0" for NaN', () => {
        expect(formatSmartNumber(NaN)).toBe('0')
        expect(formatSmartNumber('invalid')).toBe('0')
        expect(formatSmartNumber('')).toBe('0')
      })

      it('should handle negative numbers', () => {
        expect(formatSmartNumber(-123.456)).toBe('-123.46')
        expect(formatSmartNumber(-0.00123)).toBe('-0.00123')
      })

      it('should handle very small negative numbers', () => {
        expect(formatSmartNumber(-0.0000063874)).toBe('-0.000006387')
      })
    })
  })

  describe('removeTrailingZeros', () => {
    it('should remove trailing zeros after decimal point', () => {
      expect(removeTrailingZeros('1.00')).toBe('1')
      expect(removeTrailingZeros('1.10')).toBe('1.1')
      expect(removeTrailingZeros('1.23000')).toBe('1.23')
    })

    it('should remove decimal point if all zeros', () => {
      expect(removeTrailingZeros('100.000')).toBe('100')
      expect(removeTrailingZeros('0.0')).toBe('0')
    })

    it('should not modify numbers without decimal point', () => {
      expect(removeTrailingZeros('100')).toBe('100')
      expect(removeTrailingZeros('0')).toBe('0')
    })

    it('should not remove non-trailing zeros', () => {
      expect(removeTrailingZeros('1.01')).toBe('1.01')
      expect(removeTrailingZeros('100.001')).toBe('100.001')
    })

    it('should keep significant digits', () => {
      expect(removeTrailingZeros('0.00123')).toBe('0.00123')
      expect(removeTrailingZeros('1.230')).toBe('1.23')
    })
  })

  describe('formatWithCommas', () => {
    it('should add commas to large integers', () => {
      expect(formatWithCommas(1000)).toBe('1,000')
      expect(formatWithCommas(1000000)).toBe('1,000,000')
      expect(formatWithCommas(1234567890)).toBe('1,234,567,890')
    })

    it('should handle decimals', () => {
      expect(formatWithCommas(1000.5)).toBe('1,000.5')
      expect(formatWithCommas(1234567.89)).toBe('1,234,567.89')
    })

    it('should handle string input', () => {
      expect(formatWithCommas('1000')).toBe('1,000')
      expect(formatWithCommas('1234567.89')).toBe('1,234,567.89')
    })

    it('should not add commas to small numbers', () => {
      expect(formatWithCommas(100)).toBe('100')
      expect(formatWithCommas(999)).toBe('999')
    })

    it('should handle negative numbers', () => {
      expect(formatWithCommas(-1000)).toBe('-1,000')
      expect(formatWithCommas(-1234567.89)).toBe('-1,234,567.89')
    })

    it('should return "0" for NaN', () => {
      expect(formatWithCommas(NaN)).toBe('0')
      expect(formatWithCommas('invalid')).toBe('0')
    })

    it('should handle zero', () => {
      expect(formatWithCommas(0)).toBe('0')
      expect(formatWithCommas('0')).toBe('0')
    })

    it('should handle very large numbers', () => {
      expect(formatWithCommas(999999999999)).toBe('999,999,999,999')
    })

    it('should preserve decimal precision', () => {
      expect(formatWithCommas(1234.56789)).toBe('1,234.56789')
    })
  })
})
