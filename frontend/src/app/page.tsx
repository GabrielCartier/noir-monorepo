'use client';

import { AgentPage } from '@/src/components/pages/agent-page';
import { LandingPage } from '@/src/components/pages/landing-page';
import { useWallet } from '@/src/components/providers/wallet-provider';
// import { OptionsPanel } from '@/components/option/options-panel';
// import { PositionsPanel } from '@/components/position/positions-panel';
// import { TransactionsPanel } from '@/components/transaction/transactions-panel';

export default function Home() {
  const { address } = useWallet();

  return address ? <AgentPage /> : <LandingPage />;
}
