import { NIL, v5 as uuidv5 } from 'uuid';

/**
 * Creates a deterministic UUID v5 from a wallet address.
 * Using NIL UUID as namespace and wallet address as name.
 * This ensures the same UUID is generated for the same wallet address every time.
 */
export function getWalletUUID(walletAddress: string): string {
  return uuidv5(walletAddress.toLowerCase(), NIL);
}
