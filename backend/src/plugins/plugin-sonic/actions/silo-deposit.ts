import type {
	Action,
	Content,
	IAgentRuntime,
	Memory,
	State,
} from "@elizaos/core";
import { BigNumber, type providers } from "ethers";
import { SiloService } from "../../../services/silo/siloService";

interface DepositContent extends Content {
	amount: string;
	tokenAddress: string;
	siloAddress: string;
	userAddress: string;
	siloConfigAddress: string;
	siloLensAddress: string;
}

interface DepositResponse {
	success: boolean;
	response: string;
	transactionHash?: string;
}

export const depositAction: Action = {
	name: "DEPOSIT",
	description:
		"Deposits assets into a Silo vault using ERC4626 deposit function",
	similes: [
		"DEPOSIT_ASSETS",
		"ADD_LIQUIDITY",
		"STORE_ASSETS",
		"LOCK_ASSETS",
		"PROVIDE_LIQUIDITY",
	],
	examples: [
		[
			{
				user: "{{user1}}",
				content: {
					amount: "1000000000000000000", // 1 ETH in wei
					tokenAddress: "0x5979D7b546E38E414F7E9822514be443A4800529", // wstETH
					siloAddress: "0x0f3E42679f6Cf6Ee00b7eAC7b1676CA044615402",
					userAddress: "0xCeF9Cdd466d03A1cEdf57E014d8F6Bdc87872189",
				} as DepositContent,
			},
			{
				user: "{{agentName}}",
				content: {
					text: "Successfully deposited 1 wstETH into Silo vault",
					action: "DEPOSIT",
				},
			},
		],
	],
	validate: async (
		_runtime: IAgentRuntime,
		message: Memory,
		_state?: State,
	): Promise<boolean> => {
		try {
			const content = message.content as DepositContent;
			return (
				typeof content.amount === "string" &&
				typeof content.tokenAddress === "string" &&
				typeof content.siloAddress === "string" &&
				typeof content.userAddress === "string" &&
				/^0x[a-fA-F0-9]{40}$/.test(content.tokenAddress) &&
				/^0x[a-fA-F0-9]{40}$/.test(content.siloAddress) &&
				/^0x[a-fA-F0-9]{40}$/.test(content.userAddress) &&
				/^\d+$/.test(content.amount)
			);
		} catch {
			return false;
		}
	},
	handler: async (
		runtime: IAgentRuntime,
		message: Memory,
		_state?: State,
	): Promise<DepositResponse> => {
		try {
			const content = message.content as DepositContent;

			// Get the provider and cast it to JsonRpcProvider
			const provider = runtime
				.providers[0] as unknown as providers.JsonRpcProvider;

			// Initialize Silo service
			const siloService = new SiloService(
				{
					siloAddress: content.siloAddress,
					tokenAddress: content.tokenAddress,
				},
				provider,
			);

			// Perform deposit
			const result = await siloService.deposit({
				amount: BigNumber.from(content.amount),
				userAddress: content.userAddress,
			});

			if (!result.success) {
				return {
					success: false,
					response: result.error || "Deposit failed",
				};
			}

			return {
				success: true,
				response: `Successfully deposited ${content.amount} wei into Silo vault ${content.siloAddress}`,
				transactionHash: result.transactionHash,
			};
		} catch (error) {
			return {
				success: false,
				response: error instanceof Error ? error.message : "Deposit failed",
			};
		}
	},
};
