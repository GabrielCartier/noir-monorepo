import type { Account, PublicClient, WalletClient } from 'viem';
import { z } from 'zod';

// Viem validator schemas. Not thorough but just enough to get the job done
export const viemAccountSchema = z.custom<Account>((val) => {
  return typeof val === 'object' && val !== null && 'address' in val;
});

export const viemPublicClientSchema = z.custom<PublicClient>((val) => {
  return typeof val === 'object' && val !== null && 'chain' in val;
});

export const viemWalletClientSchema = z.custom<WalletClient>((val) => {
  return typeof val === 'object' && val !== null && 'account' in val;
});
