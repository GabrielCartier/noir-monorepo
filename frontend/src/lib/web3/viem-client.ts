import {
  http,
  type PublicClient,
  type WalletClient,
  createPublicClient,
  createWalletClient,
} from 'viem';
import { sonic } from '../../lib/constants/chains';
import { clientEnv } from '../config/client-env';

export const publicClient: PublicClient = createPublicClient({
  chain: sonic,
  transport: http(clientEnv.NEXT_PUBLIC_SONIC_RPC_URL),
});

export function createCustomWalletClient(): WalletClient {
  return createWalletClient({
    chain: sonic,
    transport: http(),
  });
}
