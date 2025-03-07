import { http, createConfig, fallback, webSocket } from 'wagmi';
import { sonic } from 'wagmi/chains';
import { clientEnv } from '../config/client-env';

export const wagmiConfig = createConfig({
  chains: [sonic],
  transports: {
    [sonic.id]: fallback([
      webSocket(clientEnv.NEXT_PUBLIC_API_URL),
      http(clientEnv.NEXT_PUBLIC_API_URL),
    ]),
  },
  ssr: true,
});
