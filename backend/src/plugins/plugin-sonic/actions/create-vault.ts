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
import type { Address, PublicClient } from 'viem';
import { encodeFunctionData } from 'viem';
import { z } from 'zod';
import { ethereumAddressSchema } from '../../../validators/ethereum';
import { VAULT_FACTORY_ABI } from '../constants/vault-factory-abi';
import { initSonicProvider } from '../providers/sonic';

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
    const { userId, walletAddress, vaultFactoryAddress, publicClient } =
      parsedParams;
    const typedPublicClient = publicClient as PublicClient;
    const { runtime } = params;

    console.log('Starting vault creation with params:', {
      userId,
      walletAddress,
      vaultFactoryAddress,
    });

    const sonicProvider = initSonicProvider(runtime);
    console.log(
      'SonicProvider initialized with account:',
      sonicProvider.account.address,
    );

    // Create vault through factory
    console.log('Creating vault...');
    const walletClient = sonicProvider.getWalletClient();

    // Get the current nonce
    const nonce = await typedPublicClient.getTransactionCount({
      address: sonicProvider.account.address,
    });

    // Encode the function call
    console.log('Encoding function call...');
    const data = encodeFunctionData({
      abi: VAULT_FACTORY_ABI,
      functionName: 'createVault',
      args: [walletAddress],
    });

    // Estimate gas for the transaction
    console.log('Estimating gas...');
    const gas = await typedPublicClient.estimateGas({
      account: sonicProvider.account.address,
      to: vaultFactoryAddress,
      data,
    });

    // Get the current gas price
    const { maxFeePerGas, maxPriorityFeePerGas } =
      await typedPublicClient.estimateFeesPerGas();

    // Prepare the transaction
    console.log('Preparing transaction...');

    // Sign the transaction
    console.log('Signing transaction...');
    const signedTx = await walletClient.signTransaction({
      to: vaultFactoryAddress,
      from: sonicProvider.account.address,
      nonce,
      gas,
      chainId: sonicProvider.chain.id,
      data,
      account: sonicProvider.account,
      chain: sonicProvider.chain,
      type: 'eip1559',
      maxFeePerGas,
      maxPriorityFeePerGas,
    });

    // Send the raw transaction
    console.log('Sending raw transaction...');
    const hash = await walletClient.sendRawTransaction({
      serializedTransaction: signedTx,
    });

    console.log('Transaction sent, hash:', hash);

    console.log('Waiting for transaction receipt...');
    const receipt = await typedPublicClient.waitForTransactionReceipt({ hash });
    console.log('Transaction receipt received:', {
      contractAddress: receipt.contractAddress,
      status: receipt.status,
      blockNumber: receipt.blockNumber,
    });

    // Log the transaction receipt for debugging
    elizaLogger.info('Successfully created vault', {
      contractAddress: receipt.contractAddress,
    });

    // Log all event topics for debugging
    console.log(
      'All event topics:',
      receipt.logs.map((log) => ({
        address: log.address,
        topic: log.topics[0],
        data: log.data,
      })),
    );

    // Look for the VaultCreated event in the transaction receipt
    const vaultCreatedEvent = receipt.logs.find(
      (log) =>
        log.topics[0] ===
        '0x5d9c31ffa0fecffd7cf379989a3c7af252f0335e0d2a1320b55245912c781f53',
    );

    if (!vaultCreatedEvent) {
      console.error(
        'VaultCreated event not found in receipt logs:',
        receipt.logs,
      );
      throw new Error('VaultCreated event not found in transaction receipt');
    }

    // The vault address is the first indexed parameter in the event
    const vaultAddress = vaultCreatedEvent.topics[1] as `0x${string}`;
    console.log('Found VaultCreated event:', {
      vaultAddress,
      eventTopics: vaultCreatedEvent.topics,
      eventData: vaultCreatedEvent.data,
    });

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
    const privateKey = runtime.getSetting('SONIC_PRIVATE_KEY') as `0x${string}`;
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
