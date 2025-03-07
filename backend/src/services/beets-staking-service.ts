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
      args: [amount],
    });

    const hash = await this.walletClient.writeContract(request);
    await this.publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  async getStsAmount(sAmount: bigint): Promise<bigint> {
    // This is a simplified version. In reality, you would need to calculate
    // the exact amount based on the current exchange rate and any fees
    return sAmount;
  }
  async getRewards(): Promise<bigint> {
    const rewards = (await this.publicClient.readContract({
      address: env.SONIC_STAKING_ADDRESS,
      abi: BEETS_STAKING_ABI,
      functionName: 'getRewards',
    })) as bigint;
    return rewards;
  }

  async claimRewards(): Promise<`0x${string}`> {
    const { request } = await this.publicClient.simulateContract({
      account: this.walletClient.account,
      address: env.SONIC_STAKING_ADDRESS,
      abi: BEETS_STAKING_ABI,
      functionName: 'claimRewards',
    });

    const hash = await this.walletClient.writeContract(request);
    await this.publicClient.waitForTransactionReceipt({ hash });
    return hash;
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
