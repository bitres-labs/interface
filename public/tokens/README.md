# Token Icons

This directory contains standard cryptocurrency token icons downloaded from CoinGecko.

## Available Icons

- **wbtc.png** - Wrapped Bitcoin (WBTC)
- **usdc.png** - USD Coin (USDC)
- **usdt.png** - Tether (USDT)
- **btc.png** - Bitcoin (BTC)
- **eth.png** - Ethereum (ETH)

## Source

All icons are sourced from [CoinGecko](https://www.coingecko.com/), a reliable cryptocurrency data aggregator.

## Usage

To use these icons in your components:

```jsx
<img
  src="/tokens/wbtc.png"
  alt="WBTC"
  className="w-5 h-5 rounded-full"
/>
```

## Adding New Icons

To add more token icons:

1. Visit CoinGecko's API: `https://assets.coingecko.com/coins/images/{id}/small/{token}.png`
2. Find the token ID from CoinGecko
3. Download and save to this directory
4. Update this README with the new icon
