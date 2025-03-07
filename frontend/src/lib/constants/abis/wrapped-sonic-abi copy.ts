export const wrappedSonicAbi = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'depositFor',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'account', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' },
    ],
    name: 'Deposit',
    type: 'event',
  },
  {
    inputs: [],
    name: 'deposit',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    name: 'withdrawTo',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'account', type: 'address' },
      { indexed: false, name: 'value', type: 'uint256' },
    ],
    name: 'Withdrawal',
    type: 'event',
  },
] as const;
