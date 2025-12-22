import { useAccount, useSignTypedData, usePublicClient } from 'wagmi'
import { parseUnits } from 'viem'
import { logger } from '@/utils/logger'

const ERC20_PERMIT_ABI = [
  {
    name: 'nonces',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: 'nonce', type: 'uint256' }],
  },
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'version',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const

/**
 * EIP-2612 Permit signing hook
 * Used to implement one-step signature authorization without prior approve
 */
export function usePermit() {
  const { address, chainId } = useAccount()
  const { signTypedDataAsync } = useSignTypedData()
  const publicClient = usePublicClient()

  /**
   * Sign EIP-2612 permit
   * @param tokenAddress Token contract address
   * @param tokenName Token name (for EIP-712 domain)
   * @param spenderAddress Authorized spender address (usually Minter contract)
   * @param amount Authorization amount (string)
   * @param decimals Token decimals
   * @param deadline Deadline timestamp (optional, default 1 hour later)
   * @returns permit signature parameters {v, r, s, deadline}
   */
  const signPermit = async ({
    tokenAddress,
    tokenName,
    spenderAddress,
    amount,
    decimals,
    deadline,
  }: {
    tokenAddress: `0x${string}`
    tokenName?: string
    spenderAddress: `0x${string}`
    amount: string
    decimals: number
    deadline?: bigint
  }) => {
    if (!address || !chainId) {
      throw new Error('Wallet not connected')
    }

    if (!publicClient) {
      throw new Error('Public client unavailable')
    }

    try {
      // Parse amount
      const value = parseUnits(amount, decimals)

      // Set default deadline (1 hour later)
      const deadlineTimestamp = deadline || BigInt(Math.floor(Date.now() / 1000) + 3600)

      // Get token name (for EIP-712 domain)
      const resolvedTokenName =
        tokenName ??
        ((await publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_PERMIT_ABI,
          functionName: 'name',
        })) as string)

      let resolvedVersion = '1'
      try {
        const onChainVersion = (await publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_PERMIT_ABI,
          functionName: 'version',
        })) as string
        if (onChainVersion) {
          resolvedVersion = onChainVersion
        }
      } catch {
        // Optional version() not implemented; keep default
      }

      // Get current nonce
      const nonce = (await publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_PERMIT_ABI,
        functionName: 'nonces',
        args: [address],
      })) as bigint

      // EIP-712 typed data
      const domain = {
        name: resolvedTokenName,
        version: resolvedVersion,
        chainId: BigInt(chainId),
        verifyingContract: tokenAddress,
      } as const

      const types = {
        Permit: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      } as const

      const message = {
        owner: address,
        spender: spenderAddress,
        value,
        nonce,
        deadline: deadlineTimestamp,
      } as const

      logger.info('Signing EIP-2612 permit...', {
        token: tokenAddress,
        spender: spenderAddress,
        amount,
        tokenName: resolvedTokenName,
        deadline: deadlineTimestamp.toString(),
      })

      // Sign
      const signature = await signTypedDataAsync({
        domain,
        types,
        primaryType: 'Permit',
        message,
      })

      // Split signature into r, s, v
      const r = `0x${signature.slice(2, 66)}` as `0x${string}`
      const s = `0x${signature.slice(66, 130)}` as `0x${string}`
      const v = parseInt(signature.slice(130, 132), 16)

      logger.info('EIP-2612 permit signed successfully')

      return {
        v,
        r,
        s,
        deadline: deadlineTimestamp,
        value,
      }
    } catch (error) {
      logger.error('Permit signing failed:', error)
      throw error
    }
  }

  return {
    signPermit,
  }
}
