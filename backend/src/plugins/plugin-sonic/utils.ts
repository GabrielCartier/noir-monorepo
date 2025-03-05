import type { IAgentRuntime } from '@elizaos/core';
import { Wallet } from 'ethers';

const parseAccount = (runtime: IAgentRuntime): Wallet => {
  const privateKey = runtime.getSetting('ETH_PRIVATE_KEY');
  if (!privateKey) {
    throw new Error('ETH_PRIVATE_KEY is not set');
  }

  return new Wallet(privateKey);
};

export { parseAccount };
