import type { YieldData } from '../common/yield';

/**
 * Response type for the yields API endpoint
 */
export interface YieldsResponse {
  yields: YieldData[];
  timestamp: number;
  sources: string[];
}
