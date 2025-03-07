'use client';

import { Header } from '@/src/components/header';
import { Toaster } from '@/src/components/ui/toaster';
import { Inter } from 'next/font/google';
import './globals.css';
import { WalletProvider } from '@/src/components/providers/wallet-provider';
import { ThemeProvider } from 'next-themes';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          storageKey="options-theme"
        >
          <WalletProvider>
            <div className="min-h-screen bg-background">
              <Header />
              <main>{children}</main>
              <Toaster />
            </div>
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
