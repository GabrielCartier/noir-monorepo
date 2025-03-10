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
import { type Log, erc20Abi, formatUnits, parseUnits } from 'viem';
import { z } from 'zod';
import { BEETS_STAKING_IMPLEMENTATION_ABI } from '../../../../constants/abis/beets-staking-abi';
import { VAULT_ABI } from '../../../../constants/abis/vault-abi';
import { wrappedSonicAbi } from '../../../../constants/abis/wrapped-sonic-abi';
import {
  SUPPORTED_TOKENS_OBJECT,
  getTokenAddress,
} from '../../../../constants/supported-tokens';
import { getBeetsStakingService } from '../../../../services/beets-staking-service';
import { getVault } from '../../../../services/vault-service';
import { ethereumAddressSchema } from '../../../../validators/ethereum';
import {
  viemPublicClientSchema,
  viemWalletClientSchema,
} from '../../../../validators/viem';
import { initSonicProvider, sonicProvider } from '../../providers/sonic';
import { findStakingAmountTemplate } from '../../templates/stake-s-template';

interface MessageMetadata {
  walletAddress?: string;
  [key: string]: unknown;
}

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
    const {
      userId,
      amount,
      userVaultAddress,
      agentAddress,
      publicClient,
      walletClient,
    } = parsedParams;

    elizaLogger.info('Starting stakeS operation', {
      userId,
      amount,
      userVaultAddress,
      agentAddress,
    });

    // Get Sonic token address (which is wrapped)
    const sonicTokenAddress = getTokenAddress('SONIC');
    const stsTokenAddress = getTokenAddress('STAKED_SONIC');

    elizaLogger.info('Token addresses loaded', {
      sonicTokenAddress,
      stsTokenAddress,
    });

    const decimals = SUPPORTED_TOKENS_OBJECT.SONIC.decimals;
    const bigIntAmount = parseUnits(amount, decimals);

    elizaLogger.info('Starting balance check', {
      vaultAddress: userVaultAddress,
      tokenAddress: sonicTokenAddress,
      amount,
      amountInWei: bigIntAmount.toString(),
      decimals,
    });

    // Check vault's Sonic balance before proceeding
    try {
      const vaultBalance = await publicClient.readContract({
        address: sonicTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [userVaultAddress],
      });

      elizaLogger.info('Vault balance check', {
        vaultAddress: userVaultAddress,
        tokenAddress: sonicTokenAddress,
        balance: vaultBalance.toString(),
        required: bigIntAmount.toString(),
      });

      if (vaultBalance < bigIntAmount) {
        throw new Error(
          `Insufficient Sonic balance in vault. Required: ${formatUnits(bigIntAmount, decimals)} S, Available: ${formatUnits(vaultBalance, decimals)} S`,
        );
      }
    } catch (balanceError) {
      elizaLogger.error('Error checking vault balance', {
        error: balanceError,
        vault: userVaultAddress,
        token: sonicTokenAddress,
      });
      throw new Error('Failed to check vault balance');
    }

    try {
      // 1. First withdraw wrapped Sonic tokens from vault to the agent
      elizaLogger.info('Withdrawing wrapped Sonic tokens from vault', {
        vault: userVaultAddress,
        token: sonicTokenAddress,
        amount: bigIntAmount.toString(),
        signer: agentAddress,
      });

      const { request: withdrawRequest } = await publicClient.simulateContract({
        account: agentAddress,
        address: userVaultAddress,
        abi: VAULT_ABI,
        functionName: 'withdraw',
        args: [sonicTokenAddress, bigIntAmount],
      });

      // Ensure the transaction is signed by the agent
      if (
        walletClient.account?.address.toLowerCase() !==
        agentAddress.toLowerCase()
      ) {
        throw new Error('Wallet account does not match agent address');
      }

      const withdrawHash = await walletClient.writeContract({
        ...withdrawRequest,
        account: walletClient.account,
      });
      const withdrawReceipt = await publicClient.waitForTransactionReceipt({
        hash: withdrawHash,
      });

      // Verify the transaction was successful
      if (withdrawReceipt.status !== 'success') {
        throw new Error('Withdraw transaction failed');
      }
      elizaLogger.info('Successfully withdrew wrapped Sonic tokens', {
        withdrawHash,
      });

      // 2. Unwrap Sonic tokens using the wrapped Sonic contract
      elizaLogger.info('Unwrapping Sonic tokens', {
        token: sonicTokenAddress,
        amount: bigIntAmount.toString(),
        signer: agentAddress,
      });

      const { request: unwrapRequest } = await publicClient.simulateContract({
        account: agentAddress,
        address: sonicTokenAddress,
        abi: wrappedSonicAbi,
        functionName: 'withdrawTo',
        args: [agentAddress, bigIntAmount],
      });

      const unwrapHash = await walletClient.writeContract({
        ...unwrapRequest,
        account: walletClient.account,
      });
      const unwrapReceipt = await publicClient.waitForTransactionReceipt({
        hash: unwrapHash,
      });

      // Verify the transaction was successful
      if (unwrapReceipt.status !== 'success') {
        throw new Error('Unwrap transaction failed');
      }
      elizaLogger.info('Successfully unwrapped Sonic tokens', { unwrapHash });

      // 3. Deposit $S and receive $stS using BeetsStakingService
      elizaLogger.info('Depositing S tokens to Beets staking', {
        amount: bigIntAmount.toString(),
      });

      // Check minimum deposit amount
      const beetsStakingService = getBeetsStakingService(
        publicClient,
        walletClient,
      );

      try {
        const minDeposit = (await publicClient.readContract({
          address: beetsStakingService.getContractAddress(),
          abi: BEETS_STAKING_IMPLEMENTATION_ABI,
          functionName: 'MIN_DEPOSIT',
        })) as bigint;

        if (bigIntAmount < minDeposit) {
          throw new Error(
            `Deposit amount too small. Minimum required: ${formatUnits(minDeposit, decimals)} S`,
          );
        }

        // Check if deposits are paused
        const isDepositPaused = (await publicClient.readContract({
          address: beetsStakingService.getContractAddress(),
          abi: BEETS_STAKING_IMPLEMENTATION_ABI,
          functionName: 'depositPaused',
        })) as boolean;

        if (isDepositPaused) {
          throw new Error('Deposits are currently paused');
        }

        const stakeTx = await beetsStakingService.deposit(bigIntAmount);
        const stakeReceipt = await publicClient.waitForTransactionReceipt({
          hash: stakeTx,
        });

        if (stakeReceipt.status !== 'success') {
          throw new Error('Deposit transaction failed');
        }

        elizaLogger.info('Successfully staked S tokens', { stakeTx });

        // Get stS amount from stake receipt
        const stsToken = SUPPORTED_TOKENS_OBJECT.STAKED_SONIC;
        if (!stsToken) {
          throw new Error('Staked Sonic token not found in supported tokens');
        }
        const stsTokenAddress = stsToken.address as `0x${string}`;

        elizaLogger.info('Looking for stS transfer event', {
          stsTokenAddress,
          stakeTx,
          logsCount: stakeReceipt.logs.length,
        });

        // Find Transfer event to agent address to get stS amount
        const transferEvent = stakeReceipt.logs.find(
          (log: Log) =>
            log.address.toLowerCase() === stsTokenAddress.toLowerCase() &&
            log.topics[0] ===
              '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' && // Transfer event signature
            (log.topics[2] as `0x${string}`)
              .toLowerCase()
              .includes(agentAddress.toLowerCase().slice(2)), // To address matches agent
        );

        if (!transferEvent) {
          elizaLogger.error('Transfer event not found in logs', {
            stakeTx,
            logs: stakeReceipt.logs.map((log: Log) => ({
              address: log.address,
              topics: log.topics,
              data: log.data,
            })),
          });
          throw new Error('Could not find stS transfer event in stake receipt');
        }

        const stsAmount = BigInt(transferEvent.data);
        elizaLogger.info('Found stS amount from transfer event', {
          stsAmount: stsAmount.toString(),
        });

        // 4. Approve vault to spend $stS
        elizaLogger.info('Approving vault to spend stS', {
          vault: userVaultAddress,
          amount: stsAmount.toString(),
        });

        const { request: approveVaultRequest } =
          await publicClient.simulateContract({
            account: agentAddress,
            address: stsTokenAddress,
            abi: erc20Abi,
            functionName: 'approve',
            args: [userVaultAddress, stsAmount],
          });

        const approveVaultTx = await walletClient.writeContract({
          ...approveVaultRequest,
          account: walletClient.account,
        });
        await publicClient.waitForTransactionReceipt({ hash: approveVaultTx });
        elizaLogger.info('Successfully approved vault spending', {
          approveVaultTx,
        });

        // 5. Transfer $stS back to the vault
        elizaLogger.info('Depositing stS back to vault', {
          vault: userVaultAddress,
          amount: stsAmount.toString(),
        });

        const { request: depositVaultRequest } =
          await publicClient.simulateContract({
            account: agentAddress,
            address: userVaultAddress,
            abi: VAULT_ABI,
            functionName: 'deposit',
            args: [stsTokenAddress, stsAmount],
          });

        const depositVaultTx = await walletClient.writeContract({
          ...depositVaultRequest,
          account: walletClient.account,
        });
        await publicClient.waitForTransactionReceipt({ hash: depositVaultTx });
        elizaLogger.info('Successfully deposited stS to vault', {
          depositVaultTx,
        });

        elizaLogger.info('Successfully completed stakeS operation', {
          userId,
          amount,
          stsAmount: stsAmount.toString(),
          transactionHash: depositVaultTx,
          withdrawHash,
          unwrapHash,
          stakeTx,
        });

        return {
          success: true,
          stsAmount: stsAmount.toString(),
          transactionHash: depositVaultTx,
        };
      } catch (txError) {
        // Log detailed transaction error
        elizaLogger.error('Transaction failed in stakeS', {
          error: txError instanceof Error ? txError.message : String(txError),
          errorObject: txError,
          step: txError instanceof Error ? txError.stack : undefined,
          addresses: {
            sonicTokenAddress,
            userVaultAddress,
            signer: agentAddress,
          },
        });
        throw txError;
      }
    } catch (error) {
      // Log the full error context
      elizaLogger.error('Error in stakeS operation', {
        error: error instanceof Error ? error.message : String(error),
        errorObject: error,
        stack: error instanceof Error ? error.stack : undefined,
        params: {
          userId: params.userId,
          userVaultAddress: params.userVaultAddress,
          amount: params.amount,
          signer: params.agentAddress,
        },
      });
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  } catch (error) {
    // Log the full error context
    elizaLogger.error('Error in stakeS operation', {
      error: error instanceof Error ? error.message : String(error),
      errorObject: error,
      stack: error instanceof Error ? error.stack : undefined,
      params: {
        userId: params.userId,
        userVaultAddress: params.userVaultAddress,
        amount: params.amount,
        signer: params.agentAddress,
      },
    });
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

      // Get wallet address from message metadata
      const walletAddress = (message.content.metadata as MessageMetadata)
        ?.walletAddress;
      if (!walletAddress) {
        throw new Error('No wallet address provided');
      }

      // Get the vault address for this wallet
      const { vaultAddress } = await getVault({
        publicClient: provider.getPublicClient(),
        walletClient: provider.getWalletClient(),
        vaultFactoryAddress: provider.vaultFactoryAddress,
        userAddress: walletAddress as `0x${string}`,
      });

      if (vaultAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('No vault found for this wallet');
      }

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

      // Update state with Sonic context and vault address
      currentState.metadata = {
        ...(currentState.metadata as StateMetadata),
        ...(sonicContext as StateMetadata),
        userVaultAddress: vaultAddress,
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
          })
          .or(z.object({ error: z.string() })),
      });

      type StakingResponse = {
        amount?: number;
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

      if (!amountResponse.amount) {
        if (callback) {
          callback({
            text: 'Could not determine the amount to stake',
          });
        }
        return false;
      }

      // Update state with amount for validation
      currentState.metadata = {
        ...(currentState.metadata as StateMetadata),
        amount: amountResponse.amount,
      };

      // Proceed with staking
      const stakeSContent: StakeSContent = {
        userId: message.userId,
        userVaultAddress: vaultAddress,
        agentAddress: provider.account.address,
        amount: amountResponse.amount.toString(),
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
            text: `Successfully staked ${amountResponse.amount} $S tokens from vault ${vaultAddress} and received ${stakeResponse.stsAmount} $stS tokens`,
            content: {
              success: true,
              stsAmount: stakeResponse.stsAmount,
              transactionHash: stakeResponse.transactionHash,
              action: 'STAKE_S',
              vaultAddress: vaultAddress,
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
