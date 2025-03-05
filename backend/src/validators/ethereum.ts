import { isAddress } from 'viem';
import { z } from 'zod';

/**
 * Zod schema for validating Ethereum addresses
 */
export const ethereumAddressSchema = z
  .string()
  .refine((value) => isAddress(value), {
    message: 'Invalid address format',
  });

/**
 * Checks if a string is a valid Ethereum address
 * @param address The address to validate
 * @returns True if the address is valid, false otherwise
 */
export function isValidEthereumAddress(address: string): boolean {
  return isAddress(address);
}
