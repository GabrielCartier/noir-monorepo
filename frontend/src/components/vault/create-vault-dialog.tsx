'use client';

import { Button } from '@/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/src/components/ui/dialog';
import { useState } from 'react';
import { useAccount } from 'wagmi';

export function CreateVaultDialog() {
  const { address } = useAccount();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild={true}>
        <Button variant="outline">Create Vault</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Your Vault</DialogTitle>
          <DialogDescription>
            To create a vault, you'll need to ask the AI agent to help you set
            it up. The agent will guide you through the process and help you
            choose the best strategy.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Your vault will be created for address:{' '}
            <code className="bg-muted px-1 py-0.5 rounded">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </code>
          </p>
        </div>
        <DialogFooter>
          <Button onClick={() => setIsOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
