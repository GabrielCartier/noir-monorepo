'use client';
import { ChatContainer } from '@/src/components/chat/chat-container';
import { Header } from '@/src/components/header';
// import { OptionsPanel } from '@/components/option/options-panel';
// import { PositionsPanel } from '@/components/position/positions-panel';
// import { TransactionsPanel } from '@/components/transaction/transactions-panel';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4 space-y-6">
        <div className="flex-1 container mx-auto px-4 py-8">
          <ChatContainer />
        </div>
      </main>
    </div>
  );
}
