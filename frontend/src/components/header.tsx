'use client';

import { Logo } from '@/src/components/base/logo';
import { Tabs, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { WalletConnectButton } from '@/src/components/wallet/wallet-connect-button';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback } from 'react';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();

  const handleTabChange = useCallback(
    (value: string) => {
      router.push(value);
    },
    [router],
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="flex items-center">
          <Logo className="ml-8 h-8 w-8" />
          <h1 className="ml-2 text-2xl font-bold">ThrustAI</h1>
        </div>

        <div className="flex-1 flex justify-center">
          <Tabs value={pathname} onValueChange={handleTabChange}>
            <TabsList className="grid w-[400px] grid-cols-3">
              <TabsTrigger value="/">Agent</TabsTrigger>
              <TabsTrigger value="/dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="/profile">Profile</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-4">
          <WalletConnectButton />
        </div>
      </div>
    </header>
  );
}
