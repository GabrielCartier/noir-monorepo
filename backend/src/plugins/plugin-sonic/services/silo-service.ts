import { elizaLogger } from '@elizaos/core';
import { erc20Abi } from 'viem';
import { withdrawFromVault } from '../../../services/vault-service';
import { SILO_ABI } from '../constants/silo-abi';
import type { BaseParams, DepositParams } from '../types/silo-service';
export async function withdrawAll(params: BaseParams) {
  const { walletClient, publicClient, siloAddress, vaultAddress } = params;
  const agentAddress = walletClient.account?.address;
  if (!agentAddress) {
    return {
      success: false,
      error: 'Agent address is not set',
    };
  }

  const shares = await publicClient.readContract({
    address: siloAddress,
    abi: SILO_ABI,
    functionName: 'balanceOf',
    args: [vaultAddress],
  });

  await withdrawFromVault({
    publicClient,
    walletClient,
    vaultAddress,
    tokenAddress: siloAddress,
    amount: shares,
    userAddress: agentAddress,
  });

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

  // Deposit into silo
  const { request } = await publicClient.simulateContract({
    account: walletClient.account,
    address: siloAddress,
    abi: SILO_ABI,
    functionName: 'deposit',
    args: [amount, vaultAddress, 0], // 0 = REGULAR collateral type
  });

  const hash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash });

  elizaLogger.info('Silo deposit receipt', {
    receipt: hash,
  });

  return {
    success: true,
    transactionHash: hash,
  };
}

export async function getPositionInfo(params: BaseParams) {
  const { publicClient, siloAddress, vaultAddress } = params;

  const shares = await publicClient.readContract({
    address: siloAddress,
    abi: SILO_ABI,
    functionName: 'balanceOf',
    args: [vaultAddress],
  });

  const amount = await publicClient.readContract({
    address: siloAddress,
    abi: SILO_ABI,
    functionName: 'previewRedeem',
    args: [shares],
  });

  return {
    shares,
    amount,
  };
}
