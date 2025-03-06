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
import { z } from 'zod';
import { ethereumAddressSchema } from '../../../validators/ethereum';
import {
  viemPublicClientSchema,
  viemWalletClientSchema,
} from '../../../validators/viem';
import { VAULT_FACTORY_ABI } from '../constants/vault-factory-abi';
import { initSonicProvider } from '../providers/sonic';
import type { MessageMetadata } from '../types/message-metadata';

const createVaultContentSchema = z.object({
  userId: z.string().uuid(),
  walletAddress: ethereumAddressSchema,
  vaultFactoryAddress: ethereumAddressSchema,
  publicClient: viemPublicClientSchema,
  walletClient: viemWalletClientSchema,
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
  try {
    const parsedParams = createVaultContentSchema.parse(params);
    const {
      userId,
      walletAddress,
      vaultFactoryAddress,
      publicClient,
      walletClient,
    } = parsedParams;
    const agentAddress = walletClient.account?.address;
    if (!agentAddress) {
      throw new Error('Agent address not found');
    }

    // Approve from the vault address
    const { request } = await publicClient.simulateContract({
      account: walletClient.account,
      address: vaultFactoryAddress,
      abi: VAULT_FACTORY_ABI,
      functionName: 'createVault',
      args: [walletAddress, agentAddress],
    });

    const hash = await walletClient.writeContract(request);
    await publicClient.waitForTransactionReceipt({ hash });

    elizaLogger.info('Successfully created vault', {
      hash,
    });

    const vaultAddress = await publicClient.readContract({
      address: vaultFactoryAddress,
      abi: VAULT_FACTORY_ABI,
      functionName: 'getUserVault',
      args: [walletAddress],
    });

    // Create knowledge about the vault with Sonic-specific information
    const vaultKnowledge: RAGKnowledgeItem = {
      id: uuidv4() as UUID,
      agentId: params.runtime.agentId,
      content: {
        text: `Vault created for user ${userId}`,
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
    await params.runtime.databaseAdapter.createKnowledge(vaultKnowledge);

    // Log the vault creation details
    elizaLogger.info('Created Sonic vault:', {
      userId,
      walletAddress,
      vaultAddress,
      agentId: params.runtime.agentId,
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
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const vaultFactoryAddress = runtime.getSetting('VAULT_FACTORY_ADDRESS');
    if (!vaultFactoryAddress) {
      return false;
    }
    const rpcUrl = runtime.getSetting('SONIC_RPC_URL');
    if (!rpcUrl) {
      return false;
    }
    const privateKey = runtime.getSetting('EVM_PRIVATE_KEY') as `0x${string}`;
    if (!privateKey) {
      return false;
    }
    const metadata = message.content.metadata as MessageMetadata;
    const walletAddress = metadata?.walletAddress;
    if (!walletAddress) {
      return false;
    }
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
    const sonicProvider = await initSonicProvider(runtime);

    // Extract wallet address from message metadata
    const metadata = message.content.metadata as MessageMetadata;
    const walletAddress = metadata?.walletAddress;
    // Should not happen, it is validated
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
    const createVaultContent: CreateVaultContent = {
      userId: message.userId,
      walletAddress,
      vaultFactoryAddress: sonicProvider.vaultFactoryAddress,
      publicClient: sonicProvider.getPublicClient(),
      walletClient: sonicProvider.getWalletClient(),
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
