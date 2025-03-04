import {
  type Client,
  type Content,
  type IAgentRuntime,
  type Memory,
  ModelClass,
  type Plugin,
  composeContext,
  elizaLogger,
  generateMessageResponse,
  getEmbeddingZeroVector,
  messageCompletionFooter,
  settings,
  stringToUuid,
} from '@elizaos/core';
import { Elysia } from 'elysia';

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

{{attachments}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

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

export class ApiClient {
  public app: Elysia;
  private agents: Map<string, IAgentRuntime>; // container management
  private server: any; // Store server instance
  public startAgent: Function; // Store startAgent functor
  public loadCharacterTryPath: Function; // Store loadCharacterTryPath functor
  public jsonToCharacter: Function; // Store jsonToCharacter functor

  constructor() {
    elizaLogger.log('DirectClient constructor');
    this.app = new Elysia();
    this.agents = new Map();

    // TODO Typing
    // Set up message endpoint
    this.app.post('/:agentId/message', async ({ params, body }) => {
      const { agentId } = params;
      const roomId = stringToUuid(body.roomId ?? `default-room-${agentId}`);
      const userId = stringToUuid(body.userId ?? 'user');

      let runtime = this.agents.get(agentId);

      // if runtime is null, look for runtime with the same name
      if (!runtime) {
        runtime = Array.from(this.agents.values()).find(
          (a) => a.character.name.toLowerCase() === agentId.toLowerCase(),
        );
      }

      if (!runtime) {
        return new Response('Agent not found', { status: 404 });
      }

      await runtime.ensureConnection(
        userId,
        roomId,
        body.userName,
        body.name,
        'direct',
      );

      const text = body.text;
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
      };
      const userMessage = {
        content,
        userId,
        roomId,
        agentId: runtime.agentId,
      };
      const memory: Memory = {
        id: stringToUuid(`${messageId}-${userId}`),
        ...userMessage,
        agentId: runtime.agentId,
        userId,
        roomId,
        content,
      };
      await runtime.messageManager.addEmbeddingToMemory(memory);
      await runtime.messageManager.createMemory(memory);

      console.log('Composing state');
      let state;
      try {
        state = await runtime.composeState(userMessage, {
          agentName: runtime.character.name,
        });
      } catch (error) {
        console.error('Error composing state', error);
      }

      console.log('state composed');
      const context = composeContext({
        state,
        template: messageHandlerTemplate,
      });
      console.log('Context', context);
      const response = await generateMessageResponse({
        runtime: runtime,
        context,
        modelClass: ModelClass.LARGE,
      });
      console.log('Response', response);
      if (!response) {
        return new Response('No response from generateMessageResponse', {
          status: 500,
        });
      }

      // save response to memory
      const responseMessage: Memory = {
        id: stringToUuid(`${messageId}-${runtime.agentId}`),
        ...userMessage,
        userId: runtime.agentId,
        content: response,
        embedding: getEmbeddingZeroVector(),
        createdAt: Date.now(),
      };
      console.log('Response message', responseMessage);
      await runtime.messageManager.createMemory(responseMessage);

      state = await runtime.updateRecentMessageState(state);
      console.log('State', state);
      let message = null as Content | null;
      console.log('Message', message);
      await runtime.processActions(
        memory,
        [responseMessage],
        state,
        async (newMessages) => {
          message = newMessages;
          return [memory];
        },
      );
      console.log('Processed actions');
      await runtime.evaluate(memory, state);
      console.log('Evaluated');
      // Check if we should suppress the initial message
      const action = runtime.actions.find((a) => a.name === response.action);
      const shouldSuppressInitialMessage = action?.suppressInitialMessage;
      console.log(
        'Should suppress initial message',
        shouldSuppressInitialMessage,
      );

      if (shouldSuppressInitialMessage) {
        if (message) {
          Response.json([message]);
        } else {
          Response.json([]);
        }
      } else if (message) {
        Response.json([message]);
      } else {
        return Response.json([]);
      }
    });
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
    this.server = this.app.listen(port, () => {
      elizaLogger.success(
        `REST API bound to 0.0.0.0:${port}. If running locally, access it at http://localhost:${port}.`,
      );
    });

    // Handle graceful shutdown
    const gracefulShutdown = () => {
      elizaLogger.log('Received shutdown signal, closing server...');
      this.server.close(() => {
        elizaLogger.success('Server closed successfully');
        process.exit(0);
      });

      // Force close after 5 seconds if server hasn't closed
      setTimeout(() => {
        elizaLogger.error(
          'Could not close connections in time, forcefully shutting down',
        );
        process.exit(1);
      }, 5000);
    };

    // Handle different shutdown signals
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  }

  public async stop() {
    if (this.server) {
      this.server.close(() => {
        elizaLogger.success('Server stopped');
      });
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
