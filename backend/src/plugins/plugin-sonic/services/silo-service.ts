import { SILO_ABI } from '../constants/silo-abi';
import type { BaseParams, DepositParams } from '../types/silo-service';
import { withdrawFromVault } from './vault-service';

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
  const agentAddress = walletClient.account?.address;
  if (!agentAddress) {
    return {
      success: false,
      error: 'Agent address is not set',
    };
  }
  await withdrawFromVault({
    publicClient,
    walletClient,
    vaultAddress,
    tokenAddress,
    amount,
  });

  const { request } = await publicClient.simulateContract({
    account: walletClient.account,
    address: siloAddress,
    abi: SILO_ABI,
    functionName: 'deposit',
    args: [amount, vaultAddress],
  });

  const hash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash });

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
