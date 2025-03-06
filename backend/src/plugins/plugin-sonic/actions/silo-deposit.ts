import {
  type Action,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  ModelClass,
  type State,
  composeContext,
  elizaLogger,
  generateObject,
} from '@elizaos/core';
import { erc20Abi, parseUnits } from 'viem';
import { z } from 'zod';
import { ethereumAddressSchema } from '../../../validators/ethereum';
import {
  viemPublicClientSchema,
  viemWalletClientSchema,
} from '../../../validators/viem';
import { VAULT_ABI } from '../constants';
import { initSonicProvider } from '../providers/sonic';
import { deposit as depositSilo } from '../services/silo-service';
import { SILO_DEPOSIT_TEMPLATE } from '../templates/silo-deposit-template';
import type { MessageMetadata } from '../types/message-metadata';

const depositContentSchema = z.object({
  siloAddress: ethereumAddressSchema,
  tokenAddress: ethereumAddressSchema,
  amount: z.number(),
  userVaultAddress: ethereumAddressSchema,
});

const extendedDepositContentSchema = depositContentSchema.extend({
  publicClient: viemPublicClientSchema,
  walletClient: viemWalletClientSchema,
});
type DepositContent = z.infer<typeof depositContentSchema>;
type ExtendedDepositContent = z.infer<typeof extendedDepositContentSchema>;

async function deposit(params: ExtendedDepositContent) {
  const {
    walletClient,
    publicClient,
    siloAddress,
    tokenAddress,
    userVaultAddress,
    amount,
  } = params;
  const agentAddress = walletClient.account?.address;
  if (!agentAddress) {
    return {
      success: false,
      error: 'Agent address is not set',
    };
  }
  // First check if the agent has authorization over the vault
  const agentRoles = await publicClient.readContract({
    address: userVaultAddress,
    abi: VAULT_ABI,
    functionName: 'rolesOf',
    args: [agentAddress],
  });

  if (agentRoles !== 1n) {
    return {
      success: false,
      error: 'Agent cannot operate this vault',
    };
  }

  const decimals = await publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'decimals',
  });

  const bigIntAmount = parseUnits(amount.toString(), decimals);

  const { transactionHash, success, error } = await depositSilo({
    publicClient,
    walletClient,
    siloAddress,
    vaultAddress: userVaultAddress,
    amount: bigIntAmount,
    tokenAddress,
  });

  return {
    success,
    transactionHash: transactionHash,
    error,
  };
}

export const depositAction: Action = {
  name: 'DEPOSIT',
  description:
    'Deposits assets into a Silo vault using ERC4626 deposit function',
  similes: [
    'DEPOSIT_ASSETS',
    'ADD_LIQUIDITY',
    'STORE_ASSETS',
    'LOCK_ASSETS',
    'PROVIDE_LIQUIDITY',
  ],
  examples: [
    [
      {
        user: '{{user1}}',
        content: {
          text: 'Deposit 1 wstETH into Silo vault',
          action: 'DEPOSIT',
        },
      },
      {
        user: '{{agentName}}',
        content: {
          text: 'Successfully deposited 1 wstETH into Silo vault',
          action: 'DEPOSIT',
        },
      },
    ],
  ],
  // TODO Probably need to validate that we have the silo vaults data loaded
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
    state?: State,
    _options?: {
      [key: string]: unknown;
    },
    callback?: HandlerCallback,
  ) => {
    elizaLogger.log('Silo Deposit action handler called');
    const currentState = state
      ? await runtime.updateRecentMessageState(state)
      : await runtime.composeState(message);

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

    const sonicProvider = await initSonicProvider(runtime);
    const context = composeContext({
      state: currentState,
      template: SILO_DEPOSIT_TEMPLATE,
    });
    elizaLogger.log(`Silo deposit context is ${JSON.stringify(context)}`);

    const content = await generateObject({
      runtime,
      context,
      modelClass: ModelClass.LARGE,
      schema: depositContentSchema,
      schemaName: 'depositContentSchema',
      schemaDescription: 'Schema for the deposit content',
    });

    elizaLogger.log(`Silo deposit content is ${JSON.stringify(content)}`);

    const depositContent = content.object as DepositContent;

    try {
      const response = await deposit({
        ...depositContent,
        publicClient: sonicProvider.getPublicClient(),
        walletClient: sonicProvider.getWalletClient(),
      });
      if (callback) {
        callback({
          text: `Successfully deposited ${depositContent.amount} tokens to ${depositContent.siloAddress}\nTransaction Hash: ${response.transactionHash}`,
          content: {
            success: true,
            hash: response.transactionHash,
            recipient: depositContent.siloAddress,
            action: 'DEPOSIT',
          },
        });
      }
      return true;
    } catch (error) {
      console.error(
        'Error in silo deposit:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      if (callback) {
        callback({
          text:
            error instanceof Error
              ? error.message
              : 'Failed to deposit to silo',
        });
      }
      return false;
    }
  },
};
