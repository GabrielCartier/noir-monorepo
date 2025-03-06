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
import { SILO_ABI, VAULT_ABI } from '../constants';
import { initSonicProvider } from '../providers/sonic';
import { SILO_DEPOSIT_TEMPLATE } from '../templates/silo-deposit-template';
import type { DepositParams } from '../types/silo-service';
import type { DepositContent } from '../validators/deposit';
import { depositContentSchema } from '../validators/deposit';

async function deposit(params: DepositParams) {
  const {
    walletClient,
    publicClient,
    siloAddress,
    agentAddress,
    vaultAddress,
    amount,
  } = params;

  // First check if the agent has authorization over the vault
  const isOwner = await publicClient.readContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'owner',
  });

  if (!isOwner) {
    throw new Error('Agent is not whitelisted to operate this vault');
  }

  const decimals = await publicClient.readContract({
    address: siloAddress,
    abi: erc20Abi,
    functionName: 'decimals',
  });

  const bigIntAmount = parseUnits(amount.toString(), decimals);

  // Approve from the vault address
  const { request } = await publicClient.simulateContract({
    account: vaultAddress,
    address: siloAddress,
    abi: erc20Abi,
    functionName: 'approve',
    args: [agentAddress, bigIntAmount],
  });

  const hash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash });

  // Deposit from the vault address
  const { request: depositRequest } = await publicClient.simulateContract({
    account: vaultAddress,
    address: siloAddress,
    abi: SILO_ABI,
    functionName: 'deposit',
    args: [bigIntAmount, vaultAddress],
  });

  const depositHash = await walletClient.writeContract(depositRequest);
  await publicClient.waitForTransactionReceipt({ hash: depositHash });

  return {
    success: true,
    transactionHash: depositHash,
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
  validate: async (runtime: IAgentRuntime) => {
    const rpcUrl = runtime.getSetting('SONIC_RPC_URL');
    if (!rpcUrl) {
      return false;
    }
    const privateKey = runtime.getSetting('SONIC_PRIVATE_KEY') as `0x${string}`;
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
    elizaLogger.log('Silo Deposit action handler called');
    const currentState = state
      ? await runtime.updateRecentMessageState(state)
      : await runtime.composeState(message);

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
        agentAddress: sonicProvider.account.address,
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
