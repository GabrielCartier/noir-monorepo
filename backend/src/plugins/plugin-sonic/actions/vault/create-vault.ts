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
import type { Account, Address, PublicClient, WalletClient } from 'viem';
import { z } from 'zod';
import { VAULT_FACTORY_ABI } from '../../../../constants/abis/vault-factory-abi';
import { ethereumAddressSchema } from '../../../../validators/ethereum';
import { initSonicProvider } from '../../providers/sonic';

// TODO Move this to a type
interface MessageMetadata {
  walletAddress?: Address;
  [key: string]: unknown;
}

const createVaultContentSchema = z.object({
  userId: z.string().uuid(),
  walletAddress: ethereumAddressSchema,
  agentAddress: ethereumAddressSchema,
  vaultFactoryAddress: ethereumAddressSchema,
  // FIXME Should be typed
  publicClient: z.unknown(),
  walletClient: z.unknown(),
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
      agentAddress,
      publicClient,
      walletClient,
    } = parsedParams;
    const typedPublicClient = publicClient as PublicClient;
    const typedWalletClient = walletClient as WalletClient;
    const { runtime } = params;

    // Create vault through factory
    const { request } = await typedPublicClient.simulateContract({
      account: agentAddress as `0x${string}`,
      address: vaultFactoryAddress as `0x${string}`,
      abi: VAULT_FACTORY_ABI,
      functionName: 'createVault',
      args: [walletAddress as `0x${string}`, agentAddress as `0x${string}`],
    });

    const hash = await typedWalletClient.writeContract({
      ...request,
      account: typedWalletClient.account as Account,
    });
    const receipt = await typedPublicClient.waitForTransactionReceipt({ hash });

    // Log the transaction receipt for debugging
    elizaLogger.info('Successfully created vault', {
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
      agentAddress: sonicProvider.account.address,
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
