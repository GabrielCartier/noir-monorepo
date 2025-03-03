import { Header } from '@/components/header';
import { OptionsPanel } from '@/components/option/options-panel';
import { PositionsPanel } from '@/components/position/positions-panel';
import { TransactionsPanel } from '@/components/transaction/transactions-panel';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <PositionsPanel />
            <OptionsPanel />
          </div>
          <TransactionsPanel />
        </div>
      </main>
    </div>
  );
}
