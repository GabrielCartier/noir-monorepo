import type { PublicClient, WalletClient } from 'viem';
import { env } from '../config/env';
import { BEETS_STAKING_ABI } from '../constants/abis/beets-staking-abi';

export class BeetsStakingService {
  private readonly publicClient: PublicClient;
  private readonly walletClient: WalletClient;

  constructor(publicClient: PublicClient, walletClient: WalletClient) {
    this.publicClient = publicClient;
    this.walletClient = walletClient;
  }

  getContractAddress(): string {
    return env.SONIC_STAKING_ADDRESS;
  }

  async deposit(amount: bigint): Promise<`0x${string}`> {
    const { request } = await this.publicClient.simulateContract({
      account: this.walletClient.account,
      address: env.SONIC_STAKING_ADDRESS,
      abi: BEETS_STAKING_ABI,
      functionName: 'deposit',
      value: amount,
    });

    const hash = await this.walletClient.writeContract(request);
    await this.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  async withdraw(
    withdrawId: bigint,
    emergency = false,
  ): Promise<`0x${string}`> {
    const { request } = await this.publicClient.simulateContract({
      account: this.walletClient.account,
      address: env.SONIC_STAKING_ADDRESS,
      abi: BEETS_STAKING_ABI,
      functionName: 'withdraw',
      args: [withdrawId, emergency],
    });

    const hash = await this.walletClient.writeContract(request);
    await this.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  async claimRewards(validatorIds: bigint[]): Promise<`0x${string}`> {
    const { request } = await this.publicClient.simulateContract({
      account: this.walletClient.account,
      address: env.SONIC_STAKING_ADDRESS,
      abi: BEETS_STAKING_ABI,
      functionName: 'claimRewards',
      args: [validatorIds],
    });

    const hash = await this.walletClient.writeContract(request);
    await this.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  async convertToAssets(sharesAmount: bigint): Promise<bigint> {
    return (await this.publicClient.readContract({
      address: env.SONIC_STAKING_ADDRESS,
      abi: BEETS_STAKING_ABI,
      functionName: 'convertToAssets',
      args: [sharesAmount],
    })) as bigint;
  }

  async convertToShares(assetAmount: bigint): Promise<bigint> {
    return (await this.publicClient.readContract({
      address: env.SONIC_STAKING_ADDRESS,
      abi: BEETS_STAKING_ABI,
      functionName: 'convertToShares',
      args: [assetAmount],
    })) as bigint;
  }

  async totalAssets(): Promise<bigint> {
    return (await this.publicClient.readContract({
      address: env.SONIC_STAKING_ADDRESS,
      abi: BEETS_STAKING_ABI,
      functionName: 'totalAssets',
    })) as bigint;
  }

  async totalDelegated(): Promise<bigint> {
    return (await this.publicClient.readContract({
      address: env.SONIC_STAKING_ADDRESS,
      abi: BEETS_STAKING_ABI,
      functionName: 'totalDelegated',
    })) as bigint;
  }
}

let beetsStakingServiceInstance: BeetsStakingService | null = null;

export const getBeetsStakingService = (
  publicClient?: PublicClient,
  walletClient?: WalletClient,
): BeetsStakingService => {
  if (!beetsStakingServiceInstance && publicClient && walletClient) {
    beetsStakingServiceInstance = new BeetsStakingService(
      publicClient,
      walletClient,
    );
  }
  if (!beetsStakingServiceInstance) {
    throw new Error('BeetsStakingService not initialized');
  }
  return beetsStakingServiceInstance;
};
