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
import { type Log, erc20Abi, parseUnits } from 'viem';
import { z } from 'zod';
import { getVault } from '../../../../services/vault-service';
import { ethereumAddressSchema } from '../../../../validators/ethereum';
import {
  viemPublicClientSchema,
  viemWalletClientSchema,
} from '../../../../validators/viem';
import { VAULT_ABI } from '../../constants';
import { initSonicProvider, sonicProvider } from '../../providers/sonic';
import { deposit as depositSilo } from '../../services/silo-service';
import { findValidVaultsTemplate } from '../../templates/silo-templates';
import type { MessageMetadata } from '../../types/message-metadata';

interface StateMetadata {
  [key: string]: unknown;
  walletInfo?: string;
  supportedTokens?: string;
  siloVaults?: string;
  userVaultAddress?: string;
  amount?: number;
}

const depositContentSchema = z.object({
  siloAddress: ethereumAddressSchema,
  tokenAddress: ethereumAddressSchema,
  amount: z.number(),
  userVaultAddress: ethereumAddressSchema,
  userId: z.string().uuid(),
});

const extendedDepositContentSchema = depositContentSchema.extend({
  publicClient: viemPublicClientSchema,
  walletClient: viemWalletClientSchema,
});
type ExtendedDepositContent = z.infer<typeof extendedDepositContentSchema>;

async function deposit(
  params: ExtendedDepositContent,
  callback?: HandlerCallback,
) {
  const {
    walletClient,
    publicClient,
    siloAddress,
    tokenAddress,
    userVaultAddress,
    amount,
    userId,
  } = params;

  elizaLogger.info('Starting deposit operation', {
    tokenAddress,
    siloAddress,
    userId,
    amount,
    userVaultAddress,
  });

  const agentAddress = walletClient.account?.address;
  if (!agentAddress) {
    return {
      success: false,
      error: 'Agent address is not set',
    };
  }

  let withdrawnFromVault = false;
  let withdrawnAmount: bigint | null = null;

  try {
    const decimals = await publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'decimals',
    });

    const bigIntAmount = parseUnits(amount.toString(), decimals);

    elizaLogger.info('Starting balance check', {
      vaultAddress: userVaultAddress,
      tokenAddress,
      amount,
      amountInWei: bigIntAmount.toString(),
      decimals,
    });

    // Check vault's token balance before proceeding
    try {
      const vaultBalance = await publicClient.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [userVaultAddress],
      });

      elizaLogger.info('Vault balance check', {
        vaultAddress: userVaultAddress,
        tokenAddress,
        balance: vaultBalance.toString(),
        required: bigIntAmount.toString(),
      });

      if (vaultBalance < bigIntAmount) {
        throw new Error(
          `Insufficient token balance in vault. Required: ${amount}, Available: ${vaultBalance}`,
        );
      }
    } catch (balanceError) {
      elizaLogger.error('Error checking vault balance', {
        error: balanceError,
        vault: userVaultAddress,
        token: tokenAddress,
      });
      throw new Error('Failed to check vault balance');
    }

    // 1. First withdraw tokens from vault to the agent
    elizaLogger.info('Withdrawing tokens from vault', {
      vault: userVaultAddress,
      token: tokenAddress,
      amount: bigIntAmount.toString(),
      signer: agentAddress,
    });

    const { request: withdrawRequest } = await publicClient.simulateContract({
      account: agentAddress,
      address: userVaultAddress,
      abi: VAULT_ABI,
      functionName: 'withdraw',
      args: [tokenAddress, bigIntAmount],
    });

    // Ensure the transaction is signed by the agent
    if (
      walletClient.account?.address.toLowerCase() !== agentAddress.toLowerCase()
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
    elizaLogger.info('Successfully withdrew wrapped tokens', {
      withdrawHash,
    });
    withdrawnFromVault = true;
    withdrawnAmount = bigIntAmount;

    // 2. Deposit tokens into silo with retries
    elizaLogger.info('Starting deposit into silo with retries', {
      amount: bigIntAmount.toString(),
      silo: siloAddress,
    });

    const MAX_RETRIES = 3;
    let currentAttempt = 1;
    let lastError: Error | null = null;

    while (currentAttempt <= MAX_RETRIES) {
      try {
        const { transactionHash, success, error } = await depositSilo({
          publicClient,
          walletClient,
          siloAddress: siloAddress as `0x${string}`,
          vaultAddress: userVaultAddress as `0x${string}`,
          amount: bigIntAmount,
          tokenAddress: tokenAddress as `0x${string}`,
          userId,
        });

        if (!success || error) {
          throw new Error(error || 'Failed to deposit into silo');
        }

        // Parse the transaction to find the shares token transfer
        const transfers = await publicClient.getTransactionReceipt({
          hash: transactionHash,
        });

        elizaLogger.info('Analyzing transaction transfers', {
          transactionHash,
          transfers,
        });

        // Look for the transfer from zero address (minting of shares)
        const mintTransfer = transfers.logs.find((log: Log) => {
          if (!log.topics || log.topics.length < 3) {
            return false;
          }

          const isTransferEvent =
            log.topics[0] ===
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
          const fromZeroAddress =
            log.topics[1] ===
            '0x0000000000000000000000000000000000000000000000000000000000000000';
          const toAddress =
            `0x${(log.topics[2] || '').slice(26)}`.toLowerCase();

          elizaLogger.debug('Analyzing transfer', {
            from: log.topics[1],
            to: toAddress,
            isTransferEvent,
            fromZeroAddress,
            data: log.data,
            contractAddress: log.address,
          });

          return isTransferEvent && fromZeroAddress;
        });

        if (!mintTransfer) {
          if (currentAttempt < MAX_RETRIES) {
            if (callback) {
              callback({
                text: `Share token mint transfer not found on attempt ${currentAttempt}, retrying...`,
                content: {
                  success: false,
                  attempt: currentAttempt,
                  error: 'Share token mint transfer not found',
                },
              });
            }
            currentAttempt++;
          } else {
            throw new Error(
              'Could not find shares token mint transfer in transaction after all retries',
            );
          }
        }

        const sharesAmount = BigInt(mintTransfer.data);
        const sharesTokenAddress = mintTransfer.address;

        elizaLogger.info('Successfully completed deposit operation', {
          userId,
          amount,
          sharesAmount: sharesAmount.toString(),
          sharesTokenAddress,
          transactionHash,
          withdrawHash,
        });

        return {
          success: true,
          transactionHash,
          sharesAmount: sharesAmount.toString(),
          sharesTokenAddress,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (currentAttempt < MAX_RETRIES) {
          if (callback) {
            callback({
              text: `Deposit attempt ${currentAttempt} failed, retrying...`,
              content: {
                success: false,
                attempt: currentAttempt,
                error: lastError.message,
              },
            });
          }
          currentAttempt++;
        }
      }
    }

    // If we get here, all deposit attempts failed
    elizaLogger.error('All deposit attempts failed', {
      error: lastError?.message,
      attempts: MAX_RETRIES,
    });

    // Return tokens to vault since all deposit attempts failed
    if (withdrawnFromVault && withdrawnAmount) {
      elizaLogger.info(
        'Attempting to return tokens to vault after failed deposit',
        {
          amount: withdrawnAmount.toString(),
          vault: userVaultAddress,
          token: tokenAddress,
        },
      );

      try {
        const { request: depositRequest } = await publicClient.simulateContract(
          {
            account: agentAddress,
            address: tokenAddress,
            abi: erc20Abi,
            functionName: 'transfer',
            args: [userVaultAddress, withdrawnAmount],
          },
        );

        const returnHash = await walletClient.writeContract({
          ...depositRequest,
          account: walletClient.account,
        });

        const returnReceipt = await publicClient.waitForTransactionReceipt({
          hash: returnHash,
        });

        if (returnReceipt.status === 'success') {
          elizaLogger.info('Successfully returned tokens to vault', {
            transactionHash: returnHash,
          });
          if (callback) {
            callback({
              text: 'Deposit failed but tokens were successfully returned to vault',
              content: {
                success: false,
                returnTransactionHash: returnHash,
                error: lastError?.message,
              },
            });
          }
        } else {
          elizaLogger.error('Failed to return tokens to vault', {
            error: 'Return transaction failed',
            receipt: returnReceipt,
          });
          if (callback) {
            callback({
              text: 'Critical: Failed to return tokens to vault after deposit failure',
              content: {
                success: false,
                error: 'Failed to return tokens to vault',
                originalError: lastError?.message,
              },
            });
          }
        }
      } catch (returnError) {
        elizaLogger.error('Error returning tokens to vault', {
          error: returnError,
          amount: withdrawnAmount.toString(),
          vault: userVaultAddress,
        });
        if (callback) {
          callback({
            text: 'Critical: Error returning tokens to vault after deposit failure',
            content: {
              success: false,
              error: 'Failed to return tokens to vault',
              returnError:
                returnError instanceof Error
                  ? returnError.message
                  : String(returnError),
              originalError: lastError?.message,
            },
          });
        }
      }
    }

    throw lastError || new Error('Deposit failed after all retry attempts');
  } catch (error) {
    // Log the full error context
    elizaLogger.error('Error in deposit operation', {
      error: error instanceof Error ? error.message : String(error),
      errorObject: error,
      stack: error instanceof Error ? error.stack : undefined,
      params: {
        userId,
        userVaultAddress,
        amount,
        signer: agentAddress,
      },
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
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
    elizaLogger.log('Validating silo deposit...');
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
    state?: State,
    _options?: {
      [key: string]: unknown;
    },
    callback?: HandlerCallback,
  ) => {
    try {
      elizaLogger.log('Silo Deposit action handler called');
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

      // Add the sonic context to the state itself for template access
      currentState.siloVaults = sonicContext;

      // Step 1: Find valid vaults
      const findVaultsContext = composeContext({
        state: currentState,
        template: findValidVaultsTemplate,
        templatingEngine: 'handlebars',
      });

      const content = await generateObject({
        runtime,
        context: findVaultsContext,
        modelClass: ModelClass.LARGE,
        schema: z
          .object({
            vaults: z.array(
              z.object({
                siloAddress: ethereumAddressSchema,
                configAddress: ethereumAddressSchema,
                apy: z.number(),
                tokenAddress: ethereumAddressSchema,
              }),
            ),
            amount: z.number(),
          })
          .or(z.object({ error: z.string() })),
      });

      type VaultResponse = {
        vaults?: Array<{
          siloAddress: `0x${string}`;
          configAddress: `0x${string}`;
          apy: number;
          tokenAddress: `0x${string}`;
        }>;
        amount?: number;
        error?: string;
      };

      const response = content.object as VaultResponse;

      if (response.error) {
        if (callback) {
          callback({
            text: response.error,
          });
        }
        return false;
      }

      if (!response.vaults || response.vaults.length === 0) {
        if (callback) {
          callback({
            text: 'No vaults found for the specified token',
          });
        }
        return false;
      }

      if (!response.amount) {
        if (callback) {
          callback({
            text: 'Could not determine the amount to deposit',
          });
        }
        return false;
      }

      const depositContent = {
        siloAddress: response.vaults[0].siloAddress,
        tokenAddress: response.vaults[0].tokenAddress,
        amount: response.amount,
        userVaultAddress: vaultAddress,
        userId: message.userId,
      };

      const depositResponse = await deposit(
        {
          ...depositContent,
          publicClient: provider.getPublicClient(),
          walletClient: provider.getWalletClient(),
        },
        callback,
      );

      if (callback) {
        callback({
          text: `Successfully deposited ${depositContent.amount} tokens to ${depositContent.siloAddress}\nTransaction Hash: ${depositResponse.transactionHash}`,
          content: {
            success: true,
            hash: depositResponse.transactionHash,
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
