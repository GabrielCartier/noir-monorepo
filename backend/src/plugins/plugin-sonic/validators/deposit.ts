import { z } from 'zod';
import { ethereumAddressSchema } from '../../../validators/ethereum';

export const depositContentSchema = z.object({
  amount: z.number().positive(),
  siloAddress: ethereumAddressSchema,
  userAddress: ethereumAddressSchema,
  tokenAddress: ethereumAddressSchema,
  siloConfigAddress: ethereumAddressSchema,
});

export type DepositContent = z.infer<typeof depositContentSchema>;
