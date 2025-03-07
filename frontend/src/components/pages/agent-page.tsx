'use client';

import { ChatContainer } from '@/src/components/chat/chat-container';
import { TransactionHistory } from '@/src/components/transaction/transaction-history';
import { VaultValue } from '@/src/components/vault/vault-value';

export function AgentPage() {
  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-[1fr,320px] gap-4">
        {/* Main chat area */}
        <div className="rounded-lg bg-card">
          <ChatContainer />
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <TransactionHistory />
          <VaultValue />
        </div>
      </div>
    </div>
  );
}
