import type { Plugin } from '@elizaos/core';
import { createVaultAction, depositAction } from './actions';
import { sonicProvider } from './providers/sonic';

export const sonicPlugin: Plugin = {
  name: 'sonic',
  description: 'Sonic plugin',
  actions: [depositAction, createVaultAction],
  evaluators: [],
  providers: [sonicProvider],
};
