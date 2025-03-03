import { ConnectButton } from '@/components/connect-button';

export function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Options Vault</h1>
        <ConnectButton />
      </div>
    </header>
  );
}
