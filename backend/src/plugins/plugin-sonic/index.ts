import type { Plugin } from '@elizaos/core';
import { createVaultAction, depositAction, stakeSAction } from './actions';
import { sonicProvider } from './providers/sonic';

export const sonicPlugin: Plugin = {
  name: 'sonic',
  description: 'Sonic plugin',
  actions: [depositAction, createVaultAction, stakeSAction],
  evaluators: [],
  providers: [sonicProvider],
};
