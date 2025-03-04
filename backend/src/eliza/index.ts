import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AgentRuntime,
  type Character,
  elizaLogger,
  settings,
  stringToUuid,
} from '@elizaos/core';
import evmPlugin, { evmWalletProvider } from '@elizaos/plugin-evm';
import { initializeDbCache } from '../cache/initialize-db-cache';
import { startChat } from '../chat';
import { initializeClients } from '../clients';
import {
  getTokenForProvider,
  loadCharacters,
  parseArguments,
} from '../config/index';
import supabaseAdapter from '../database';
import { ApiClient } from './api';
import { character } from './character';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createAgent(
  character: Character,
  db: any,
  cache: any,
  token: string,
) {
  elizaLogger.success(
    elizaLogger.successesTitle,
    'Creating runtime for character',
    character.name,
  );

  return new AgentRuntime({
    databaseAdapter: db,
    token,
    modelProvider: character.modelProvider,
    evaluators: [],
    character,
    plugins: [evmPlugin].filter(Boolean),
    providers: [evmWalletProvider],
    actions: [],
    services: [],
    managers: [],
    cacheManager: cache,
  });
}

async function startAgent(character: Character, directClient: ApiClient) {
  try {
    console.log('Starting agent', character.name);
    character.id ??= stringToUuid(character.name);
    character.username ??= character.name;

    const token = getTokenForProvider(character.modelProvider, character);
    const db = supabaseAdapter;
    await db.init();
    console.log('Database initialized, initializing cache');
    const cache = initializeDbCache(character, db);
    console.log('Cache initialized, creating agent');
    const runtime = createAgent(character, db, cache, token);
    console.log('Agent created, initializing');
    await runtime.initialize();
    console.log('Agent initialized, initializing clients');
    runtime.clients = await initializeClients(character, runtime);
    console.log('Clients initialized, registering agent');
    directClient.registerAgent(runtime);
    // report to console
    elizaLogger.debug(
      `Started ${character.name}-${character.id} as ${runtime.agentId}`,
    );

    return runtime;
  } catch (error) {
    elizaLogger.error(
      `Error starting agent for character ${character.name}:`,
      error,
    );
    console.error(error);
    throw error;
  }
}

export const startAgents = async () => {
  console.log('Starting agents');
  const directClient = new ApiClient();
  const serverPort = Number.parseInt(settings.SERVER_PORT || '3000');
  const args = parseArguments();

  const charactersArg = args.characters || args.character;
  let characters = [character];

  console.log('charactersArg', charactersArg);
  if (charactersArg) {
    characters = await loadCharacters(charactersArg);
  }
  try {
    for (const character of characters) {
      console.log('Starting agent', character.name);
      await startAgent(character, directClient as ApiClient);
    }
  } catch (error) {
    console.error('Error starting agents:', error);
  }

  console.log(`Starting server on port ${serverPort}`);
  // upload some agent functionality into directClient
  directClient.startAgent = async (character: Character) => {
    // wrap it so we don't have to inject directClient later
    return startAgent(character, directClient);
  };

  directClient.start(serverPort);

  if (serverPort !== Number.parseInt(settings.SERVER_PORT || '3000')) {
    console.log(`Server started on alternate port ${serverPort}`);
  }
  console.log(`Server started on port ${serverPort}`);

  const isDaemonProcess = process.env.DAEMON_PROCESS === 'true';
  if (!isDaemonProcess) {
    console.log("Chat started. Type 'exit' to quit.");
    const chat = startChat(characters);
    chat();
  }
};
