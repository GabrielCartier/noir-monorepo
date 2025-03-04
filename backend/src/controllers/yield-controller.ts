import { elizaLogger } from '@elizaos/core';
import { Elysia } from 'elysia';
import { fetchAllYields, filterAndSortYields } from '../services/yield-service';
import { YieldRequestSchema } from '../types/request/yield-request';
import type { YieldsResponse } from '../types/response/yield-response';

// Cache yields data to avoid frequent API calls
let cachedYields: YieldsResponse | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Creates the yields API routes
 */
export function createYieldRoutes() {
  return new Elysia({ prefix: '/api' }).get('/yields', async ({ query }) => {
    try {
      elizaLogger.info('[YieldController] Handling /api/yields request');

      // Parse and validate query parameters
      const validatedQuery = YieldRequestSchema.parse(query);

      // Check if we need to fetch fresh data
      const currentTime = Date.now();
      if (!cachedYields || currentTime - lastFetchTime > CACHE_TTL) {
        elizaLogger.info(
          '[YieldController] Cache expired, fetching fresh yield data',
        );

        const yields = await fetchAllYields();
        cachedYields = {
          yields,
          timestamp: currentTime,
          sources: ['silo', 'euler'],
        };
        lastFetchTime = currentTime;
      }

      // Apply filters and sorting
      const filteredYields = filterAndSortYields(
        cachedYields.yields,
        validatedQuery,
      );

      // Return the response
      return {
        yields: filteredYields,
        timestamp: cachedYields.timestamp,
        sources: cachedYields.sources,
      };
    } catch (error) {
      elizaLogger.error(
        '[YieldController] Error handling /api/yields request:',
        error,
      );

      if (error.name === 'ZodError') {
        return Response.json(
          { error: 'Invalid request parameters', details: error.errors },
          { status: 400 },
        );
      }

      return Response.json(
        { error: 'Failed to fetch yield data' },
        { status: 500 },
      );
    }
  });
}
