export const Vault = {
  abi: [
    {
      inputs: [
        { internalType: 'address', name: '_token', type: 'address' },
        { internalType: 'string', name: '_name', type: 'string' },
        { internalType: 'string', name: '_description', type: 'string' },
        { internalType: 'string', name: '_vaultType', type: 'string' },
      ],
      stateMutability: 'nonpayable',
      type: 'constructor',
    },
    {
      inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
      name: 'getBalance',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [],
      name: 'getVaultInfo',
      outputs: [
        {
          components: [
            { internalType: 'string', name: 'name', type: 'string' },
            { internalType: 'string', name: 'description', type: 'string' },
            { internalType: 'string', name: 'vaultType', type: 'string' },
            { internalType: 'uint256', name: 'totalDeposits', type: 'uint256' },
            {
              internalType: 'uint256',
              name: 'totalWithdrawals',
              type: 'uint256',
            },
            { internalType: 'uint256', name: 'lastActivity', type: 'uint256' },
            { internalType: 'bool', name: 'isActive', type: 'bool' },
          ],
          internalType: 'struct Vault.VaultInfo',
          name: '',
          type: 'tuple',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [{ internalType: 'address', name: '', type: 'address' }],
      name: 'isWhitelisted',
      outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
      name: 'removeUser',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
      name: 'whitelistUser',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
  ],
} as const;
