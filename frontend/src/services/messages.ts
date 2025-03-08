import { MockConversation } from '@/src/lib/constants/mock-conversation';
import { useDemoStore } from '@/src/stores/demo-store';
import type { BaseResponse, MessageRequest } from '@/src/types/api';
import { clientEnv } from '../lib/config/client-env';
import { getWalletUUID } from '../lib/utils';

const API_URL = clientEnv.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error('NEXT_PUBLIC_API_URL is not defined');
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let mockMessageIndex = 0;

const getMockResponse = async (): Promise<BaseResponse> => {
  // Get next message(s) from mock conversation
  const messages: BaseResponse = [];
  const currentMessage = MockConversation[mockMessageIndex];

  if (!currentMessage) {
    return messages;
  }

  // Add messages until we hit a user message or end of conversation
  while (
    mockMessageIndex < MockConversation.length &&
    MockConversation[mockMessageIndex].type !== 'user'
  ) {
    messages.push({
      user: 'agent',
      text:
        MockConversation[mockMessageIndex].type === 'agent'
          ? (MockConversation[mockMessageIndex].content as string)
          : '',
      action:
        MockConversation[mockMessageIndex].type === 'agent'
          ? 'IGNORE'
          : MockConversation[mockMessageIndex].type.toUpperCase(),
      content: {
        success: true,
        ...(MockConversation[mockMessageIndex].content as object),
      },
    });
    mockMessageIndex++;
  }

  // Skip the next user message to prepare for next response
  mockMessageIndex++;

  // Add random delay between 1-2 seconds
  await delay(1000 + Math.random() * 1000);
  return messages;
};

export const messagesService = {
  async send(
    message: MessageRequest,
    walletAddress?: string,
  ): Promise<BaseResponse> {
    const { isDemoMode } = useDemoStore.getState();

    if (isDemoMode) {
      return getMockResponse();
    }

    if (!walletAddress) {
      throw new Error('No wallet connected');
    }

    const response = await fetch(`${API_URL}/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...message,
        agentId: '416659f6-a8ab-4d90-87b5-fd5635ebe37d', // Default agent ID from README
        userId: getWalletUUID(walletAddress), // Get persistent UUID for this wallet
        walletAddress, // Include the connected wallet address
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    return response.json();
  },

  resetMockConversation() {
    mockMessageIndex = 0;
  },
};
