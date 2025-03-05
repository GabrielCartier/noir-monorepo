import { SILO_ABI } from '../constants/silo-abi';
import type { BaseParams } from '../types/silo-service';

// TODO: Move this into actions
export async function withdrawAll(params: BaseParams) {
  const { walletClient, publicClient, siloAddress, userAddress } = params;

  const shares = await publicClient.readContract({
    address: siloAddress,
    abi: SILO_ABI,
    functionName: 'balanceOf',
    args: [userAddress],
  });

  const { request } = await publicClient.simulateContract({
    account: userAddress,
    address: siloAddress,
    abi: SILO_ABI,
    functionName: 'redeem',
    args: [shares, userAddress, userAddress],
  });

  const hash = await walletClient.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash });

  return {
    success: true,
    transactionHash: hash,
  };
}

export async function getPositionInfo(params: BaseParams) {
  const { publicClient, siloAddress, userAddress } = params;

  const shares = await publicClient.readContract({
    address: siloAddress,
    abi: SILO_ABI,
    functionName: 'balanceOf',
    args: [userAddress],
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
