import { elizaLogger } from '@elizaos/core';
import type { IAgentRuntime, RAGKnowledgeItem, UUID } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import { erc20Abi } from 'viem';
import type { Account, PublicClient, WalletClient } from 'viem';
import { z } from 'zod';
import { VAULT_ABI } from '../constants/abis/vault-abi';
import { VAULT_FACTORY_ABI } from '../constants/abis/vault-factory-abi';
import type {
  GetVaultParams,
  TokenParams,
  VaultBalanceResponse,
  VaultTransactionResponse,
} from '../types/vault-service';
import { ethereumAddressSchema } from '../validators/ethereum';

/**
 * Get the balance of a specific token in the vault
 */
export async function getVaultBalance(
  params: TokenParams,
): Promise<VaultBalanceResponse> {
  const { publicClient, vaultAddress, tokenAddress } = params;

  try {
    const balance = await publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [vaultAddress],
    });

    return { balance };
  } catch (error) {
    elizaLogger.error('[VaultService] Error getting vault balance:', error);
    throw error;
  }
}

/**
 * Deposit tokens into the vault
 */
export async function depositToVault(
  params: TokenParams,
): Promise<VaultTransactionResponse> {
  const { publicClient, walletClient, vaultAddress, tokenAddress, amount } =
    params;

  try {
    const { request } = await publicClient.simulateContract({
      account: walletClient.account,
      address: vaultAddress,
      abi: VAULT_ABI,
      functionName: 'deposit',
      args: [tokenAddress, amount],
    });

    const hash = await walletClient.writeContract(request);
    await publicClient.waitForTransactionReceipt({ hash });

    elizaLogger.info('[VaultService] Successfully deposited to vault:', {
      vaultAddress,
      tokenAddress,
      amount: amount.toString(),
      transactionHash: hash,
    });

    return {
      success: true,
      transactionHash: hash,
    };
  } catch (error) {
    elizaLogger.error('[VaultService] Error depositing to vault:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Withdraw tokens from the vault
 */
export async function withdrawFromVault(
  params: TokenParams,
): Promise<VaultTransactionResponse> {
  const { publicClient, walletClient, vaultAddress, tokenAddress, amount } =
    params;

  try {
    const { request } = await publicClient.simulateContract({
      account: walletClient.account,
      address: vaultAddress,
      abi: VAULT_ABI,
      functionName: 'withdraw',
      args: [tokenAddress, amount],
    });

    const hash = await walletClient.writeContract(request);
    await publicClient.waitForTransactionReceipt({ hash });

    elizaLogger.info('[VaultService] Successfully withdrawn from vault:', {
      vaultAddress,
      tokenAddress,
      amount: amount.toString(),
      transactionHash: hash,
    });

    return {
      success: true,
      transactionHash: hash,
    };
  } catch (error) {
    elizaLogger.error('[VaultService] Error withdrawing from vault:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function getVault(params: GetVaultParams) {
  const { publicClient, vaultFactoryAddress, userAddress } = params;

  try {
    const vaultAddress = await publicClient.readContract({
      address: vaultFactoryAddress,
      abi: VAULT_FACTORY_ABI,
      functionName: 'userVault',
      args: [userAddress],
    });

    return { vaultAddress };
  } catch (error) {
    elizaLogger.error('[VaultService] Error getting vault:', error);
    throw error;
  }
}

const createVaultContentSchema = z.object({
  userId: z.string().uuid(),
  walletAddress: ethereumAddressSchema,
  agentAddress: ethereumAddressSchema,
  vaultFactoryAddress: ethereumAddressSchema,
  publicClient: z.unknown(),
  walletClient: z.unknown(),
});

type CreateVaultContent = z.infer<typeof createVaultContentSchema>;

interface CreateVaultResponse {
  success: boolean;
  vaultAddress?: string;
  error?: string;
}

export async function createVault(
  params: CreateVaultContent & { runtime: IAgentRuntime },
): Promise<CreateVaultResponse> {
  try {
    const parsedParams = createVaultContentSchema.parse(params);
    const {
      userId,
      walletAddress,
      vaultFactoryAddress,
      agentAddress,
      publicClient,
      walletClient,
    } = parsedParams;
    const typedPublicClient = publicClient as PublicClient;
    const typedWalletClient = walletClient as WalletClient;
    const { runtime } = params;

    // Log the input parameters
    elizaLogger.info('Creating vault with parameters:', {
      userId,
      walletAddress,
      vaultFactoryAddress,
      agentAddress,
    });

    // First check if a vault already exists for this user
    const existingVault = await typedPublicClient.readContract({
      address: vaultFactoryAddress as `0x${string}`,
      abi: VAULT_FACTORY_ABI,
      functionName: 'userVault',
      args: [walletAddress as `0x${string}`],
    });

    if (existingVault !== '0x0000000000000000000000000000000000000000') {
      elizaLogger.info('Vault already exists for user:', {
        userId,
        walletAddress,
        vaultAddress: existingVault,
      });
      return {
        success: true,
        vaultAddress: existingVault,
      };
    }

    // Create vault through factory
    const { request } = await typedPublicClient.simulateContract({
      account: agentAddress as `0x${string}`,
      address: vaultFactoryAddress as `0x${string}`,
      abi: VAULT_FACTORY_ABI,
      functionName: 'createVault',
      args: [walletAddress as `0x${string}`, agentAddress as `0x${string}`],
    });

    elizaLogger.info('Contract simulation successful, sending transaction');

    const hash = await typedWalletClient.writeContract({
      ...request,
      account: typedWalletClient.account as Account,
    });

    elizaLogger.info('Transaction sent, waiting for receipt:', { hash });

    const receipt = await typedPublicClient.waitForTransactionReceipt({ hash });

    // Log the full receipt for debugging
    elizaLogger.info('Transaction receipt:', {
      status: receipt.status,
      blockNumber: receipt.blockNumber,
      contractAddress: receipt.contractAddress,
      logs: receipt.logs.map((log) => ({
        address: log.address,
        topics: log.topics,
        data: log.data,
      })),
    });

    // Look for the VaultCreated event in the transaction receipt
    const vaultCreatedEvent = receipt.logs.find(
      (log) =>
        log.topics[0] ===
        '0x5d9c31ffa0fecffd7cf379989a3c7af252f0335e0d2a1320b55245912c781f53',
    );

    if (!vaultCreatedEvent) {
      elizaLogger.error('VaultCreated event not found. Available events:', {
        eventTopics: receipt.logs.map((log) => log.topics[0]),
      });
      throw new Error('VaultCreated event not found in transaction receipt');
    }

    // The vault address is the first indexed parameter in the event
    const vaultAddress = vaultCreatedEvent.topics[1] as `0x${string}`;

    // Create knowledge about the vault with Sonic-specific information
    const vaultKnowledge: RAGKnowledgeItem = {
      id: uuidv4() as UUID,
      agentId: runtime.agentId,
      content: {
        text: `Sonic Vault created for user ${userId}`,
        metadata: {
          source: 'sonic_plugin',
          type: 'vault_info',
          isMain: true,
          isShared: true,
          vaultAddress,
          userId,
          walletAddress,
          createdAt: new Date().toISOString(),
          transactionHash: hash,
        },
      },
      embedding: new Float32Array(1536).fill(0),
      createdAt: Date.now(),
    };

    // Store the vault knowledge
    await runtime.databaseAdapter.createKnowledge(vaultKnowledge);

    // Log the vault creation details
    elizaLogger.info('Created Sonic vault:', {
      userId,
      walletAddress,
      vaultAddress,
      agentId: runtime.agentId,
      transactionHash: hash,
    });

    return {
      success: true,
      vaultAddress,
    };
  } catch (error) {
    elizaLogger.error('Error in vault creation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
