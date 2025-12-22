# Bitres Interface

Frontend interface for Bitres (Bitcoin Reserve System) - a decentralized stablecoin protocol backed by Bitcoin.

## Features

- **Mint BTD**: Deposit WBTC to mint BTD stablecoin
- **Redeem BTD/BTB**: Redeem tokens for underlying WBTC collateral
- **Staking**: Stake BTD/BTB to earn yield via ERC4626 vaults
- **Farming**: Provide liquidity and earn BRS governance token rewards
- **Explorer**: View system metrics, token prices, and contract data

## Tech Stack

- React 18 + TypeScript
- Vite
- TailwindCSS
- wagmi + viem (Ethereum interactions)
- EIP-2612 Permit signatures

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm or npm

### Installation

```bash
# Install dependencies
npm install

# Copy contract addresses config
cp src/config/contracts.example.ts src/config/contracts.ts

# Start development server
npm run dev
```

### Local Development

For local development with Hardhat:

1. Start the local blockchain and deploy contracts from the `bitres` repository
2. The deployment script will automatically update `src/config/contracts.ts`
3. Access the interface at `http://localhost:3000`

## Project Structure

```
src/
├── abis/           # Contract ABIs
├── components/     # React components
├── config/         # Configuration files
├── hooks/          # Custom React hooks
├── pages/          # Page components
├── providers/      # Context providers
└── utils/          # Utility functions
```

## License

MIT
