import { join } from 'node:path';
import type {
  IAgentRuntime,
  ICacheManager,
  Memory,
  Provider,
  State,
} from '@elizaos/core';
import BigNumber from 'bignumber.js';
import { Contract, type providers } from 'ethers';
import NodeCache from 'node-cache';
import { ERC20_ABI, SILO_ABI } from '../../../services/silo/abis';
import { parseAccount } from '../utils';

interface PositionInfo {
  tokenAddress: string;
  siloAddress: string;
  depositAmount: string;
  tokenSymbol: string;
  tokenDecimals: number;
}

interface SonicPortfolio {
  positions: PositionInfo[];
  totalValueUsd: string;
}

export class SonicProvider {
  private readonly cache: NodeCache;
  private readonly cacheKey = 'sonic/portfolio';
  private readonly provider: providers.JsonRpcProvider;
  private readonly address: string;
  private readonly cacheManager: ICacheManager;

  constructor(
    provider: providers.JsonRpcProvider,
    address: string,
    cacheManager: ICacheManager,
  ) {
    this.provider = provider;
    this.address = address;
    this.cacheManager = cacheManager;
    this.cache = new NodeCache({ stdTTL: 300 }); // Cache TTL set to 5 minutes
  }

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

  private async getTokenInfo(
    tokenAddress: string,
  ): Promise<{ symbol: string; decimals: number }> {
    const tokenContract = new Contract(tokenAddress, ERC20_ABI, this.provider);
    const [symbol, decimals] = await Promise.all([
      tokenContract.symbol(),
      tokenContract.decimals(),
    ]);
    return { symbol, decimals };
  }

  async fetchPortfolioValue(): Promise<SonicPortfolio> {
    try {
      const cacheKey = `portfolio-${this.address}`;
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
        const siloContract = new Contract(siloAddress, SILO_ABI, this.provider);
        const tokenAddress = await siloContract.asset();
        const shares = await siloContract.balanceOf(this.address);

        if (shares.gt(0)) {
          const depositAmount = await siloContract.previewRedeem(shares);
          const { symbol, decimals } = await this.getTokenInfo(tokenAddress);

          positions.push({
            tokenAddress,
            siloAddress,
            depositAmount: depositAmount.toString(),
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

  private async getSiloAddresses(): Promise<string[]> {
    // This is a placeholder - you'll need to implement the actual logic to get all Sonic silo addresses
    // This could be from a configuration file, API, or contract registry
    return [];
  }

  private async calculateTotalValueUsd(
    positions: PositionInfo[],
  ): Promise<string> {
    // This is a placeholder - you'll need to implement the actual logic to calculate total value in USD
    // This could involve fetching token prices from an oracle or DEX
    return '0';
  }

  formatPortfolio(runtime: IAgentRuntime, portfolio: SonicPortfolio): string {
    let output = `${runtime.character.name}\n`;
    output += `Wallet Address: ${this.address}\n\n`;
    output += 'Sonic Positions:\n';

    for (const position of portfolio.positions) {
      const amount = new BigNumber(position.depositAmount)
        .div(10 ** position.tokenDecimals)
        .toFixed(4);
      output += `- ${amount} ${position.tokenSymbol} in Silo ${position.siloAddress.slice(0, 6)}...${position.siloAddress.slice(-4)}\n`;
    }

    const totalValueUsd = new BigNumber(portfolio.totalValueUsd).toFixed(2);
    output += `\nTotal Value: $${totalValueUsd}`;

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

const sonicProvider: Provider = {
  get: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
  ): Promise<string | null> => {
    const account = parseAccount(runtime);

    try {
      const provider = runtime
        .providers[0] as unknown as providers.JsonRpcProvider;
      const sonicProvider = new SonicProvider(
        provider,
        account.address,
        runtime.cacheManager,
      );
      return await sonicProvider.getFormattedPortfolio(runtime);
    } catch (error) {
      console.error('Error in Sonic provider:', error);
      return null;
    }
  },
};

export { sonicProvider };
