import { defineChain } from 'viem';

export const sonic = defineChain({
  id: 1,
  name: 'Sonic',
  network: 'sonic',
  nativeCurrency: {
    decimals: 18,
    name: 'Sonic',
    symbol: 'S',
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_SONIC_RPC_URL || 'https://rpc.soniclabs.com',
      ],
    },
  },
  blockExplorers: {
    default: { name: 'Sonic Explorer', url: 'https://sonicscan.org' },
  },
  testnet: false,
});
