import { elizaLogger } from '@elizaos/core';
import { erc20Abi } from 'viem';
import { SILO_ABI } from '../constants/silo-abi';
import type { BaseParams, DepositParams } from '../types/silo-service';

export async function withdraw(params: BaseParams) {
  const { walletClient, publicClient, siloAddress, vaultAddress } = params;
  const agentAddress = walletClient.account?.address;
  if (!agentAddress) {
    return {
      success: false,
      error: 'Agent address is not set',
    };
  }

  // Get shares balance - we assume the agent already has the shares (transferred from vault)
  const shares = await publicClient.readContract({
    address: siloAddress,
    abi: SILO_ABI,
    functionName: 'balanceOf',
    args: [agentAddress],
  });

  if (shares === 0n) {
    return {
      success: false,
      error: 'No shares available to redeem',
    };
  }

  const { request } = await publicClient.simulateContract({
    account: walletClient.account,
    address: siloAddress,
    abi: SILO_ABI,
    functionName: 'redeem',
    args: [shares, vaultAddress, agentAddress],
  });

  const hash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash });

  return {
    success: true,
    transactionHash: hash,
  };
}

export async function deposit(params: DepositParams) {
  const {
    publicClient,
    walletClient,
    siloAddress,
    vaultAddress,
    amount,
    tokenAddress,
  } = params;

  if (!walletClient.account) {
    return {
      success: false,
      error: 'Agent account is not set',
    };
  }
  const agentAddress = walletClient.account.address;

  // Check token balance before deposit
  const balance = await publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [agentAddress],
  });

  if (balance < amount) {
    return {
      success: false,
      error: `Insufficient token balance. Required: ${amount}, Available: ${balance}`,
    };
  }

  // Approve silo to spend the tokens
  const { request: approveRequest } = await publicClient.simulateContract({
    account: agentAddress,
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'approve',
    args: [siloAddress, amount],
  });

  const approveHash = await walletClient.writeContract({
    ...approveRequest,
    account: walletClient.account,
  });
  await publicClient.waitForTransactionReceipt({ hash: approveHash });

  // Deposit into silo - using borrowable deposit function
  const { request } = await publicClient.simulateContract({
    account: walletClient.account,
    address: siloAddress,
    abi: SILO_ABI,
    functionName: 'deposit',
    args: [amount, vaultAddress, 1], // 1 = BORROWABLE collateral type
  });

  const hash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash });

  elizaLogger.info('Silo deposit receipt', {
    receipt: hash,
    amount: amount.toString(),
    vaultAddress,
    collateralType: 'BORROWABLE',
  });

  return {
    success: true,
    transactionHash: hash,
  };
}

export async function getPositionInfo(params: BaseParams) {
  const { publicClient, siloAddress, vaultAddress } = params;

  elizaLogger.info('Checking position info', {
    siloAddress,
    vaultAddress,
  });

  try {
    elizaLogger.debug('Attempting to read balanceOf', {
      contract: siloAddress,
      owner: vaultAddress,
    });

    const shares = await publicClient.readContract({
      address: siloAddress,
      abi: SILO_ABI,
      functionName: 'balanceOf',
      args: [vaultAddress],
    });

    elizaLogger.info('Balance check result', {
      siloAddress,
      vaultAddress,
      shares: shares.toString(),
    });

    if (shares === 0n) {
      elizaLogger.info('No shares found in vault', {
        siloAddress,
        vaultAddress,
      });
      return {
        shares: 0n,
        amount: 0n,
      };
    }

    try {
      elizaLogger.debug('Attempting previewRedeem', {
        contract: siloAddress,
        shares: shares.toString(),
      });

      const amount = await publicClient.readContract({
        address: siloAddress,
        abi: SILO_ABI,
        functionName: 'previewRedeem',
        args: [shares],
      });

      elizaLogger.info('Position info retrieved successfully', {
        siloAddress,
        vaultAddress,
        shares: shares.toString(),
        amount: amount.toString(),
      });

      return {
        shares,
        amount,
      };
    } catch (previewError) {
      elizaLogger.warn('Failed to preview redeem amount', {
        error: previewError,
        siloAddress,
        shares: shares.toString(),
      });
      return {
        shares,
        amount: 0n,
      };
    }
  } catch (error) {
    elizaLogger.error('Error getting position info', {
      error: error instanceof Error ? error.message : String(error),
      errorObject: error,
      siloAddress,
      vaultAddress,
    });
    // Instead of throwing, return zero values
    return {
      shares: 0n,
      amount: 0n,
    };
  }
}
