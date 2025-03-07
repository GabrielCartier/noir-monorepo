import type { Account } from 'viem';
import { z } from 'zod';

// Viem validator schemas. Not thorough but just enough to get the job done
export const viemAccountSchema = z.custom<Account>((val) => {
  return typeof val === 'object' && val !== null && 'address' in val;
});

export const viemPublicClientSchema = z.any().refine((val) => {
  return val && typeof val === 'object' && 'readContract' in val;
}, 'Invalid Viem PublicClient');

export const viemWalletClientSchema = z.any().refine((val) => {
  return (
    val &&
    typeof val === 'object' &&
    'writeContract' in val &&
    'account' in val &&
    val.account &&
    typeof val.account === 'object' &&
    'address' in val.account
  );
}, 'Invalid Viem WalletClient');
