import {
  type Action,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type RAGKnowledgeItem,
  type State,
  type UUID,
  composeContext,
  elizaLogger,
} from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import { http, createPublicClient, createWalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sonic } from 'viem/chains';
import { z } from 'zod';
import { VaultFactory } from '../contracts/create-vault/VaultFactory';

interface MessageMetadata {
  walletAddress?: string;
  [key: string]: unknown;
}

const createVaultContentSchema = z.object({
  userId: z.string(),
  walletAddress: z.string(),
  tokenAddress: z.string(),
  vaultName: z.string().optional(),
  vaultDescription: z.string().optional(),
});

type CreateVaultContent = z.infer<typeof createVaultContentSchema>;

interface CreateVaultResponse {
  success: boolean;
  vaultAddress?: string;
  error?: string;
}

async function createVault(
  params: CreateVaultContent & { runtime: IAgentRuntime },
): Promise<CreateVaultResponse> {
  const {
    userId,
    walletAddress,
    tokenAddress,
    vaultName,
    vaultDescription,
    runtime,
  } = params;

  try {
    // Initialize Viem clients
    const publicClient = createPublicClient({
      chain: sonic,
      transport: http(),
    });

    // Create wallet client with private key (should be stored securely)
    const account = privateKeyToAccount(
      process.env.VAULT_CREATOR_PRIVATE_KEY as `0x${string}`,
    );
    const walletClient = createWalletClient({
      account,
      chain: sonic,
      transport: http(),
    });

    // Deploy VaultFactory if not already deployed
    const factoryAddress = process.env.VAULT_FACTORY_ADDRESS as `0x${string}`;
    if (!factoryAddress) {
      throw new Error('VAULT_FACTORY_ADDRESS not configured');
    }

    // Create vault through factory
    const { request } = await publicClient.simulateContract({
      address: factoryAddress,
      abi: VaultFactory.abi,
      functionName: 'createVault',
      args: [
        tokenAddress as `0x${string}`,
        vaultName || 'My Sonic Vault',
        vaultDescription || 'AI-managed vault for Sonic users',
        'SONIC_VAULT',
      ],
      account: account.address,
    });

    // Send transaction
    const hash = await walletClient.writeContract(request);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (!receipt.contractAddress) {
      throw new Error('Failed to get vault address from transaction receipt');
    }

    const vaultAddress = receipt.contractAddress;

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
          tokenAddress,
          vaultName,
          vaultDescription,
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
      tokenAddress,
      vaultName,
      vaultDescription,
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

export const createVaultAction: Action = {
  name: 'CREATE_VAULT',
  description: 'Creates a new vault for a user using the VaultFactory contract',
  similes: [
    'CREATE_NEW_VAULT',
    'INITIALIZE_VAULT',
    'SETUP_VAULT',
    'OPEN_VAULT',
  ],
  examples: [
    [
      {
        user: '{{user1}}',
        content: {
          text: 'Create a new vault for my wallet',
          action: 'CREATE_VAULT',
        },
      },
      {
        user: '{{agentName}}',
        content: {
          text: 'Successfully created a new vault for your wallet',
          action: 'CREATE_VAULT',
        },
      },
    ],
  ],
  validate: async (runtime: IAgentRuntime) => {
    return true;
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: {
      [key: string]: unknown;
    },
    callback?: HandlerCallback,
  ) => {
    elizaLogger.log('Create Vault handler called');
    const currentState = state
      ? await runtime.updateRecentMessageState(state)
      : await runtime.composeState(message);

    const context = composeContext({
      state: currentState,
      template: 'Create a new vault for the user',
    });

    // Extract wallet address from message metadata
    const metadata = message.content.metadata as MessageMetadata;
    const walletAddress = metadata?.walletAddress;
    if (!walletAddress) {
      elizaLogger.error('No wallet address provided in message metadata');
      if (callback) {
        callback({
          text: 'Error: No wallet address provided',
        });
      }
      return false;
    }

    // Use the userId from the message
    const createVaultContent = {
      userId: message.userId,
      walletAddress,
      tokenAddress:
        process.env.DEFAULT_TOKEN_ADDRESS ||
        '0x0000000000000000000000000000000000000000',
      vaultName: 'My Sonic Vault',
      vaultDescription: 'AI-managed vault for Sonic users',
    };

    try {
      const response = await createVault({
        ...createVaultContent,
        runtime,
      });

      if (response.success) {
        if (callback) {
          callback({
            text: `Successfully created a new vault at ${response.vaultAddress}`,
            content: {
              success: true,
              vaultAddress: response.vaultAddress,
              action: 'CREATE_VAULT',
            },
          });
        }
        return true;
      }
      throw new Error(response.error || 'Failed to create vault');
    } catch (error) {
      elizaLogger.error(
        'Error in create vault handler:',
        error instanceof Error ? error.message : String(error),
      );
      if (callback) {
        callback({
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
      return false;
    }
  },
};
