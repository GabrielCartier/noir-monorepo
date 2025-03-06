import { config as dotenvConfig } from "dotenv";
import { http, createPublicClient, createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sonic } from "viem/chains";
import VaultFactoryArtifact from "../artifacts/src/contracts/create-vault/VaultFactory.sol/VaultFactory.json";

dotenvConfig();

async function main() {
	console.log("Starting VaultFactory deployment...");

	// Get the deployer account
	const privateKey = process.env.EVM_PRIVATE_KEY;
	if (!privateKey) {
		throw new Error("EVM_PRIVATE_KEY environment variable is not set");
	}
	const account = privateKeyToAccount(privateKey as `0x${string}`);
	console.log("Deploying contracts with the account:", account.address);

	// Create clients
	const publicClient = createPublicClient({
		chain: sonic,
		transport: http(),
	});

	const walletClient = createWalletClient({
		account,
		chain: sonic,
		transport: http(),
	});

	// Deploy VaultFactory
	const hash = await walletClient.deployContract({
		abi: VaultFactoryArtifact.abi,
		bytecode: VaultFactoryArtifact.bytecode as `0x${string}`,
	});

	console.log("Deployment transaction sent:", hash);

	// Wait for deployment
	const receipt = await publicClient.waitForTransactionReceipt({ hash });
	if (!receipt.contractAddress) {
		throw new Error("Failed to get contract address from deployment receipt");
	}

	const vaultFactoryAddress = receipt.contractAddress;
	console.log("VaultFactory deployed to:", vaultFactoryAddress);

	// Log the deployment details
	console.log("\nDeployment Details:");
	console.log("------------------");
	console.log("VaultFactory Address:", vaultFactoryAddress);
	console.log("Deployer Address:", account.address);
	console.log("Transaction Hash:", hash);
	console.log("\nNext steps:");
	console.log("1. Set the VAULT_FACTORY_ADDRESS environment variable:");
	console.log(`   export VAULT_FACTORY_ADDRESS=${vaultFactoryAddress}`);
	console.log("2. Restart your backend server");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
