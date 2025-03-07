'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { http, type PublicClient, createPublicClient } from 'viem';
import { clientEnv } from '../../lib/config/client-env';
import { sonic } from '../../lib/constants/chains';

interface WalletContextType {
  publicClient: PublicClient;
  address: string | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const publicClient = createPublicClient({
    chain: sonic,
    transport: http(clientEnv.NEXT_PUBLIC_SONIC_RPC_URL),
  });

  const connect = async () => {
    if (!window.ethereum) {
      throw new Error('No Ethereum wallet found');
    }

    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
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
  };

  useEffect(() => {
    // Check if wallet is already connected
    if (window.ethereum) {
      window.ethereum
        .request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            setAddress(accounts[0]);
          }
        })
        .catch(console.error);
    }
  }, []);

  return (
    <WalletContext.Provider
      value={{
        publicClient,
        address,
        isConnecting,
        connect,
        disconnect,
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
