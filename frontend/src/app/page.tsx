'use client';

import { AgentPage } from '@/src/components/pages/agent-page';
import { LandingPage } from '@/src/components/pages/landing-page';
import { useAccount } from 'wagmi';

export default function Home() {
  const { address } = useAccount();

  return address ? <AgentPage /> : <LandingPage />;
}
