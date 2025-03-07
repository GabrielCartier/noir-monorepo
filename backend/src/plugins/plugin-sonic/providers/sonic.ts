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
  formatUnits,
  getContract,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sonic } from 'viem/chains';
import { mapSiloToSiloVaultData } from '../../../mappers/silo-mapper';
import { MOCK_WALLET_BALANCE } from '../../../mock/wallet-balance';
import { fetchSiloMarkets } from '../../../services/silo-service';
import type { SiloVaultData } from '../../../types/common/silo-vault';
import { SILO_ABI } from '../constants/silo-abi';
import { SUPPORTED_TOKENS } from '../constants/supported-tokens';
import type { MessageMetadata } from '../types/message-metadata';
import type { PositionInfo } from '../types/position-info';
import type { SonicPortfolio } from '../types/sonic-portfolio';
import type { Token } from '../types/token';
import type { TokenBalance } from '../types/token-balance';

// TODO Should probably use WalletProvider from plugin-evm or make a reusable provider for the wallet stuff
// as were going to reuse it for all the other plugins that will do wallet related stuff
export class SonicProvider {
  private readonly cache: NodeCache;
  private readonly cacheKey = 'sonic/portfolio';
  private readonly cacheManager: ICacheManager;
  account: PrivateKeyAccount;
  readonly chain: Chain = sonic;
  readonly vaultFactoryAddress: Address;

  constructor(
    accountOrPrivateKey: PrivateKeyAccount | `0x${string}`,
    cacheManager: ICacheManager,
    chain: Chain,
    vaultFactoryAddress: Address,
  ) {
    this.account = this.createAccount(accountOrPrivateKey);
    this.cacheManager = cacheManager;
    this.cache = new NodeCache({ stdTTL: 300 }); // Cache TTL set to 5 minutes
    this.chain = chain;
    this.vaultFactoryAddress = vaultFactoryAddress;
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

  // TODO This should be dynamic and (maybe) use cache
  async getWalletBalances(): Promise<TokenBalance[]> {
    return MOCK_WALLET_BALANCE;
  }
  /***
   * Token functions
   */
  // TODO This should be dynamic and use cache
  async getSupportedTokens(): Promise<Token[]> {
    return SUPPORTED_TOKENS;
  }
  /***
   * Viem functions
   */
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
    if (this.chain.rpcUrls.custom) {
      return http(this.chain.rpcUrls.custom.http[0]);
    }
    return http(this.chain.rpcUrls.default.http[0]);
  };

  /***
   * Silo functions
   */
  async getSiloVaults(): Promise<SiloVaultData[]> {
    const cacheKey = 'silo-vaults';
    const cachedValue = await this.getCachedData<SiloVaultData[]>(cacheKey);

    if (cachedValue) {
      return cachedValue;
    }
    const siloVaults = await fetchSiloMarkets();
    return mapSiloToSiloVaultData(siloVaults);
  }

  // FIXME We need to fetch the user vault here
  // It should be in the knowledge base but no idea how to extract it
  async fetchPortfolioValue(): Promise<SonicPortfolio> {
    try {
      const cacheKey = `portfolio-${this.account.address}`;
      const cachedValue = await this.getCachedData<SonicPortfolio>(cacheKey);

      if (cachedValue) {
        return cachedValue;
      }

      // Get all Sonic positions for the user
      const positions: PositionInfo[] = [];
      const siloVaults = await this.getSiloVaults();

      for (const siloVault of siloVaults) {
        const siloContract = getContract({
          address: siloVault.siloTokenAddress as `0x${string}`,
          abi: SILO_ABI,
          client: this.getPublicClient(),
        });
        const shares = await siloContract.read.balanceOf([
          this.account.address,
        ]);

        if (shares > 0n) {
          const depositAmount = await siloContract.read.previewRedeem([shares]);

          positions.push({
            siloConfigAddress: siloVault.configAddress as `0x${string}`,
            siloAddress: siloVault.siloTokenAddress as `0x${string}`,
            tokenAddress: siloVault.tokenAddress as `0x${string}`,
            depositAmount,
            tokenSymbol: siloVault.symbol,
            tokenDecimals: siloVault.decimals,
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
      return portfolio;
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      throw error;
    }
  }

  private async calculateTotalValueUsd(
    _positions: PositionInfo[],
  ): Promise<number> {
    // This is a placeholder - you'll need to implement the actual logic to calculate total value in USD
    // This could involve fetching token prices from an oracle or DEX
    return 0;
  }

  formatPortfolio(portfolio: SonicPortfolio): string {
    let output = '';

    for (const position of portfolio.positions) {
      const amount = formatUnits(
        position.depositAmount,
        position.tokenDecimals,
      );
      output += `- ${amount} ${position.tokenSymbol} in Silo ${position.siloAddress}\n`;
    }

    output += `\nTotal Value: $${portfolio.totalValueUsd}`;

    return output;
  }

  async getFormattedPortfolio(): Promise<string> {
    try {
      const portfolio = await this.fetchPortfolioValue();
      return this.formatPortfolio(portfolio);
    } catch (error) {
      console.error('Error generating portfolio report:', error);
      return 'Unable to fetch Sonic positions. Please try again later.';
    }
  }
}

const getUserAddress = (message: Memory) => {
  const metadata = message.content.metadata as MessageMetadata;
  return metadata.walletAddress;
};

const formatSonicContext = async (
  runtime: IAgentRuntime,
  userAddress: Address | undefined,
) => {
  const sonicProvider = initSonicProvider(runtime);
  const walletBalances = await sonicProvider.getWalletBalances();
  const supportedTokens = await sonicProvider.getSupportedTokens();
  const siloVaults = await sonicProvider.getSiloVaults();

  // Get user-specific knowledge filtered by wallet address
  const userKnowledge = await runtime.databaseAdapter.getKnowledge({
    agentId: runtime.agentId,
    limit: 100, // Limit to most recent 100 items
    query: `content->'metadata'->>'walletAddress' = '${userAddress}' AND content->'metadata'->>'type' = 'vault_info'`,
  });

  // Format vault-related knowledge
  const userVault = userKnowledge.find(
    (item) =>
      item.content.metadata?.vaultAddress &&
      item.content.metadata?.walletAddress === userAddress,
  )?.content.metadata?.vaultAddress;

  // Format wallet info
  const walletInfo = walletBalances
    .map((balance) => {
      const token = supportedTokens.find(
        (t) => t.address.toLowerCase() === balance.address.toLowerCase(),
      );
      return `- Token: ${token?.symbol || 'Unknown'}
  Balance: ${balance.balance}
  Address: ${balance.address}`;
    })
    .join('\n');

  // Format supported tokens
  const supportedTokensList = supportedTokens
    .map(
      (token) =>
        `- Name: ${token.name}
  Symbol: ${token.symbol}
  Address: ${token.address}
  Decimals: ${token.decimals}`,
    )
    .join('\n');

  // Format silo vaults
  const siloVaultsList = siloVaults
    .map(
      (vault) =>
        `- Name: ${vault.name}
  Symbol: ${vault.symbol}
  Token Address: ${vault.tokenAddress}
  Silo Token Address: ${vault.siloTokenAddress}
  Config Address: ${vault.configAddress}
  APY: ${vault.apy.totalAPY}%
  Rewards: ${vault.rewards
    .map((reward) => `${reward.tokenSymbol} (${reward.rewardAPY}%)`)
    .join(', ')}`,
    )
    .join('\n');

  return `
{{walletInfo}}
${walletInfo}

{{supportedTokens}}
${supportedTokensList}

{{siloVaults}}
${siloVaultsList}

{{userVaultAddress}}
${userVault}
`;
};

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

  const privateKey = runtime.getSetting('EVM_PRIVATE_KEY') as `0x$string`;
  if (!privateKey) {
    throw new Error('EVM_PRIVATE_KEY is missing');
  }
  const vaultFactoryAddress = runtime.getSetting(
    'VAULT_FACTORY_ADDRESS',
  ) as Address;
  if (!vaultFactoryAddress) {
    throw new Error('VAULT_FACTORY_ADDRESS is missing');
  }
  return new SonicProvider(
    privateKey,
    runtime.cacheManager,
    sonicChain,
    vaultFactoryAddress,
  );
};
const sonicProvider: Provider = {
  get: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
  ): Promise<string | null> => {
    try {
      const userAddress = getUserAddress(message) as `0x${string}`;
      return await formatSonicContext(runtime, userAddress);
    } catch (error) {
      console.error('Error in Sonic provider:', error);
      return null;
    }
  },
};

export { sonicProvider };
