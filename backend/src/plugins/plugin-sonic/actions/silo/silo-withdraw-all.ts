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
import { z } from 'zod';
import { getVault } from '../../../../services/vault-service';
import { ethereumAddressSchema } from '../../../../validators/ethereum';
import {
  viemPublicClientSchema,
  viemWalletClientSchema,
} from '../../../../validators/viem';
import { VAULT_ABI } from '../../constants';
import { initSonicProvider, sonicProvider } from '../../providers/sonic';
import {
  getPositionInfo,
  withdraw as withdrawFromSilo,
} from '../../services/silo-service';
import { findVaultsWithPositionsTemplate } from '../../templates/silo-templates';
import type { MessageMetadata } from '../../types/message-metadata';

interface StateMetadata {
  [key: string]: unknown;
  walletInfo?: string;
  supportedTokens?: string;
  siloVaults?: string;
  userVaultAddress?: string;
}

const withdrawalContentSchema = z.object({
  siloAddress: ethereumAddressSchema,
  userVaultAddress: ethereumAddressSchema,
  userId: z.string().uuid(),
});

const extendedWithdrawalContentSchema = withdrawalContentSchema.extend({
  publicClient: viemPublicClientSchema,
  walletClient: viemWalletClientSchema,
});

type ExtendedWithdrawalContent = z.infer<
  typeof extendedWithdrawalContentSchema
>;

async function withdraw(params: ExtendedWithdrawalContent) {
  const { walletClient, publicClient, siloAddress, userVaultAddress, userId } =
    params;
  const agentAddress = walletClient.account?.address;

  if (!agentAddress) {
    return {
      success: false,
      error: 'Agent address is not set',
    };
  }

  try {
    // 1. Get position info to see how many shares we have
    const { shares, amount: expectedAmount } = await getPositionInfo({
      publicClient,
      walletClient,
      siloAddress: siloAddress as `0x${string}`,
      vaultAddress: userVaultAddress as `0x${string}`,
    });

    if (shares === 0n) {
      return {
        success: false,
        error: 'No shares to withdraw',
      };
    }

    elizaLogger.info('Found shares to withdraw', {
      shares: shares.toString(),
      siloAddress,
      expectedAmount: expectedAmount.toString(),
      vaultAddress: userVaultAddress,
    });

    // Add safety check for previewRedeem
    let sharesToWithdraw = shares;
    let previewAmount: bigint;

    try {
      previewAmount = await publicClient.readContract({
        address: siloAddress as `0x${string}`,
        abi: [
          {
            inputs: [{ name: '_shares', type: 'uint256' }],
            name: 'previewRedeem',
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'previewRedeem',
        args: [sharesToWithdraw],
      });

      elizaLogger.info('Preview redeem successful', {
        shares: sharesToWithdraw.toString(),
        previewAmount: previewAmount.toString(),
      });
    } catch (previewError) {
      elizaLogger.error('Preview redeem failed', {
        error: previewError,
        shares: sharesToWithdraw.toString(),
      });

      // Try with a slightly reduced share amount
      sharesToWithdraw = (shares * 95n) / 100n; // Try with 95% of shares
      try {
        previewAmount = await publicClient.readContract({
          address: siloAddress as `0x${string}`,
          abi: [
            {
              inputs: [{ name: '_shares', type: 'uint256' }],
              name: 'previewRedeem',
              outputs: [{ name: '', type: 'uint256' }],
              stateMutability: 'view',
              type: 'function',
            },
          ],
          functionName: 'previewRedeem',
          args: [sharesToWithdraw],
        });

        elizaLogger.info('Preview redeem successful with reduced shares', {
          originalShares: shares.toString(),
          reducedShares: sharesToWithdraw.toString(),
          previewAmount: previewAmount.toString(),
        });
      } catch (reducedPreviewError) {
        elizaLogger.error(
          'Failed to preview redemption amount, even with reduced shares',
          {
            error: reducedPreviewError,
            originalShares: shares.toString(),
            reducedShares: sharesToWithdraw.toString(),
          },
        );
        throw new Error(
          'Failed to preview redemption amount, even with reduced shares',
        );
      }
    }

    const MAX_RETRIES = 3;
    let currentAttempt = 1;
    let lastError: Error | null = null;

    while (currentAttempt <= MAX_RETRIES) {
      try {
        // 1. Withdraw shares from vault to agent - use siloAddress as the share token
        const { request: withdrawSharesRequest } =
          await publicClient.simulateContract({
            account: agentAddress,
            address: userVaultAddress as `0x${string}`,
            abi: VAULT_ABI,
            functionName: 'withdraw',
            args: [siloAddress, sharesToWithdraw], // Use siloAddress as the share token
          });

        elizaLogger.info('Withdrawing shares from vault', {
          siloAddress,
          shares: sharesToWithdraw.toString(),
          vault: userVaultAddress,
        });

        const withdrawSharesHash = await walletClient.writeContract({
          ...withdrawSharesRequest,
          account: walletClient.account,
        });

        const withdrawSharesReceipt =
          await publicClient.waitForTransactionReceipt({
            hash: withdrawSharesHash,
          });

        if (withdrawSharesReceipt.status !== 'success') {
          throw new Error('Failed to withdraw shares from vault');
        }

        elizaLogger.info('Successfully withdrew shares from vault', {
          withdrawSharesHash,
          siloAddress,
          shares: sharesToWithdraw.toString(),
          attempt: currentAttempt,
        });

        // 3. Withdraw from silo
        const { transactionHash, success, error } = await withdrawFromSilo({
          publicClient,
          walletClient,
          siloAddress: siloAddress as `0x${string}`,
          vaultAddress: userVaultAddress as `0x${string}`,
        });

        if (!success || error) {
          throw new Error(error || 'Failed to withdraw from silo');
        }

        elizaLogger.info('Successfully completed withdrawal operation', {
          userId,
          shares: sharesToWithdraw.toString(),
          tokenAmount: shares.toString(),
          expectedAmount: expectedAmount.toString(),
          transactionHash,
          withdrawSharesHash,
          transferTx: transactionHash,
          attempt: currentAttempt,
        });

        return {
          success: true,
          transactionHash,
          withdrawnAmount: previewAmount.toString(),
          transferTx: transactionHash,
        };
      } catch (txError) {
        lastError =
          txError instanceof Error ? txError : new Error(String(txError));
        elizaLogger.error('Transaction failed in withdrawal attempt', {
          error: lastError.message,
          attempt: currentAttempt,
          maxRetries: MAX_RETRIES,
        });

        if (currentAttempt < MAX_RETRIES) {
          currentAttempt++;
          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }
        throw lastError;
      }
    }

    throw lastError || new Error('Withdrawal failed after all retry attempts');
  } catch (txError) {
    elizaLogger.error('Transaction failed in withdrawal', {
      error: txError instanceof Error ? txError.message : String(txError),
      errorObject: txError,
      step: txError instanceof Error ? txError.stack : undefined,
      addresses: {
        siloAddress,
        userVaultAddress,
        signer: agentAddress,
      },
    });
    throw txError;
  }
}

export const withdrawAllAction: Action = {
  name: 'WITHDRAW_ALL',
  description: 'Withdraws all assets from Silo vaults',
  similes: [
    'WITHDRAW_ALL_ASSETS',
    'REMOVE_ALL_LIQUIDITY',
    'EXIT_ALL_POSITIONS',
  ],
  examples: [
    [
      {
        user: '{{user1}}',
        content: {
          text: 'Withdraw all my assets from Silo vaults',
          action: 'WITHDRAW',
        },
      },
      {
        user: '{{agentName}}',
        content: {
          text: 'Successfully withdrew all assets from Silo vaults',
          action: 'WITHDRAW',
        },
      },
    ],
  ],
  validate: async (runtime: IAgentRuntime, message: Memory) => {
    elizaLogger.log('Validating silo withdrawal...');
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
      elizaLogger.log('Silo Withdrawal action handler called');
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

      // Get Sonic context with vault info
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

      // Find vaults with positions
      const findVaultsContext = composeContext({
        state: currentState,
        template: findVaultsWithPositionsTemplate,
        templatingEngine: 'handlebars',
      });

      elizaLogger.info('Finding vaults with positions', {
        context: {
          walletInfo: (currentState.metadata as StateMetadata)?.walletInfo,
          siloVaults: currentState.siloVaults,
        },
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
              }),
            ),
          })
          .or(
            z.object({
              error: z.string(),
            }),
          ),
      });

      elizaLogger.info('Template response', {
        content: content.object,
      });

      type WithdrawVaultsResponse = {
        vaults: Array<{
          siloAddress: `0x${string}`;
        }>;
      };

      type ErrorResponse = {
        error: string;
      };

      if (
        'error' in (content.object as ErrorResponse | WithdrawVaultsResponse)
      ) {
        elizaLogger.warn('Error in template response', {
          error: (content.object as ErrorResponse).error,
        });
        if (callback) {
          callback({
            text: (content.object as ErrorResponse).error,
          });
        }
        return false;
      }

      const { vaults } = content.object as WithdrawVaultsResponse;

      if (!vaults || vaults.length === 0) {
        elizaLogger.warn('No vaults found in response');
        if (callback) {
          callback({
            text: 'No vaults with positions found',
          });
        }
        return false;
      }

      // Filter vaults by checking actual share token balances
      const vaultsWithPositions = [];
      for (const vault of vaults) {
        try {
          const { shares } = await getPositionInfo({
            publicClient: provider.getPublicClient(),
            walletClient: provider.getWalletClient(),
            siloAddress: vault.siloAddress,
            vaultAddress: vaultAddress as `0x${string}`,
          });

          if (shares > 0n) {
            vaultsWithPositions.push({
              ...vault,
              shares: shares.toString(),
            });
            elizaLogger.info('Found share position in vault', {
              siloAddress: vault.siloAddress,
              shares: shares.toString(),
            });
          } else {
            elizaLogger.debug('No share position in vault', {
              siloAddress: vault.siloAddress,
              shares: shares.toString(),
            });
          }
        } catch (error) {
          elizaLogger.warn('Error checking share position in vault', {
            siloAddress: vault.siloAddress,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          });
        }
      }

      if (vaultsWithPositions.length === 0) {
        elizaLogger.warn('No vaults with share positions found');
        if (callback) {
          callback({
            text: 'No vaults with share positions found. This could mean either there are no positions or there was an error checking the positions.',
          });
        }
        return false;
      }

      elizaLogger.info('Found vaults with share positions', {
        vaults: vaultsWithPositions.map((vault) => ({
          siloAddress: vault.siloAddress,
          shares: vault.shares,
        })),
      });

      // Withdraw from each vault with confirmed positions
      for (const vault of vaultsWithPositions) {
        const withdrawalContent = {
          siloAddress: vault.siloAddress,
          userVaultAddress: vaultAddress,
          userId: message.userId,
        };

        const withdrawalResponse = await withdraw({
          ...withdrawalContent,
          publicClient: provider.getPublicClient(),
          walletClient: provider.getWalletClient(),
        });

        if (callback) {
          callback({
            text: `Successfully withdrew from silo ${vault.siloAddress}\nTransaction Hash: ${withdrawalResponse.transactionHash}`,
            content: {
              success: true,
              hash: withdrawalResponse.transactionHash,
              siloAddress: vault.siloAddress,
              withdrawnAmount: withdrawalResponse.withdrawnAmount,
              action: 'WITHDRAW',
            },
          });
        }
      }

      return true;
    } catch (error) {
      console.error(
        'Error in silo withdrawal:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      if (callback) {
        callback({
          text:
            error instanceof Error
              ? error.message
              : 'Failed to withdraw from silo',
        });
      }
      return false;
    }
  },
};
