'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import {
  http,
  type PublicClient,
  type WalletClient,
  createPublicClient,
  createWalletClient,
  custom,
} from 'viem';
import { clientEnv } from '../../lib/config/client-env';
import { sonic } from '../../lib/constants/chains';

interface WalletContextType {
  publicClient: PublicClient;
  walletClient: WalletClient | null;
  address: string | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  onDisconnect: (callback: () => void) => void;
  ensureCorrectChain: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [disconnectCallbacks, setDisconnectCallbacks] = useState<
    (() => void)[]
  >([]);
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);

  const publicClient = createPublicClient({
    chain: sonic,
    transport: http(clientEnv.NEXT_PUBLIC_SONIC_RPC_URL),
  });

  const ensureCorrectChain = async () => {
    if (!window.ethereum) {
      throw new Error('No Ethereum wallet found');
    }

    try {
      // Get current chain ID
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const targetChainId = `0x${sonic.id.toString(16)}`;

      // If we're not on the correct chain, switch to it
      if (chainId !== targetChainId) {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: targetChainId }],
        });
      }
    } catch (error) {
      console.error('Error switching chain:', error);
      throw error;
    }
  };

  const connect = async () => {
    if (!window.ethereum) {
      throw new Error('No Ethereum wallet found');
    }

    setIsConnecting(true);
    try {
      // Ensure we're on the correct chain
      await ensureCorrectChain();

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      // Create wallet client
      const client = createWalletClient({
        chain: sonic,
        transport: custom(window.ethereum),
        account: accounts[0] as `0x${string}`,
      });

      setWalletClient(client);
      setAddress(accounts[0]);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setWalletClient(null);
    // Call all registered disconnect callbacks
    for (const callback of disconnectCallbacks) {
      callback();
    }
  };

  const registerDisconnectCallback = useCallback((callback: () => void) => {
    setDisconnectCallbacks((prev) => [...prev, callback]);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        publicClient,
        walletClient,
        address,
        isConnecting,
        connect,
        disconnect,
        onDisconnect: registerDisconnectCallback,
        ensureCorrectChain,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
