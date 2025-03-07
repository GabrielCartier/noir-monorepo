'use client';

import { useWallet } from '@/src/components/providers/wallet-provider';
import { Button } from '@/src/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu';
import { LogOut } from 'lucide-react';

export function WalletConnectButton() {
  const { address, connect, disconnect, isConnecting } = useWallet();

  if (!address) {
    return (
      <Button variant="outline" onClick={connect} disabled={isConnecting}>
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild={true}>
        <Button variant="outline">
          {address.slice(0, 6)}...{address.slice(-4)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={disconnect}>
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
