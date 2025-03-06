import { http, createPublicClient, createWalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sonic } from 'viem/chains';
import { VaultFactory } from '../src/plugins/plugin-sonic/contracts/create-vault/VaultFactory';

async function main() {
  console.log('Deploying VaultFactory to Sonic Blaze testnet...');

  // Check for private key
  if (!process.env.VAULT_CREATOR_PRIVATE_KEY) {
    throw new Error(
      'VAULT_CREATOR_PRIVATE_KEY environment variable is not set',
    );
  }

  // Initialize Viem clients
  const publicClient = createPublicClient({
    chain: sonic,
    transport: http(),
  });

  // Create wallet client with private key
  const account = privateKeyToAccount(
    process.env.VAULT_CREATOR_PRIVATE_KEY as `0x${string}`,
  );
  console.log('Deploying from account:', account.address);

  const walletClient = createWalletClient({
    account,
    chain: sonic,
    transport: http(),
  });

  console.log('Deploying contract...');
  // Deploy the contract
  const hash = await walletClient.deployContract({
    abi: VaultFactory.abi,
    bytecode: VaultFactory.bytecode,
  });

  console.log('Transaction hash:', hash);
  console.log('Waiting for deployment...');

  // Wait for deployment transaction
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (!receipt.contractAddress) {
    throw new Error('Failed to get contract address from transaction receipt');
  }

  console.log('VaultFactory deployed to:', receipt.contractAddress);
  console.log(
    'Please set this address in your .env file as VAULT_FACTORY_ADDRESS',
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
