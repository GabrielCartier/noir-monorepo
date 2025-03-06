import { http, createPublicClient, createWalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sonic } from 'viem/chains';
import VaultFactoryArtifact from '../../contracts/artifacts/src/contracts/create-vault/VaultFactory.sol/VaultFactory.json'; // Adjust path

async function main() {
  console.log('Deploying VaultFactory to Sonic Blaze testnet...');

  // Check for private key
  if (!process.env.EVM_PRIVATE_KEY) {
    throw new Error('EVM_PRIVATE_KEY environment variable is not set');
  }

  // Initialize Viem clients
  const publicClient = createPublicClient({
    chain: sonic,
    transport: http(),
  });

  // Create wallet client with private key
  const account = privateKeyToAccount(
    process.env.EVM_PRIVATE_KEY as `0x${string}`,
  );
  console.log('Deploying from account:', account.address);

  const walletClient = createWalletClient({
    account,
    chain: sonic,
    transport: http(),
  });

  console.log('Deploying contract...');
  // Deploy the contract using ABI and Bytecode
  const hash = await walletClient.deployContract({
    abi: VaultFactoryArtifact.abi,
    bytecode: VaultFactoryArtifact.bytecode,
  });

  console.log('Transaction hash:', hash);
  console.log('Waiting for deployment...');

  // Wait for deployment transaction
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (!receipt.contractAddress) {
    throw new Error('Failed to get contract address from transaction receipt');
  }

  console.log('VaultFactory deployed to:', receipt.contractAddress);
  console.log('Please set this address in your .env file as EVM_PRIVATE_KEY');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
