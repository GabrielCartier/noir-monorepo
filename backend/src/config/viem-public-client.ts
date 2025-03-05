import { http, createPublicClient } from 'viem';
import { sonic } from 'viem/chains';

export const viemPublicClient = createPublicClient({
  chain: sonic,
  transport: http(process.env.ETHEREUM_PROVIDER_SONIC!),
});
