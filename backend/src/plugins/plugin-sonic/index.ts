import type { Plugin } from '@elizaos/core';
import { createVaultAction } from './actions/create-vault';
import { depositAction } from './actions/silo-deposit';
import { sonicProvider } from './providers/sonic';

export const sonicPlugin: Plugin = {
  name: 'sonic',
  description: 'Sonic plugin',
  actions: [depositAction, createVaultAction],
  evaluators: [],
  providers: [sonicProvider],
};
