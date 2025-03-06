import type { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

const config: HardhatUserConfig = {
  solidity: '0.8.26',
  networks: {
    sonic: {
      url: 'https://rpc.blaze.soniclabs.com',
      accounts: process.env.VAULT_CREATOR_PRIVATE_KEY
        ? [process.env.VAULT_CREATOR_PRIVATE_KEY]
        : [],
    },
  },
  paths: {
    sources: './src/plugins/plugin-sonic/contracts',
    artifacts: './src/plugins/plugin-sonic/contracts/artifacts',
  },
};

export default config;
