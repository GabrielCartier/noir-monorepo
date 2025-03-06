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
import { z } from 'zod';

interface MessageMetadata {
  walletAddress?: string;
  [key: string]: unknown;
}

const createVaultContentSchema = z.object({
  userId: z.string(),
  walletAddress: z.string(),
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
  const { userId, walletAddress, runtime } = params;

  try {
    // Simulate vault creation by generating a random address
    const simulatedVaultAddress = `0x${uuidv4().replace(/-/g, '').slice(0, 40)}`;

    // Create knowledge about the vault with only essential information
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
          vaultAddress: simulatedVaultAddress,
          userId,
          walletAddress,
          createdAt: new Date().toISOString(),
        },
      },
      // Note: In a real implementation, you would generate an embedding for the content
      // For now, we'll use a zero vector as placeholder
      embedding: new Float32Array(1536).fill(0),
      createdAt: Date.now(),
    };

    // Store the vault knowledge
    await runtime.databaseAdapter.createKnowledge(vaultKnowledge);

    // Log the simulation details
    elizaLogger.info('Simulating Sonic vault creation:', {
      userId,
      walletAddress,
      simulatedVaultAddress,
      agentId: runtime.agentId,
    });

    return {
      success: true,
      vaultAddress: simulatedVaultAddress,
    };
  } catch (error) {
    elizaLogger.error('Error in vault simulation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export const createVaultAction: Action = {
  name: 'CREATE_VAULT',
  description: 'Simulates creating a new vault for a user',
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
          text: 'Successfully simulated creating a new vault for your wallet',
          action: 'CREATE_VAULT',
        },
      },
    ],
  ],
  validate: async (runtime: IAgentRuntime) => {
    return true; // No special validation needed for simulation
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
    elizaLogger.log('Create Vault simulation handler called');
    const currentState = state
      ? await runtime.updateRecentMessageState(state)
      : await runtime.composeState(message);

    const context = composeContext({
      state: currentState,
      template: 'Simulate creating a new vault for the user',
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

    // Use the userId from the message instead of generating a new one
    const createVaultContent = {
      userId: message.userId,
      walletAddress,
    };

    try {
      const response = await createVault({
        ...createVaultContent,
        runtime,
      });

      if (response.success) {
        if (callback) {
          callback({
            text: `Successfully simulated creating a new vault at ${response.vaultAddress}`,
            content: {
              success: true,
              vaultAddress: response.vaultAddress,
              action: 'CREATE_VAULT',
            },
          });
        }
        return true;
      }
      throw new Error(response.error || 'Failed to simulate vault creation');
    } catch (error) {
      elizaLogger.error(
        'Error in create vault simulation handler:',
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
