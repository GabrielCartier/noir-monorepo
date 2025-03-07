import {
  http,
  type PublicClient,
  type WalletClient,
  createPublicClient,
  createWalletClient,
  custom,
} from 'viem';
import { sonic } from '../../lib/constants/chains';
import { clientEnv } from '../config/client-env';

export const publicClient: PublicClient = createPublicClient({
  chain: sonic,
  transport: http(clientEnv.NEXT_PUBLIC_SONIC_RPC_URL),
});

export async function createCustomWalletClient(): Promise<WalletClient> {
  if (!window.ethereum) {
    throw new Error('No Ethereum wallet found');
  }

  // Request account access
  const accounts = await window.ethereum.request({
    method: 'eth_requestAccounts',
  });
  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts found');
  }

  return createWalletClient({
    chain: sonic,
    transport: custom(window.ethereum),
    account: accounts[0] as `0x${string}`,
  });
}
