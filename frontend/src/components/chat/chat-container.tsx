'use client';
import { useWallet } from '@/src/components/providers/wallet-provider';
import { useEffect, useRef, useState } from 'react';
import { ChatBox } from 'src/components/chat/chat-box';
import { ChatInfo } from 'src/components/chat/chat-info';
import { ChatMessage } from 'src/components/chat/chat-message';
import { ChatMessagesContainer } from 'src/components/chat/chat-messages-container';
import { OpportunityMessage } from 'src/components/chat/opportunity-message';
import { StrategyMessage } from 'src/components/chat/strategy-message';
import { TransactionMessage } from 'src/components/chat/transaction-message';
import { VaultDetailsMessage } from 'src/components/chat/vault-details-message';
import { processApiResponse } from 'src/lib/message-processor';
import { cn } from 'src/lib/utils';
import { messagesService } from 'src/services/messages';
import type { Message } from 'src/types/messages';

export const ChatContainer = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { address } = useWallet();
  const hasInitialized = useRef(false);

  // Handle mounting state
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSendMessage = async (text: string) => {
    // Add user message
    const userMessage: Message = { type: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await messagesService.send(
        {
          name: address ?? '',
          text: hasInitialized.current ? text : `Hello! ${text}`,
        },
        address || undefined,
      );
      hasInitialized.current = true;

      // Process all messages from the response
      const newMessages = processApiResponse(response);
      setMessages((prev) => [...prev, ...newMessages]);
    } catch (error: unknown) {
      console.error('Failed to send message:', error);
      setMessages((prev) => [
        ...prev,
        { type: 'agent', content: 'Sorry, something went wrong.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render anything until mounted to prevent hydration issues
  if (!mounted) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Status Bar */}
      <div className="relative h-[calc(100vh-4rem)]">
        <div className="z-20 relative">
          <ChatMessagesContainer isExpanded={isExpanded} isLoading={isLoading}>
            {messages.map((msg, index) => {
              const key = `${msg.type}-${index}`;
              switch (msg.type) {
                case 'user':
                case 'agent':
                  return (
                    <ChatMessage
                      key={key}
                      content={msg.content}
                      isAgent={msg.type === 'agent'}
                    />
                  );
                case 'strategy':
                  return (
                    <StrategyMessage
                      key={key}
                      strategy={msg.content.strategy}
                    />
                  );
                case 'transaction':
                  return <TransactionMessage key={key} {...msg.content} />;
                case 'vault':
                  return (
                    <VaultDetailsMessage
                      key={key}
                      {...msg.content}
                      onFund={() => {}}
                    />
                  );
                case 'opportunity':
                  return <OpportunityMessage key={key} {...msg.content} />;
                default:
                  return null;
              }
            })}
          </ChatMessagesContainer>
        </div>

        {/* Chat Input Area */}
        <div className="relative pt-2 pb-4">
          <div className="absolute inset-0 flex items-center justify-center z-0">
            {' '}
            {/* Background info lowest */}
            <ChatInfo isExpanded={isExpanded} />
          </div>

          <div className="relative z-10">
            {' '}
            {/* Chat box above background */}
            <div className="flex justify-center">
              <div
                className={cn(
                  'transition-all duration-300 ease-in-out',
                  isExpanded ? 'w-full' : 'w-[768px]',
                )}
              >
                <ChatBox
                  onSend={handleSendMessage}
                  disabled={!address}
                  loading={isLoading}
                  onFocus={() => setIsExpanded(true)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
