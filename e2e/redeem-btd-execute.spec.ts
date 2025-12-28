/**
 * E2E Test: Execute Redeem BTD Contract
 *
 * Actually executes redeemBTD on the Minter contract using viem
 * and verifies balance changes.
 */

import { test, expect } from '@playwright/test'
import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from 'viem'
import { hardhat } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { CONTRACTS } from '../src/config/contracts'

// Hardhat account #0
const PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
const account = privateKeyToAccount(PRIVATE_KEY)

// Clients
const publicClient = createPublicClient({
  chain: hardhat,
  transport: http('http://localhost:8545'),
})

const walletClient = createWalletClient({
  account,
  chain: hardhat,
  transport: http('http://localhost:8545'),
})

// ABIs
const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { name: 'approve', type: 'function', inputs: [{ type: 'address' }, { type: 'uint256' }], outputs: [{ type: 'bool' }], stateMutability: 'nonpayable' },
  { name: 'allowance', type: 'function', inputs: [{ type: 'address' }, { type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
] as const

const MINTER_ABI = [
  { name: 'redeemBTD', type: 'function', inputs: [{ type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
] as const

test.describe('Execute Redeem BTD Contract', () => {
  test('should execute redeemBTD and verify balance changes', async () => {
    test.setTimeout(60000)
    console.log('=== Execute Redeem BTD Contract Test ===')
    console.log('Account:', account.address)
    console.log('Minter:', CONTRACTS.Minter)
    console.log('BTD:', CONTRACTS.BTD)
    console.log('WBTC:', CONTRACTS.WBTC)

    // Step 1: Check initial balances
    console.log('\n--- Step 1: Initial Balances ---')
    const initialBTD = await publicClient.readContract({
      address: CONTRACTS.BTD,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    })
    const initialWBTC = await publicClient.readContract({
      address: CONTRACTS.WBTC,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    })
    console.log('Initial BTD:', formatUnits(initialBTD, 18))
    console.log('Initial WBTC:', formatUnits(initialWBTC, 8))

    if (initialBTD === 0n) {
      console.log('⚠️ No BTD balance. Cannot execute redeem.')
      test.skip()
      return
    }

    // Step 2: Set redeem amount
    const redeemAmount = parseUnits('10', 18) // Redeem 10 BTD
    console.log('\n--- Step 2: Redeem Amount ---')
    console.log('Amount to redeem:', formatUnits(redeemAmount, 18), 'BTD')

    if (initialBTD < redeemAmount) {
      console.log('⚠️ Insufficient BTD balance. Using available:', formatUnits(initialBTD, 18))
    }

    const actualRedeemAmount = initialBTD < redeemAmount ? initialBTD : redeemAmount

    // Step 3: Check and set allowance
    console.log('\n--- Step 3: Check Allowance ---')
    const currentAllowance = await publicClient.readContract({
      address: CONTRACTS.BTD,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [account.address, CONTRACTS.Minter],
    })
    console.log('Current allowance:', formatUnits(currentAllowance, 18))

    if (currentAllowance < actualRedeemAmount) {
      console.log('Approving BTD for Minter...')
      const approveTx = await walletClient.writeContract({
        address: CONTRACTS.BTD,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACTS.Minter, actualRedeemAmount],
      })
      const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveTx })
      console.log('Approve TX:', approveTx)
      console.log('Approve status:', approveReceipt.status)
      expect(approveReceipt.status).toBe('success')
    } else {
      console.log('Allowance sufficient, skipping approve')
    }

    // Step 4: Execute redeemBTD
    console.log('\n--- Step 4: Execute redeemBTD ---')
    console.log('Calling Minter.redeemBTD with amount:', formatUnits(actualRedeemAmount, 18))

    try {
      const redeemTx = await walletClient.writeContract({
        address: CONTRACTS.Minter,
        abi: MINTER_ABI,
        functionName: 'redeemBTD',
        args: [actualRedeemAmount],
      })
      console.log('Redeem TX hash:', redeemTx)

      const redeemReceipt = await publicClient.waitForTransactionReceipt({ hash: redeemTx })
      console.log('Redeem TX status:', redeemReceipt.status)
      console.log('Gas used:', redeemReceipt.gasUsed.toString())

      expect(redeemReceipt.status).toBe('success')

      // Step 5: Verify final balances
      console.log('\n--- Step 5: Final Balances ---')
      const finalBTD = await publicClient.readContract({
        address: CONTRACTS.BTD,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [account.address],
      })
      const finalWBTC = await publicClient.readContract({
        address: CONTRACTS.WBTC,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [account.address],
      })
      console.log('Final BTD:', formatUnits(finalBTD, 18))
      console.log('Final WBTC:', formatUnits(finalWBTC, 8))

      const btdSpent = initialBTD - finalBTD
      const wbtcReceived = finalWBTC - initialWBTC
      console.log('\n--- Changes ---')
      console.log('BTD spent:', formatUnits(btdSpent, 18))
      console.log('WBTC received:', formatUnits(wbtcReceived, 8))

      // Verify
      expect(btdSpent).toBe(actualRedeemAmount)
      expect(wbtcReceived).toBeGreaterThan(0n)

      console.log('\n✅ Redeem BTD executed successfully!')
      console.log('=== Test Complete ===')

    } catch (error) {
      console.error('\n❌ Redeem failed:', error)
      throw error
    }
  })
})
