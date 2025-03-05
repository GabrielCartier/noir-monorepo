import { http, createConfig } from 'wagmi';
import { sonic } from 'wagmi/chains';

const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

export const wagmiConfig = createConfig({
  chains: [sonic],
  transports: {
    [sonic.id]: http(`https://sonic-mainnet.g.alchemy.com/v2/${alchemyApiKey}`),
  },
  ssr: true,
});
