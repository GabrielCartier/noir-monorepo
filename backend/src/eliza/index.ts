import {
  AgentRuntime,
  type Character,
  type ICacheManager,
  type IDatabaseAdapter,
  type IDatabaseCacheAdapter,
  elizaLogger,
  settings,
  stringToUuid,
} from '@elizaos/core';
import evmPlugin from '@elizaos/plugin-evm';
import { initializeDbCache } from '../cache/initialize-db-cache';
import { startChat } from '../chat';
import { initializeClients } from '../clients';
import { configureApiRoutes } from '../config/api-routes';
import {
  getTokenForProvider,
  loadCharacters,
  parseArguments,
} from '../config/index';
import { PostgresDatabaseAdapter } from '../plugins/adapter-postgres';
import { sonicPlugin } from '../plugins/plugin-sonic';
import { ApiClient } from './api';
import { character } from './character';

let postgresAdapter: PostgresDatabaseAdapter;

async function initializeDatabase() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL environment variable is not set');
  }

  elizaLogger.info('Initializing PostgreSQL connection...');
  postgresAdapter = new PostgresDatabaseAdapter({
    connectionString: process.env.POSTGRES_URL,
    parseInputs: true,
  });

  // Test the connection
  await postgresAdapter.init();
  elizaLogger.success('Successfully connected to PostgreSQL database');
  return postgresAdapter;
}

export function createAgent(
  character: Character,
  db: IDatabaseAdapter & IDatabaseCacheAdapter,
  cache: ICacheManager,
  token: string,
) {
  elizaLogger.success(
    elizaLogger.successesTitle,
    'Creating runtime for character',
    character.name,
  );

  // Use type assertion to handle plugin version mismatch
  const plugins = [
    evmPlugin as unknown as Plugin,
    sonicPlugin as unknown as Plugin,
  ];

  return new AgentRuntime({
    databaseAdapter: db,
    token,
    modelProvider: character.modelProvider,
    evaluators: [],
    character,
    plugins,
    providers: [],
    actions: [],
    services: [],
    managers: [],
    cacheManager: cache,
  });
}

async function startAgent(character: Character, directClient: ApiClient) {
  let db: (IDatabaseAdapter & IDatabaseCacheAdapter) | undefined;
  try {
    elizaLogger.info(`[Agent] Starting agent for character: ${character.name}`);
    character.id ??= stringToUuid(character.name);
    character.username ??= character.name;

    const token = getTokenForProvider(character.modelProvider, character);
    if (!token) {
      elizaLogger.error(
        `[Agent] No token found for provider ${character.modelProvider}`,
      );
      throw new Error(`No token found for provider ${character.modelProvider}`);
    }
    elizaLogger.info(
      `[Agent] Got token for provider ${character.modelProvider}`,
    );

    db = await initializeDatabase();
    const cache = initializeDbCache(character, db);

    const runtime = createAgent(character, db, cache, token);

    await runtime.initialize();
    runtime.clients = await initializeClients(character, runtime);

    directClient.registerAgent(runtime);

    return runtime;
  } catch (error) {
    elizaLogger.error(
      `[Agent] Error starting agent for character ${character.name}:`,
      error,
    );
    if (db) {
      elizaLogger.info('[Agent] Closing database connection due to error');
      await db.close();
    }
    throw error;
  }
}

export const startAgents = async () => {
  elizaLogger.info('[StartAgents] Starting agents initialization');
  const directClient = new ApiClient();
  configureApiRoutes(directClient.app);
  const serverPort = Number.parseInt(settings.SERVER_PORT || '3000');
  const args = parseArguments();

  const charactersArg = args.characters || args.character;
  let characters = [character];

  if (charactersArg) {
    characters = await loadCharacters(charactersArg);
  }

  try {
    for (const character of characters) {
      await startAgent(character, directClient as ApiClient);
    }
  } catch (error) {
    elizaLogger.error('[StartAgents] Error starting agents:', error);
    throw error;
  }

  // upload some agent functionality into directClient
  directClient.startAgent = async (character: Character) => {
    return startAgent(character, directClient);
  };

  directClient.start(serverPort);
  elizaLogger.info(
    `[StartAgents] Server started successfully on port ${serverPort}`,
  );

  const isDaemonProcess = process.env.DAEMON_PROCESS === 'true';
  if (!isDaemonProcess) {
    elizaLogger.info("[StartAgents] Chat started. Type 'exit' to quit.");
    const chat = startChat(characters);
    chat();
  }

  // Handle graceful shutdown
  let isShuttingDown = false;
  const shutdown = async () => {
    elizaLogger.info('[Shutdown] Shutdown handler triggered');
    elizaLogger.debug('[Shutdown] Stack trace:', new Error().stack);

    if (isShuttingDown) {
      elizaLogger.info('[Shutdown] Already shutting down, skipping...');
      return;
    }

    isShuttingDown = true;
    elizaLogger.info('[Shutdown] Starting graceful shutdown...');

    try {
      // Close any running servers first
      if (directClient.server) {
        elizaLogger.info('[Shutdown] Closing server...');
        // @ts-ignore - Elysia's server type doesn't include close method, but it exists at runtime
        await directClient.server.close();
        elizaLogger.info('[Shutdown] Server closed successfully');
      }

      // Then close database connection
      if (postgresAdapter) {
        elizaLogger.info('[Shutdown] Closing database connection...');
        await postgresAdapter.close();
        elizaLogger.info('[Shutdown] Database connection closed successfully');
      }

      process.exit(0);
    } catch (error) {
      elizaLogger.error('[Shutdown] Error during shutdown:', error);
      process.exit(1);
    }
  };

  // Handle different shutdown signals - remove any existing handlers first
  elizaLogger.info('[Shutdown] Setting up shutdown handlers...');
  process.removeListener('SIGINT', shutdown);
  process.removeListener('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};
