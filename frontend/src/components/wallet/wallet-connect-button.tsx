'use client';

import { useWallet } from '@/src/components/providers/wallet-provider';
import { Button } from '@/src/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu';
import { cn } from '@/src/lib/utils';
import { LogOut } from 'lucide-react';

interface WalletConnectButtonProps {
  className?: string;
  variant?: 'default' | 'large';
}

export function WalletConnectButton({
  className,
  variant = 'default',
}: WalletConnectButtonProps) {
  const { address, connect, disconnect, isConnecting } = useWallet();

  const buttonContent = address ? (
    <Button
      variant="outline"
      className={cn(
        variant === 'large' && 'px-8 py-6 text-lg hover:bg-green-500/10',
        className,
      )}
    >
      {address.slice(0, 6)}...{address.slice(-4)}
    </Button>
  ) : (
    <Button
      variant="outline"
      onClick={connect}
      disabled={isConnecting}
      className={cn(
        variant === 'large' && 'px-8 py-6 text-lg hover:bg-green-500/10',
        className,
      )}
    >
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  );

  const wrappedButton = (
    <div
      className={cn(
        'p-[1px] rounded-lg bg-gradient-to-r from-green-500/50 via-green-500/70 to-green-500/50',
        'hover:from-green-400/50 hover:via-green-400/70 hover:to-green-400/50 transition-all',
      )}
    >
      <div className="bg-background/95 backdrop-blur-sm rounded-lg p-1">
        {buttonContent}
      </div>
    </div>
  );

  if (!address) {
    return wrappedButton;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild={true}>{wrappedButton}</DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={disconnect}>
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
