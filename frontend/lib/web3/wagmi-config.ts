import { http, createConfig, fallback, webSocket } from 'wagmi';
import { unichainSepolia } from 'wagmi/chains';

export const wagmiConfig = createConfig({
  chains: [unichainSepolia],
  transports: {
    [unichainSepolia.id]: fallback([
      webSocket(process.env.NEXT_PUBLIC_UNICHAIN_SEPOLIA_WEBSOCKET_URL!),
      http(process.env.NEXT_PUBLIC_UNICHAIN_SEPOLIA_URL!),
    ]),
  },
  ssr: true,
});
