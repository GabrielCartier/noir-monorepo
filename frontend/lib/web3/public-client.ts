import { http, createPublicClient, fallback, webSocket } from 'viem';
import { unichainSepolia } from 'viem/chains';

export const publicClient = createPublicClient({
  chain: unichainSepolia,
  transport: fallback([
    webSocket(process.env.NEXT_PUBLIC_UNICHAIN_SEPOLIA_WEBSOCKET_URL),
    http(process.env.NEXT_PUBLIC_UNICHAIN_SEPOLIA_URL),
  ]),
});
