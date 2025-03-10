'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAccount } from 'wagmi';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { address } = useAccount();
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
