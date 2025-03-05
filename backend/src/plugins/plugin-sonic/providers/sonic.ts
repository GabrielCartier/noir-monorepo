import { join } from 'node:path';
import type {
  IAgentRuntime,
  ICacheManager,
  Memory,
  Provider,
  State,
} from '@elizaos/core';
import NodeCache from 'node-cache';
import {
  http,
  type Address,
  type Chain,
  type PrivateKeyAccount,
  type PublicClient,
  type WalletClient,
  createPublicClient,
  createWalletClient,
  erc20Abi,
  formatUnits,
  getContract,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sonic } from 'viem/chains';
import { SILO_ABI } from '../constants/silo-abi';
import type { PositionInfo } from '../types/position-info';
import type { SonicPortfolio } from '../types/sonic-portfolio';

// TODO Should probably use WalletProvider from plugin-evm or make a reusable provider for the wallet stuff
// as were going to reuse it for all the other plugins that will do wallet related stuff
export class SonicProvider {
  private readonly cache: NodeCache;
  private readonly cacheKey = 'sonic/portfolio';
  private readonly cacheManager: ICacheManager;
  account: PrivateKeyAccount;
  readonly chain: Chain = sonic;

  constructor(
    accountOrPrivateKey: PrivateKeyAccount | `0x${string}`,
    cacheManager: ICacheManager,
    chain: Chain,
  ) {
    this.account = this.createAccount(accountOrPrivateKey);
    this.cacheManager = cacheManager;
    this.cache = new NodeCache({ stdTTL: 300 }); // Cache TTL set to 5 minutes
    this.chain = chain;
  }

  /***
   * Cache functions
   */
  private async readFromCache<T>(key: string): Promise<T | null> {
    const cached = await this.cacheManager.get<T>(join(this.cacheKey, key));
    return cached ?? null;
  }

  private async writeToCache<T>(key: string, data: T): Promise<void> {
    await this.cacheManager.set(join(this.cacheKey, key), data, {
      expires: Date.now() + 5 * 60 * 1000,
    });
  }

  private async getCachedData<T>(key: string): Promise<T | null> {
    // Check in-memory cache first
    const cachedData = this.cache.get<T>(key);
    if (cachedData) {
      return cachedData;
    }

    // Check file-based cache
    const fileCachedData = await this.readFromCache<T>(key);
    if (fileCachedData) {
      // Populate in-memory cache
      this.cache.set(key, fileCachedData);
      return fileCachedData;
    }

    return null;
  }

  private async setCachedData<T>(cacheKey: string, data: T): Promise<void> {
    // Set in-memory cache
    this.cache.set(cacheKey, data);

    // Write to file-based cache
    await this.writeToCache(cacheKey, data);
  }

  /***
   * Wallet functions
   */
  private createAccount = (
    accountOrPrivateKey: PrivateKeyAccount | `0x${string}`,
  ) => {
    return typeof accountOrPrivateKey === 'string'
      ? privateKeyToAccount(accountOrPrivateKey)
      : accountOrPrivateKey;
  };

  getPublicClient(): PublicClient {
    return createPublicClient({
      chain: this.chain,
      transport: this.createHttpTransport(),
    });
  }

  getWalletClient(): WalletClient {
    return createWalletClient({
      chain: this.chain,
      transport: this.createHttpTransport(),
      account: this.account,
    });
  }

  private createHttpTransport = () => {
    return http(this.chain.rpcUrls.custom.http[0]);
  };

  private async getTokenInfo(
    tokenAddress: Address,
  ): Promise<{ symbol: string; decimals: number }> {
    const tokenContract = getContract({
      address: tokenAddress,
      abi: erc20Abi,
      client: this.getPublicClient(),
    });
    const [symbol, decimals] = await Promise.all([
      tokenContract.read.symbol(),
      tokenContract.read.decimals(),
    ]);
    return { symbol, decimals };
  }

  /***
   * Silo functions
   */
  async fetchPortfolioValue(): Promise<SonicPortfolio> {
    try {
      const cacheKey = `portfolio-${this.account.address}`;
      const cachedValue = await this.getCachedData<SonicPortfolio>(cacheKey);

      if (cachedValue) {
        console.log('Cache hit for fetchPortfolioValue', cachedValue);
        return cachedValue;
      }
      console.log('Cache miss for fetchPortfolioValue');

      // Get all Sonic positions for the user
      const positions: PositionInfo[] = [];
      const siloAddresses = await this.getSiloAddresses();

      for (const siloAddress of siloAddresses) {
        const siloContract = getContract({
          address: siloAddress,
          abi: SILO_ABI,
          client: this.getPublicClient(),
        });
        const shares = await siloContract.read.balanceOf([
          this.account.address,
        ]);

        if (shares > 0n) {
          const depositAmount = await siloContract.read.previewRedeem([shares]);
          const { symbol, decimals } = await this.getTokenInfo(siloAddress);
          const siloConfigAddress = await siloContract.read.siloConfig();

          positions.push({
            siloConfigAddress,
            siloAddress,
            // FIXME Probably need to convert with decimals
            depositAmount,
            tokenSymbol: symbol,
            tokenDecimals: decimals,
          });
        }
      }

      // Calculate total value in USD
      const totalValueUsd = await this.calculateTotalValueUsd(positions);

      const portfolio = {
        positions,
        totalValueUsd,
      };

      this.setCachedData(cacheKey, portfolio);
      console.log('Fetched portfolio:', portfolio);
      return portfolio;
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      throw error;
    }
  }

  private async getSiloAddresses(): Promise<Address[]> {
    // This is a placeholder - you'll need to implement the actual logic to get all Sonic silo addresses
    // This could be from a configuration file, API, or contract registry
    return [];
  }

  private async calculateTotalValueUsd(
    positions: PositionInfo[],
  ): Promise<number> {
    // This is a placeholder - you'll need to implement the actual logic to calculate total value in USD
    // This could involve fetching token prices from an oracle or DEX
    return 0;
  }

  formatPortfolio(runtime: IAgentRuntime, portfolio: SonicPortfolio): string {
    let output = `${runtime.character.name}\n`;
    output += `Wallet Address: ${this.account.address}\n\n`;
    output += 'Sonic Positions:\n';

    for (const position of portfolio.positions) {
      const amount = formatUnits(
        position.depositAmount,
        position.tokenDecimals,
      );
      output += `- ${amount} ${position.tokenSymbol} in Silo ${position.siloAddress.slice(0, 6)}...${position.siloAddress.slice(-4)}\n`;
    }

    // TODO Fix the formatting
    output += `\nTotal Value: $${portfolio.totalValueUsd}`;

    return output;
  }

  async getFormattedPortfolio(runtime: IAgentRuntime): Promise<string> {
    try {
      const portfolio = await this.fetchPortfolioValue();
      return this.formatPortfolio(runtime, portfolio);
    } catch (error) {
      console.error('Error generating portfolio report:', error);
      return 'Unable to fetch Sonic positions. Please try again later.';
    }
  }
}

export const initSonicProvider = (runtime: IAgentRuntime) => {
  const baseChain = sonic;
  const rpcUrl = runtime.getSetting('SONIC_RPC_URL');
  if (!rpcUrl) {
    throw new Error('SONIC_RPC_URL is missing');
  }
  const sonicChain = {
    ...baseChain,
    rpcUrls: { ...baseChain.rpcUrls, custom: { http: [rpcUrl] } },
  };

  const privateKey = runtime.getSetting('SONIC_PRIVATE_KEY') as `0x${string}`;
  if (!privateKey) {
    throw new Error('SONIC_PRIVATE_KEY is missing');
  }
  return new SonicProvider(privateKey, runtime.cacheManager, sonicChain);
};

const sonicProvider: Provider = {
  get: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
  ): Promise<string | null> => {
    try {
      const sonicProvider = initSonicProvider(runtime);
      return await sonicProvider.getFormattedPortfolio(runtime);
    } catch (error) {
      console.error('Error in Sonic provider:', error);
      return null;
    }
  },
};

export { sonicProvider };
