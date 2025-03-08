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
import { findValidVaultsTemplate } from '../../templates/silo-deposit-template';
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

async function deposit(params: ExtendedDepositContent) {
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

  try {
    // First check if the agent has authorization over the vault
    // const agentRoles = await publicClient.readContract({
    //   address: userVaultAddress,
    //   abi: VAULT_ABI,
    //   functionName: 'rolesOf',
    //   args: [agentAddress],
    // });

    // if (agentRoles !== 1n) {
    //   return {
    //     success: false,
    //     error: 'Agent cannot operate this vault',
    //   };
    // }

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

    try {
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
      elizaLogger.info('Successfully withdrew wrapped tokens', {
        withdrawHash,
      });

      // 2. Deposit tokens into silo
      elizaLogger.info('Depositing tokens into silo', {
        amount: bigIntAmount.toString(),
        silo: siloAddress,
      });

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

      // Get the deposit receipt to find the shares token transfer
      const depositReceipt = await publicClient.waitForTransactionReceipt({
        hash: transactionHash,
      });

      // Get the shares token address from the silo contract
      const sharesTokenAddress = (await publicClient.readContract({
        address: siloAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'symbol',
      })) as string;

      elizaLogger.info('Looking for shares token transfer event', {
        sharesTokenAddress,
        transactionHash,
        logsCount: depositReceipt.logs.length,
      });

      // Find Transfer event to agent address to get shares amount
      const transferEvent = depositReceipt.logs.find(
        (log: Log) =>
          log.address.toLowerCase() === siloAddress.toLowerCase() &&
          log.topics[0] ===
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' && // Transfer event signature
          (log.topics[2] as `0x${string}`)
            .toLowerCase()
            .includes(agentAddress.toLowerCase().slice(2)), // To address matches agent
      );

      if (!transferEvent) {
        elizaLogger.error('Transfer event not found in logs', {
          transactionHash,
          logs: depositReceipt.logs.map((log: Log) => ({
            address: log.address,
            topics: log.topics,
            data: log.data,
          })),
        });
        throw new Error(
          'Could not find shares token transfer event in deposit receipt',
        );
      }

      const sharesAmount = BigInt(transferEvent.data);
      elizaLogger.info('Found shares amount from transfer event', {
        sharesAmount: sharesAmount.toString(),
      });

      // Approve vault to spend shares tokens
      elizaLogger.info('Approving vault to spend shares tokens', {
        vault: userVaultAddress,
        amount: sharesAmount.toString(),
      });

      const { request: approveVaultRequest } =
        await publicClient.simulateContract({
          account: agentAddress,
          address: siloAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'approve',
          args: [userVaultAddress, sharesAmount],
        });

      const approveVaultTx = await walletClient.writeContract({
        ...approveVaultRequest,
        account: walletClient.account,
      });
      await publicClient.waitForTransactionReceipt({ hash: approveVaultTx });
      elizaLogger.info('Successfully approved vault spending', {
        approveVaultTx,
      });

      // Transfer shares tokens back to the vault
      elizaLogger.info('Depositing shares tokens back to vault', {
        vault: userVaultAddress,
        amount: sharesAmount.toString(),
      });

      const { request: depositVaultRequest } =
        await publicClient.simulateContract({
          account: agentAddress,
          address: userVaultAddress,
          abi: VAULT_ABI,
          functionName: 'deposit',
          args: [siloAddress, sharesAmount],
        });

      const depositVaultTx = await walletClient.writeContract({
        ...depositVaultRequest,
        account: walletClient.account,
      });
      const depositVaultReceipt = await publicClient.waitForTransactionReceipt({
        hash: depositVaultTx,
      });

      if (depositVaultReceipt.status !== 'success') {
        throw new Error('Failed to deposit shares tokens back to vault');
      }

      elizaLogger.info('Successfully completed deposit operation', {
        userId,
        amount,
        sharesAmount: sharesAmount.toString(),
        transactionHash,
        withdrawHash,
        depositVaultTx,
      });

      return {
        success: true,
        transactionHash,
        sharesAmount: sharesAmount.toString(),
        depositVaultTx,
      };
    } catch (txError) {
      // Log detailed transaction error
      elizaLogger.error('Transaction failed in deposit', {
        error: txError instanceof Error ? txError.message : String(txError),
        errorObject: txError,
        step: txError instanceof Error ? txError.stack : undefined,
        addresses: {
          tokenAddress,
          userVaultAddress,
          signer: agentAddress,
        },
      });
      throw txError;
    }
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

      elizaLogger.info('Generating vaults content with the context', {
        context: findVaultsContext,
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

      const depositResponse = await deposit({
        ...depositContent,
        publicClient: provider.getPublicClient(),
        walletClient: provider.getWalletClient(),
      });

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
