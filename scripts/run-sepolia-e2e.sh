#!/bin/bash
# Run Sepolia E2E Tests
#
# Prerequisites:
#   1. Set TEST_SEED_PHRASE with a wallet that has:
#      - Sepolia ETH (for gas)
#      - WBTC tokens (from our faucet)
#
# Usage:
#   ./scripts/run-sepolia-e2e.sh
#
# Or with inline seed phrase:
#   TEST_SEED_PHRASE="word1 word2 ... word12" ./scripts/run-sepolia-e2e.sh

set -e

cd "$(dirname "$0")/.."

# Check for seed phrase
if [ -z "$TEST_SEED_PHRASE" ] && [ -z "$OKX_SEED_PHRASE" ]; then
    echo "ERROR: No wallet seed phrase provided."
    echo ""
    echo "Set one of these environment variables:"
    echo "  export TEST_SEED_PHRASE='your 12 word seed phrase'"
    echo "  export OKX_SEED_PHRASE='your 12 word seed phrase'"
    echo ""
    echo "The wallet needs:"
    echo "  - Sepolia ETH (for gas) - get from https://sepoliafaucet.com"
    echo "  - WBTC tokens - get from our faucet script"
    exit 1
fi

# Use OKX_SEED_PHRASE if TEST_SEED_PHRASE not set
export OKX_SEED_PHRASE="${TEST_SEED_PHRASE:-$OKX_SEED_PHRASE}"

echo "============================================"
echo "  Sepolia E2E Test Runner"
echo "============================================"
echo ""
echo "Running tests against: https://bitres.org"
echo ""

# Run debug test first (no wallet needed)
echo "=> Running debug tests..."
npx playwright test e2e/sepolia-debug.spec.ts --project=chromium

# Run wallet tests
echo ""
echo "=> Running wallet tests (headed mode)..."
npx playwright test e2e/sepolia-mint.spec.ts --project=chromium --headed

echo ""
echo "============================================"
echo "  Tests Complete"
echo "============================================"
