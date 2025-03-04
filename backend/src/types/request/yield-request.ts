import { z } from 'zod';

export const YieldRequestSchema = z.object({
  protocols: z.array(z.string()).optional(),
  minSupplyAPY: z.number().optional(),
  maxBorrowAPY: z.number().optional(),
  minTVL: z.number().optional(),
  minTotalAPY: z.number().optional(),
  sortBy: z
    .enum(['supplyAPY', 'borrowAPY', 'tvl', 'liquidity', 'totalAPY'])
    .optional(),
  sortDirection: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type YieldRequest = z.infer<typeof YieldRequestSchema>;
