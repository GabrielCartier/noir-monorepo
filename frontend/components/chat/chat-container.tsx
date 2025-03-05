'use client';

import { ChatBox } from '@/components/chat/chat-box';
import { ChatMessage } from '@/components/chat/chat-message';
import { useState } from 'react';

type Message = {
  type: 'user' | 'agent';
  content: string;
};

export const ChatContainer = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (text: string) => {
    // TODO: Implement message sending functionality
    console.log('TODO: Send message:', text);
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((msg, index) => (
          <ChatMessage
            key={`${msg.type}-${index}`}
            content={msg.content}
            isAgent={msg.type === 'agent'}
          />
        ))}
      </div>

      {/* Chat Input */}
      <div className="w-full">
        <ChatBox
          onSend={handleSendMessage}
          disabled={false}
          loading={isLoading}
        />
      </div>
    </div>
  );
};
