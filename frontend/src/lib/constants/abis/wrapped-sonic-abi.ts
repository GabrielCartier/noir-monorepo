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
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
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
    inputs: [{ name: 'value', type: 'uint256' }],
    name: 'withdraw',
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
  {
    type: 'error',
    name: 'ERC20InvalidSender',
    inputs: [{ name: 'sender', type: 'address' }],
  },
  {
    type: 'error',
    name: 'ERC20InvalidReceiver',
    inputs: [{ name: 'receiver', type: 'address' }],
  },
  {
    type: 'error',
    name: 'ERC20InvalidZeroDeposit',
    inputs: [],
  },
  {
    type: 'error',
    name: 'ERC20WithdrawFailed',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
  },
] as const;
