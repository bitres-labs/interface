/**
 * Unified number utility functions
 */

/**
 * Safely convert value to number
 * @param value Any value
 * @returns Valid number, or 0 if invalid
 */
export function toNumber(value: any): number {
  const num = Number(value ?? 0)
  return Number.isFinite(num) ? num : 0
}

/**
 * Check if value is a valid number
 * @param value Any value
 * @returns Whether value is a valid number
 */
export function isValidNumber(value: any): boolean {
  return Number.isFinite(Number(value))
}

/**
 * Safely parse percentage
 * @param value Percentage value (0-100)
 * @returns Decimal value (0-1)
 */
export function parsePercentage(value: number): number {
  const num = toNumber(value)
  return Math.max(0, Math.min(100, num)) / 100
}

/**
 * Convert decimal to percentage
 * @param value Decimal value (0-1)
 * @param decimals Number of decimal places
 * @returns Percentage string
 */
export function toPercentage(value: number, decimals: number = 2): string {
  const num = toNumber(value)
  return (num * 100).toFixed(decimals) + '%'
}

/**
 * Safely calculate ratio of two numbers
 * @param numerator Numerator
 * @param denominator Denominator
 * @returns Ratio, or 0 if denominator is 0
 */
export function calculateRatio(numerator: number, denominator: number): number {
  const num = toNumber(numerator)
  const denom = toNumber(denominator)
  return denom === 0 ? 0 : num / denom
}

/**
 * Clamp number within specified range
 * @param value Number value
 * @param min Minimum value
 * @param max Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, toNumber(value)))
}

/**
 * Format number with specified decimal places
 * @param value Number value
 * @param decimals Number of decimal places, default 2
 * @returns Formatted string
 */
export function formatNumber(value: number, decimals: number = 2): string {
  const num = toNumber(value)
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })
}
