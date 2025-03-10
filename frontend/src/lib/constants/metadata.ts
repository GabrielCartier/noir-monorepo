import type { Metadata } from 'next';

export const metadataConfig: Metadata = {
  title: 'Thrust AI',
  description:
    'Thrust AI makes it easy for every day users to find the best DeFi opportunities and manage their portfolio. LIVE ON SONIC!',
  metadataBase: new URL('https://thrustai.vercel.app/'),
  openGraph: {
    type: 'website',
    url: 'https://thrustai.vercel.app/',
    title: 'Thrust AI',
    description:
      'Thrust AI makes it easy for every day users to find the best DeFi opportunities and manage their portfolio. LIVE ON SONIC!',
    siteName: 'Thrust AI',
    images: [
      {
        url: '/icon.png',
        width: 1200,
        height: 630,
        alt: '',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Thrust AI',
    description:
      'Thrust AI makes it easy for every day users to find the best DeFi opportunities and manage their portfolio. LIVE ON SONIC!',
    images: ['/icon.png'],
  },
  icons: {
    icon: [
      { url: '/icon.png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png' }],
    shortcut: [{ url: '/icon.png' }],
  },
  manifest: '/manifest.json',
  applicationName: '',
  keywords: ['DeFAI', 'DeFi', 'Sonic', 'Crypto', 'Agent'],
  authors: [{ name: 'Thrust AI' }],
};
