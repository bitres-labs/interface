/**
 * Unified Token Icon Component
 * Supports both image icons and color-based icons
 */

interface TokenIconProps {
  token: string
  size?: string
  className?: string
}

const TOKEN_ICONS: Record<string, string> = {
  WBTC: '/tokens/wbtc.png',
  USDC: '/tokens/usdc.png',
  USDT: '/tokens/usdt.png',
}

const TOKEN_COLORS: Record<string, string> = {
  BRS: 'bg-brs-DEFAULT',
  BTD: 'bg-btd-DEFAULT',
  BTB: 'bg-btb-DEFAULT',
  stBTD: 'bg-btd-DEFAULT',
  stBTB: 'bg-btb-DEFAULT',
}

export function TokenIcon({ token, size = 'w-8 h-8', className = '' }: TokenIconProps) {
  // If there's an image icon, use it
  if (TOKEN_ICONS[token]) {
    return (
      <img src={TOKEN_ICONS[token]} alt={token} className={`${size} rounded-full ${className}`} />
    )
  }

  // If there's a color configuration, use a colored circle
  if (TOKEN_COLORS[token]) {
    return <div className={`${size} ${TOKEN_COLORS[token]} rounded-full ${className}`} />
  }

  // Default gray circle
  return <div className={`${size} bg-gray-300 dark:bg-gray-600 rounded-full ${className}`} />
}

/**
 * Dual Token Icon Component (for LP tokens)
 */
interface DualTokenIconProps {
  token0: string
  token1: string
  size?: string
  className?: string
}

export function DualTokenIcon({
  token0,
  token1,
  size = 'w-8 h-8',
  className = '',
}: DualTokenIconProps) {
  return (
    <div className={`flex items-center ${className}`}>
      <TokenIcon token={token0} size={size} />
      <div className="-ml-2">
        <TokenIcon token={token1} size={size} />
      </div>
    </div>
  )
}

export default TokenIcon
