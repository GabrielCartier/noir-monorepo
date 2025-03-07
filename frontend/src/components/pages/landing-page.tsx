import { useWallet } from '@/src/components/providers/wallet-provider';
import { WalletConnectButton } from '@/src/components/wallet/wallet-connect-button';

export function LandingPage() {
  const { isConnecting } = useWallet();

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      <h1 className="text-4xl sm:text-5xl font-bold mb-4 mx-80">
        Welcome to <span className="text-green-500">ThrustAI</span>, Your
        High-Speed Crypto Copilot
      </h1>

      <div className="max-w-2xl mb-12 text-muted-foreground">
        <p className="text-lg mb-4">
          Say goodbye to guesswork and hello to AI-powered precision. Track,
          optimize, and manage your portfolio effortlessly with real-time
          insights and automated strategies all in one place.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <WalletConnectButton variant="large" />
        {isConnecting && (
          <p className="text-sm text-muted-foreground animate-pulse">
            Connecting to your wallet...
          </p>
        )}
      </div>
    </div>
  );
}
