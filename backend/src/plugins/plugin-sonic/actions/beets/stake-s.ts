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
import { ethereumAddressSchema } from '../../../../validators/ethereum';
import {
  viemPublicClientSchema,
  viemWalletClientSchema,
} from '../../../../validators/viem';
import { initSonicProvider } from '../../providers/sonic';
import { sonicProvider } from '../../providers/sonic';
import {
  findStakingAmountTemplate,
  validateStakingAmountTemplate,
} from '../../templates/stake-s-template';

interface StateMetadata {
  [key: string]: unknown;
  walletInfo?: string;
  supportedTokens?: string;
  siloVaults?: string;
  userVaultAddress?: string;
  amount?: number;
}

const stakeSContentSchema = z.object({
  userId: z.string().uuid(),
  userVaultAddress: ethereumAddressSchema,
  agentAddress: ethereumAddressSchema,
  amount: z
    .string()
    .refine((val) => !Number.isNaN(Number(val)) && Number(val) > 0, {
      message: 'Amount must be a positive number',
    }),
  publicClient: viemPublicClientSchema,
  walletClient: viemWalletClientSchema,
});

type StakeSContent = z.infer<typeof stakeSContentSchema>;

interface StakeSResponse {
  success: boolean;
  stsAmount?: string;
  transactionHash?: string;
  error?: string;
}

async function stakeS(
  params: StakeSContent & { runtime: IAgentRuntime },
): Promise<StakeSResponse> {
  try {
    const parsedParams = stakeSContentSchema.parse(params);
    const { userId, amount, agentAddress, publicClient, walletClient } =
      parsedParams;
    const stakingAddress = params.runtime.getSetting(
      'SONIC_STAKING_ADDRESS',
    ) as `0x${string}`;
    const sTokenAddress = params.runtime.getSetting(
      'SONIC_TOKEN_ADDRESS',
    ) as `0x${string}`;

    // 1. Check if user has sufficient $S balance
    const sBalance = await publicClient.readContract({
      address: sTokenAddress,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [agentAddress],
    });

    const decimals = await publicClient.readContract({
      address: sTokenAddress,
      abi: erc20Abi,
      functionName: 'decimals',
    });

    const bigIntAmount = parseUnits(amount, decimals);
    if (sBalance < bigIntAmount) {
      throw new Error('Insufficient $S balance');
    }

    // 2. Approve Sonic Staking contract to spend $S
    const { request: approveRequest } = await publicClient.simulateContract({
      account: agentAddress,
      address: sTokenAddress,
      abi: erc20Abi,
      functionName: 'approve',
      args: [stakingAddress, bigIntAmount],
    });

    const approveTx = await walletClient.writeContract({
      ...approveRequest,
      account: walletClient.account,
    });
    await publicClient.waitForTransactionReceipt({ hash: approveTx });

    // 3. Deposit $S and receive $stS
    const { request: depositRequest } = await publicClient.simulateContract({
      account: agentAddress,
      address: stakingAddress,
      abi: [
        {
          inputs: [],
          name: 'deposit',
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'payable',
          type: 'function',
        },
      ],
      functionName: 'deposit',
      value: bigIntAmount,
    });

    const depositTx = await walletClient.writeContract({
      ...depositRequest,
      account: walletClient.account,
    });

    // 4. Get the amount of $stS received
    const stsAmount = await publicClient.readContract({
      address: stakingAddress,
      abi: [
        {
          inputs: [{ name: 'amount', type: 'uint256' }],
          name: 'getStsAmount',
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view',
          type: 'function',
        },
      ],
      functionName: 'getStsAmount',
      args: [bigIntAmount],
    });

    elizaLogger.info('Successfully staked $S', {
      userId,
      amount,
      stsAmount: stsAmount.toString(),
      transactionHash: depositTx,
    });

    return {
      success: true,
      stsAmount: stsAmount.toString(),
      transactionHash: depositTx,
    };
  } catch (error) {
    elizaLogger.error('Error in stake-s:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export const stakeSAction: Action = {
  name: 'STAKE_S',
  description: 'Stakes $S tokens to receive $stS tokens in the vault',
  similes: ['DEPOSIT_S', 'STAKE_SONIC', 'DEPOSIT_SONIC', 'STAKE_TOKENS'],
  examples: [
    [
      {
        user: '{{user1}}',
        content: {
          text: 'Stake my $S tokens',
          action: 'STAKE_S',
        },
      },
      {
        user: '{{agentName}}',
        content: {
          text: 'Successfully staked your $S tokens',
          action: 'STAKE_S',
        },
      },
    ],
  ],
  validate: async (runtime: IAgentRuntime, _message: Memory) => {
    const rpcUrl = runtime.getSetting('SONIC_RPC_URL');
    if (!rpcUrl) {
      return false;
    }
    const privateKey = runtime.getSetting('EVM_PRIVATE_KEY') as `0x${string}`;
    if (!privateKey) {
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
    try {
      elizaLogger.log('Stake S handler called');
      const provider = await initSonicProvider(runtime);

      // Get current state or compose new state
      const currentState = state
        ? await runtime.updateRecentMessageState(state)
        : await runtime.composeState(message);

      // Initialize metadata if it doesn't exist
      if (!currentState.metadata) {
        currentState.metadata = {} as StateMetadata;
      }

      // Get Sonic context with wallet info
      const sonicContext = await sonicProvider.get(
        runtime,
        message,
        currentState,
      );
      if (!sonicContext) {
        throw new Error('Failed to get Sonic context');
      }

      // Update state with Sonic context
      currentState.metadata = {
        ...(currentState.metadata as StateMetadata),
        ...(sonicContext as StateMetadata),
      };

      // Step 1: Find staking amount
      const findAmountContext = composeContext({
        state: currentState,
        template: findStakingAmountTemplate,
        templatingEngine: 'handlebars',
      });

      const amountContent = await generateObject({
        runtime,
        context: findAmountContext,
        modelClass: ModelClass.LARGE,
        schema: z
          .object({
            amount: z.number(),
            userVaultAddress: ethereumAddressSchema,
          })
          .or(z.object({ error: z.string() })),
      });

      type StakingResponse = {
        amount?: number;
        userVaultAddress?: string;
        error?: string;
      };

      const amountResponse = amountContent.object as StakingResponse;

      if (amountResponse.error) {
        if (callback) {
          callback({
            text: amountResponse.error,
          });
        }
        return false;
      }

      if (!amountResponse.amount || !amountResponse.userVaultAddress) {
        if (callback) {
          callback({
            text: 'Could not determine the amount to stake or vault address',
          });
        }
        return false;
      }

      // Update state with amount and vault address for validation
      currentState.metadata = {
        ...(currentState.metadata as StateMetadata),
        amount: amountResponse.amount,
        userVaultAddress: amountResponse.userVaultAddress,
      };

      // Step 2: Validate staking amount
      const validateContext = composeContext({
        state: currentState,
        template: validateStakingAmountTemplate,
        templatingEngine: 'handlebars',
      });

      const validateContent = await generateObject({
        runtime,
        context: validateContext,
        modelClass: ModelClass.LARGE,
        schema: z.object({
          amount: z.number(),
          userVaultAddress: ethereumAddressSchema,
          error: z.string().nullable(),
        }),
      });

      const validateResponse = validateContent.object as {
        amount: number;
        userVaultAddress: string;
        error: string | null;
      };

      if (validateResponse.error) {
        if (callback) {
          callback({
            text: validateResponse.error,
          });
        }
        return false;
      }

      // Proceed with staking
      const stakeSContent: StakeSContent = {
        userId: message.userId,
        userVaultAddress: validateResponse.userVaultAddress,
        agentAddress: provider.account.address,
        amount: validateResponse.amount.toString(),
        publicClient: provider.getPublicClient(),
        walletClient: provider.getWalletClient(),
      };

      const stakeResponse = await stakeS({
        ...stakeSContent,
        runtime,
      });

      if (stakeResponse.success) {
        if (callback) {
          callback({
            text: `Successfully staked ${validateResponse.amount} $S tokens from vault ${validateResponse.userVaultAddress} and received ${stakeResponse.stsAmount} $stS tokens`,
            content: {
              success: true,
              stsAmount: stakeResponse.stsAmount,
              transactionHash: stakeResponse.transactionHash,
              action: 'STAKE_S',
              vaultAddress: validateResponse.userVaultAddress,
            },
          });
        }
        return true;
      }
      throw new Error(stakeResponse.error || 'Failed to stake $S tokens');
    } catch (error) {
      elizaLogger.error(
        'Error in stake S handler:',
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
