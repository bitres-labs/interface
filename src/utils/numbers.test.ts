import { describe, it, expect } from 'vitest'
import {
  toNumber,
  isValidNumber,
  parsePercentage,
  toPercentage,
  calculateRatio,
  clamp,
} from './numbers'

describe('toNumber', () => {
  it('should convert valid numbers', () => {
    expect(toNumber(42)).toBe(42)
    expect(toNumber(3.14)).toBe(3.14)
    expect(toNumber(-100)).toBe(-100)
    expect(toNumber(0)).toBe(0)
  })

  it('should convert string numbers', () => {
    expect(toNumber('42')).toBe(42)
    expect(toNumber('3.14')).toBe(3.14)
    expect(toNumber('-100')).toBe(-100)
  })

  it('should return 0 for invalid inputs', () => {
    expect(toNumber(NaN)).toBe(0)
    expect(toNumber(Infinity)).toBe(0)
    expect(toNumber(-Infinity)).toBe(0)
    expect(toNumber('invalid')).toBe(0)
    expect(toNumber(undefined)).toBe(0)
    expect(toNumber(null)).toBe(0)
  })

  it('should handle objects and arrays', () => {
    expect(toNumber({})).toBe(0)
    expect(toNumber([])).toBe(0)
    expect(toNumber([1])).toBe(1)
    expect(toNumber([1, 2])).toBe(0)
  })
})

describe('isValidNumber', () => {
  it('should return true for valid numbers', () => {
    expect(isValidNumber(42)).toBe(true)
    expect(isValidNumber(3.14)).toBe(true)
    expect(isValidNumber(-100)).toBe(true)
    expect(isValidNumber(0)).toBe(true)
  })

  it('should return true for string numbers', () => {
    expect(isValidNumber('42')).toBe(true)
    expect(isValidNumber('3.14')).toBe(true)
    expect(isValidNumber('-100')).toBe(true)
  })

  it('should return false for invalid inputs', () => {
    expect(isValidNumber(NaN)).toBe(false)
    expect(isValidNumber(Infinity)).toBe(false)
    expect(isValidNumber(-Infinity)).toBe(false)
    expect(isValidNumber('invalid')).toBe(false)
    expect(isValidNumber(undefined)).toBe(false)
    // Note: Number(null) = 0, which is finite, so isValidNumber(null) = true
    expect(isValidNumber(null)).toBe(true)
    expect(isValidNumber({})).toBe(false)
    expect(isValidNumber([])).toBe(true) // Number([]) = 0, which is finite
  })
})

describe('parsePercentage', () => {
  it('should convert percentage to decimal', () => {
    expect(parsePercentage(50)).toBe(0.5)
    expect(parsePercentage(100)).toBe(1)
    expect(parsePercentage(0)).toBe(0)
    expect(parsePercentage(25)).toBe(0.25)
    expect(parsePercentage(75.5)).toBe(0.755)
  })

  it('should clamp values to 0-100 range', () => {
    expect(parsePercentage(150)).toBe(1) // Clamped to 100
    expect(parsePercentage(-50)).toBe(0) // Clamped to 0
    expect(parsePercentage(200)).toBe(1)
    expect(parsePercentage(-100)).toBe(0)
  })

  it('should handle invalid inputs by converting to 0', () => {
    expect(parsePercentage(NaN)).toBe(0)
    // Note: toNumber(Infinity) returns 0, then clamped to 0-100 = 0, then /100 = 0
    expect(parsePercentage(Infinity)).toBe(0)
  })
})

describe('toPercentage', () => {
  it('should convert decimal to percentage with default 2 decimals', () => {
    expect(toPercentage(0.5)).toBe('50.00%')
    expect(toPercentage(1)).toBe('100.00%')
    expect(toPercentage(0)).toBe('0.00%')
    expect(toPercentage(0.755)).toBe('75.50%')
  })

  it('should support custom decimal places', () => {
    expect(toPercentage(0.5, 0)).toBe('50%')
    expect(toPercentage(0.5, 1)).toBe('50.0%')
    expect(toPercentage(0.5, 3)).toBe('50.000%')
    expect(toPercentage(0.12345, 4)).toBe('12.3450%')
  })

  it('should handle edge cases', () => {
    expect(toPercentage(0.001, 2)).toBe('0.10%')
    expect(toPercentage(1.5, 2)).toBe('150.00%')
    expect(toPercentage(-0.5, 2)).toBe('-50.00%')
  })

  it('should handle invalid inputs', () => {
    expect(toPercentage(NaN)).toBe('0.00%')
    expect(toPercentage(Infinity)).toBe('0.00%')
  })
})

describe('calculateRatio', () => {
  it('should calculate ratio correctly', () => {
    expect(calculateRatio(10, 2)).toBe(5)
    expect(calculateRatio(100, 50)).toBe(2)
    expect(calculateRatio(1, 4)).toBe(0.25)
    expect(calculateRatio(0, 10)).toBe(0)
  })

  it('should handle division by zero', () => {
    expect(calculateRatio(10, 0)).toBe(0)
    expect(calculateRatio(100, 0)).toBe(0)
    expect(calculateRatio(0, 0)).toBe(0)
  })

  it('should handle negative numbers', () => {
    expect(calculateRatio(-10, 2)).toBe(-5)
    expect(calculateRatio(10, -2)).toBe(-5)
    expect(calculateRatio(-10, -2)).toBe(5)
  })

  it('should handle invalid inputs', () => {
    expect(calculateRatio(NaN, 2)).toBe(0)
    expect(calculateRatio(10, NaN)).toBe(0)
    expect(calculateRatio(Infinity, 2)).toBe(0)
    expect(calculateRatio(10, Infinity)).toBe(0)
  })

  it('should handle decimal ratios', () => {
    expect(calculateRatio(3.5, 2)).toBe(1.75)
    expect(calculateRatio(10, 3)).toBeCloseTo(3.333333, 5)
  })
})

describe('clamp', () => {
  it('should clamp values within range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(0, 0, 10)).toBe(0)
    expect(clamp(10, 0, 10)).toBe(10)
  })

  it('should clamp values below minimum', () => {
    expect(clamp(-5, 0, 10)).toBe(0)
    expect(clamp(-100, 0, 10)).toBe(0)
    expect(clamp(5, 10, 20)).toBe(10)
  })

  it('should clamp values above maximum', () => {
    expect(clamp(15, 0, 10)).toBe(10)
    expect(clamp(100, 0, 10)).toBe(10)
    expect(clamp(25, 10, 20)).toBe(20)
  })

  it('should handle negative ranges', () => {
    expect(clamp(-5, -10, -1)).toBe(-5)
    expect(clamp(-15, -10, -1)).toBe(-10)
    expect(clamp(0, -10, -1)).toBe(-1)
  })

  it('should handle decimal values', () => {
    expect(clamp(5.5, 0, 10)).toBe(5.5)
    expect(clamp(0.5, 1, 10)).toBe(1)
    expect(clamp(10.5, 0, 10)).toBe(10)
  })

  it('should handle invalid inputs', () => {
    // Note: toNumber(NaN/Infinity/-Infinity) all return 0
    expect(clamp(NaN, 0, 10)).toBe(0)
    expect(clamp(Infinity, 0, 10)).toBe(0)
    expect(clamp(-Infinity, 0, 10)).toBe(0)
  })

  it('should handle same min and max', () => {
    expect(clamp(5, 10, 10)).toBe(10)
    expect(clamp(15, 10, 10)).toBe(10)
  })
})
