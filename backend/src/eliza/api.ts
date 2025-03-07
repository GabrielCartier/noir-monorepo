import {
  type Character,
  type Client,
  type Content,
  type IAgentRuntime,
  type Memory,
  ModelClass,
  type Plugin,
  type State,
  composeContext,
  elizaLogger,
  generateMessageResponse,
  getEmbeddingZeroVector,
  messageCompletionFooter,
  settings,
  stringToUuid,
} from '@elizaos/core';
import { Elysia } from 'elysia';
import postgresAdapter from '../database';
import { initSonicProvider } from '../providers/sonic';
import {
  createVault,
  getVault,
  getVaultBalance,
} from '../services/vault-service';

export const messageHandlerTemplate =
  // {{goals}}
  // "# Action Examples" is already included
  `{{actionExamples}}
(Action examples are for reference only. Do not use the information from them in your response.)

# Knowledge
{{knowledge}}

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

{{providers}}

{{messageDirections}}

{{recentMessages}}

{{actions}}

# Instructions: Write the next message for {{agentName}}.
${messageCompletionFooter}`;

export const hyperfiHandlerTemplate = `{{actionExamples}}
(Action examples are for reference only. Do not use the information from them in your response.)

# Knowledge
{{knowledge}}

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

{{providers}}

{{attachments}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

{{messageDirections}}

{{recentMessages}}

{{actions}}

# Instructions: Write the next message for {{agentName}}.

Response format should be formatted in a JSON block like this:
\`\`\`json
{ "lookAt": "{{nearby}}" or null, "emote": "{{emotes}}" or null, "say": "string" or null, "actions": (array of strings) or null }
\`\`\`
`;

interface MessageRequest {
  roomId?: string;
  userId: string;
  userName?: string;
  name?: string;
  text?: string;
  agentId?: string;
  walletAddress?: string;
}

export class ApiClient {
  public app: Elysia;
  private agents: Map<string, IAgentRuntime>;
  public server: ReturnType<Elysia['listen']> | null = null;
  public startAgent: ((character: Character) => Promise<IAgentRuntime>) | null =
    null;
  public loadCharacterTryPath: ((path: string) => Promise<Character>) | null =
    null;
  public jsonToCharacter: ((json: unknown) => Character) | null = null;
  private isInitialized = false;

  constructor() {
    this.app = new Elysia()
      .onRequest(({ set }) => {
        // Add CORS headers to all responses
        set.headers['Access-Control-Allow-Origin'] = '*';
        set.headers['Access-Control-Allow-Methods'] =
          'GET, POST, PUT, DELETE, OPTIONS';
        set.headers['Access-Control-Allow-Headers'] =
          'Content-Type, Authorization';
      })
      .options('*', () => new Response(null, { status: 204 }));
    this.agents = new Map();
    this.setupRoutes();

    // Set up lifecycle hooks
    this.app.onStart(async () => {
      if (this.isInitialized) {
      } else {
        try {
          await postgresAdapter.init();
          this.isInitialized = true;
        } catch (error) {
          elizaLogger.error('[ApiClient] Failed to initialize:', error);
          throw error;
        }
      }
    });

    this.app.onStop(async () => {
      elizaLogger.log('[ApiClient] Stopping...');
      try {
        // Close all agent connections
        this.agents.clear();

        // Close database connection
        await postgresAdapter.close();
        this.isInitialized = false;
        elizaLogger.log('[ApiClient] Stopped successfully');
      } catch (error) {
        elizaLogger.error('[ApiClient] Error during shutdown:', error);
        throw error;
      }
    });
  }

  private setupRoutes() {
    // Add vault check endpoint
    this.app.post('/vault/check', async (context) => {
      try {
        elizaLogger.info('[ApiClient] Vault check endpoint called');
        const body = context.body as { walletAddress: string };

        if (!body.walletAddress) {
          elizaLogger.error('[ApiClient] No walletAddress provided in request');
          return Response.json(
            { error: 'No walletAddress provided' },
            { status: 400 },
          );
        }

        // Get the first agent since we need its runtime for the public client
        const firstAgent = Array.from(this.agents.values())[0];
        if (!firstAgent) {
          elizaLogger.error('[ApiClient] No agent available for vault check');
          return Response.json(
            { error: 'No agent available' },
            { status: 500 },
          );
        }

        // Initialize the Sonic provider to get properly configured clients
        const sonicProvider = await initSonicProvider(firstAgent);
        const publicClient = sonicProvider.getPublicClient();
        const walletClient = sonicProvider.getWalletClient();
        const vaultFactoryAddress = sonicProvider.vaultFactoryAddress;

        const { vaultAddress } = await getVault({
          publicClient,
          walletClient,
          vaultFactoryAddress,
          userAddress: body.walletAddress as `0x${string}`,
        });

        // Get the balance if vault exists
        let balance = '0';
        if (vaultAddress !== '0x0000000000000000000000000000000000000000') {
          const balanceResponse = await getVaultBalance({
            publicClient,
            vaultAddress,
            amount: BigInt(0),
            walletClient,
            tokenAddress:
              '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38' as `0x${string}`, // Sonic token address
          });
          balance = balanceResponse.balance.toString();
        }

        return Response.json({
          exists: vaultAddress !== '0x0000000000000000000000000000000000000000',
          vaultAddress,
          balance,
        });
      } catch (error) {
        elizaLogger.error('[ApiClient] Error checking vault:', error);
        return Response.json(
          {
            error:
              error instanceof Error ? error.message : 'Unknown error occurred',
          },
          { status: 500 },
        );
      }
    });

    // Add vault creation endpoint
    this.app.post('/vault/create', async (context) => {
      try {
        elizaLogger.info('[ApiClient] Vault creation endpoint called');
        const body = context.body as { walletAddress: string; userId: string };

        if (!body.walletAddress || !body.userId) {
          elizaLogger.error(
            '[ApiClient] Missing required parameters in request',
          );
          return Response.json(
            { error: 'Missing required parameters' },
            { status: 400 },
          );
        }

        // Get the first agent since we need its runtime
        const firstAgent = Array.from(this.agents.values())[0];
        if (!firstAgent) {
          elizaLogger.error(
            '[ApiClient] No agent available for vault creation',
          );
          return Response.json(
            { error: 'No agent available' },
            { status: 500 },
          );
        }

        // Initialize the Sonic provider to get properly configured clients
        const sonicProvider = await initSonicProvider(firstAgent);
        const publicClient = sonicProvider.getPublicClient();
        const walletClient = sonicProvider.getWalletClient();
        const vaultFactoryAddress = sonicProvider.vaultFactoryAddress;
        const agentAddress = sonicProvider.account.address;

        const response = await createVault({
          userId: body.userId,
          walletAddress: body.walletAddress as `0x${string}`,
          agentAddress,
          vaultFactoryAddress,
          publicClient,
          walletClient,
          runtime: firstAgent,
        });

        if (!response.success) {
          return Response.json(
            { error: response.error || 'Failed to create vault' },
            { status: 500 },
          );
        }

        return Response.json({
          success: true,
          vaultAddress: response.vaultAddress,
        });
      } catch (error) {
        elizaLogger.error('[ApiClient] Error creating vault:', error);
        return Response.json(
          {
            error:
              error instanceof Error ? error.message : 'Unknown error occurred',
          },
          { status: 500 },
        );
      }
    });

    // Handle both /message and /:agentId/message patterns
    this.app.post('/message', async (context) => {
      try {
        elizaLogger.info('[ApiClient] Message endpoint called');
        const body = context.body as MessageRequest;

        if (!body.agentId) {
          elizaLogger.error('[ApiClient] No agentId provided in request');
          return Response.json(
            { error: 'No agentId provided' },
            { status: 400 },
          );
        }

        const agent = this.agents.get(body.agentId);
        if (!agent) {
          elizaLogger.error(
            `[ApiClient] Agent not found for ID/name: ${body.agentId}`,
          );
          return Response.json({ error: 'Agent not found' }, { status: 404 });
        }

        return this.handleMessage(agent, body);
      } catch (error) {
        elizaLogger.error('[ApiClient] Error processing message:', error);
        return Response.json(
          {
            error:
              error instanceof Error ? error.message : 'Unknown error occurred',
          },
          { status: 500 },
        );
      }
    });

    // Legacy route for backward compatibility
    this.app.post('/:agentId/message', async ({ params, body }) => {
      try {
        elizaLogger.info(
          `[ApiClient] Legacy message endpoint called for agent ${params.agentId}`,
        );
        const requestBody = body as MessageRequest;
        requestBody.agentId = params.agentId; // Ensure agentId is set from URL param

        const agent = this.agents.get(params.agentId);
        if (!agent) {
          elizaLogger.error(
            `[ApiClient] Agent not found for ID/name: ${params.agentId}`,
          );
          return Response.json({ error: 'Agent not found' }, { status: 404 });
        }

        return this.handleMessage(agent, requestBody);
      } catch (error) {
        elizaLogger.error(
          '[ApiClient] Error processing legacy message:',
          error,
        );
        return Response.json(
          {
            error:
              error instanceof Error ? error.message : 'Unknown error occurred',
          },
          { status: 500 },
        );
      }
    });
  }

  private async handleMessage(agent: IAgentRuntime, request: MessageRequest) {
    try {
      elizaLogger.info('[ApiClient] Starting message handling');
      const { agentId } = request;
      const roomId = stringToUuid(request.roomId ?? `default-room-${agentId}`);
      const userId =
        request.userId as `${string}-${string}-${string}-${string}-${string}`;

      await agent.ensureConnection(
        userId,
        roomId,
        request.userName,
        request.name,
        'direct',
      );

      const text = request.text;
      // if empty text, directly return
      if (!text) {
        return Response.json([]);
      }

      const messageId = stringToUuid(Date.now().toString());
      const content: Content = {
        text,
        attachments: [],
        source: 'direct',
        inReplyTo: undefined,
        metadata: {
          walletAddress: request.walletAddress,
        },
      };
      const userMessage = {
        content,
        userId,
        roomId,
        agentId: agent.agentId,
      };
      const memory: Memory = {
        id: stringToUuid(`${messageId}-${userId}`),
        ...userMessage,
        agentId: agent.agentId,
        userId,
        roomId,
        content,
      };
      await agent.messageManager.addEmbeddingToMemory(memory);
      await agent.messageManager.createMemory(memory);

      let state: State | undefined;
      try {
        state = await agent.composeState(userMessage, {
          agentName: agent.character.name,
        });
      } catch (error) {
        elizaLogger.error('[ApiClient] Error composing state:', error);
        return Response.json(
          { error: 'Failed to compose state' },
          { status: 500 },
        );
      }

      if (!state) {
        return Response.json(
          { error: 'Failed to compose state' },
          { status: 500 },
        );
      }

      const context = composeContext({
        state,
        template: messageHandlerTemplate,
      });

      const response = await generateMessageResponse({
        runtime: agent,
        context,
        modelClass: ModelClass.LARGE,
      });

      if (!response) {
        return Response.json(
          { error: 'No response generated' },
          { status: 500 },
        );
      }

      // save response to memory
      const responseMessage: Memory = {
        id: stringToUuid(`${messageId}-${agent.agentId}`),
        ...userMessage,
        userId: agent.agentId,
        content: response,
        embedding: getEmbeddingZeroVector(),
        createdAt: Date.now(),
      };
      await agent.messageManager.createMemory(responseMessage);

      state = await agent.updateRecentMessageState(state);

      let message = null as Content | null;
      await agent.processActions(
        memory,
        [responseMessage],
        state,
        async (newMessages) => {
          message = newMessages;
          return [memory];
        },
      );

      await agent.evaluate(memory, state);

      // Check if we should suppress the initial message
      // const action = agent.actions.find((a) => a.name === response.action);
      // TODO Handle this
      // const shouldSuppressInitialMessage = action?.suppressInitialMessage;

      // Include the response content even if no actions were processed
      const responseContent = message ? [message] : [response];
      return Response.json(responseContent);
    } catch (error) {
      elizaLogger.error('[ApiClient] Error in handleMessage:', error);
      return Response.json(
        {
          error:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
        { status: 500 },
      );
    }
  }

  // agent/src/index.ts:startAgent calls this
  public registerAgent(runtime: IAgentRuntime) {
    // register any plugin endpoints?
    // but once and only once
    this.agents.set(runtime.agentId, runtime);
  }

  public unregisterAgent(runtime: IAgentRuntime) {
    this.agents.delete(runtime.agentId);
  }

  public start(port: number) {
    elizaLogger.log(`[ApiClient] Starting server on port ${port}`);
    this.server = this.app.listen(port, () => {
      elizaLogger.success(
        `REST API bound to 0.0.0.0:${port}. If running locally, access it at http://localhost:${port}.`,
      );
    });
  }

  public async stop() {
    elizaLogger.log('[ApiClient] Stop method called');
    if (this.server) {
      elizaLogger.log('[ApiClient] Closing server...');
      // @ts-ignore - Elysia's server type doesn't include close method, but it exists at runtime
      this.server.close(() => {
        elizaLogger.log('[ApiClient] Server closed successfully');
      });
    } else {
      elizaLogger.log('[ApiClient] No server to stop');
    }
  }
}

export const ApiClientInterface: Client = {
  name: 'api',
  config: {},
  start: async (_runtime: IAgentRuntime) => {
    elizaLogger.log('ApiClientInterface start');
    const client = new ApiClient();
    const serverPort = Number.parseInt(settings.SERVER_PORT || '3000');
    client.start(serverPort);
    return client;
  },
};

const apiPlugin: Plugin = {
  name: 'api',
  description: 'API client',
  clients: [ApiClientInterface],
};

export default apiPlugin;
