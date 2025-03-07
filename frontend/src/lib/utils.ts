import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate a UUID v4
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Get or create a persistent UUID for a wallet address
export function getWalletUUID(walletAddress?: string): string {
  if (!walletAddress) {
    return '12dea96f-ec20-0935-a6ab-75692c994959'; // Default UUID for when no wallet is connected
  }

  const WALLET_UUID_MAP_KEY = 'wallet_uuid_map';
  let walletMap: Record<string, string>;

  // Try to get existing map from localStorage
  try {
    const stored = localStorage.getItem(WALLET_UUID_MAP_KEY);
    walletMap = stored ? JSON.parse(stored) : {};
  } catch {
    walletMap = {};
  }

  // If this wallet doesn't have a UUID yet, create one
  if (!walletMap[walletAddress]) {
    walletMap[walletAddress] = generateUUID();
    // Store updated map
    localStorage.setItem(WALLET_UUID_MAP_KEY, JSON.stringify(walletMap));
  }

  return walletMap[walletAddress];
}
