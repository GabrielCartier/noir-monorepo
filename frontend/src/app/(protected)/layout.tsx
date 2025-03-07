'use client';

import { useWallet } from '@/src/components/providers/wallet-provider';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { address } = useWallet();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!address && pathname !== '/') {
      router.replace('/');
    }
  }, [address, pathname, router]);

  if (!address) {
    return null;
  }

  return children;
}
