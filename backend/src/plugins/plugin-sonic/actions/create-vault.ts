import {
  type Action,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type RAGKnowledgeItem,
  type State,
  type UUID,
  elizaLogger,
} from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import { http, createPublicClient, createWalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sonic } from 'viem/chains';
import { z } from 'zod';
import VaultFactoryArtifact from '../../../../../contracts/artifacts/src/contracts/create-vault/VaultFactory.sol/VaultFactory.json';
import { env } from '../../../config/env';

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
      transport: http('https://rpc.soniclabs.com'),
    });

    // Create wallet client with private key
    const account = privateKeyToAccount(env.EVM_PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: sonic,
      transport: http('https://rpc.soniclabs.com'),
    });

    // Create vault through factory
    const hash = await walletClient.writeContract({
      address: env.VAULT_FACTORY_ADDRESS,
      abi: VaultFactoryArtifact.abi,
      functionName: 'createVault',
      args: [
        tokenAddress as `0x${string}`,
        vaultName || 'My Sonic Vault',
        vaultDescription || 'AI-managed vault for Sonic users',
        'SONIC_VAULT',
      ],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // Log the transaction receipt for debugging
    elizaLogger.info('Transaction receipt:', {
      logs: receipt.logs,
      status: receipt.status,
      contractAddress: receipt.contractAddress,
    });

    // Look for the VaultCreated event in the transaction receipt
    const vaultCreatedEvent = receipt.logs.find(
      (log) =>
        log.topics[0] ===
        '0x897c133dfbfe1f6239e98b4ffd7e4f6c86a62350a131a7a37790419f58af02f9',
    );

    if (!vaultCreatedEvent) {
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
  validate: async (_runtime: IAgentRuntime) => {
    return true;
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: {
      [key: string]: unknown;
    },
    callback?: HandlerCallback,
  ) => {
    elizaLogger.log('Create Vault handler called');

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
        '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38', // Sonic (S) token address
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
