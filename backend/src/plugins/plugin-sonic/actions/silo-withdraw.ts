import type {
	Action,
	Content,
	IAgentRuntime,
	Memory,
	State,
} from "@elizaos/core";
import type { providers } from "ethers";
import { SiloService } from "../../../services/silo/siloService";

interface WithdrawContent extends Content {
	tokenAddress: string;
	siloAddress: string;
	userAddress: string;
}

interface WithdrawResponse {
	success: boolean;
	response: string;
	transactionHash?: string;
}

export const withdrawAction: Action = {
	name: "WITHDRAW",
	description:
		"Withdraws all assets from a Silo vault using ERC4626 redeem function",
	similes: [
		"WITHDRAW_ASSETS",
		"REMOVE_LIQUIDITY",
		"UNSTAKE_ASSETS",
		"UNLOCK_ASSETS",
		"WITHDRAW_ALL",
	],
	examples: [
		[
			{
				user: "{{user1}}",
				content: {
					tokenAddress: "0x5979D7b546E38E414F7E9822514be443A4800529", // wstETH
					siloAddress: "0x0f3E42679f6Cf6Ee00b7eAC7b1676CA044615402",
					userAddress: "0xCeF9Cdd466d03A1cEdf57E014d8F6Bdc87872189",
				} as WithdrawContent,
			},
			{
				user: "{{agentName}}",
				content: {
					text: "Successfully withdrew all assets from Silo vault",
					action: "WITHDRAW",
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
			const content = message.content as WithdrawContent;
			return (
				typeof content.tokenAddress === "string" &&
				typeof content.siloAddress === "string" &&
				typeof content.userAddress === "string" &&
				/^0x[a-fA-F0-9]{40}$/.test(content.tokenAddress) &&
				/^0x[a-fA-F0-9]{40}$/.test(content.siloAddress) &&
				/^0x[a-fA-F0-9]{40}$/.test(content.userAddress)
			);
		} catch {
			return false;
		}
	},
	handler: async (
		runtime: IAgentRuntime,
		message: Memory,
		_state?: State,
	): Promise<WithdrawResponse> => {
		try {
			const content = message.content as WithdrawContent;

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

			// Get position info to check balance before withdrawal
			const positionInfo = await siloService.getPositionInfo(
				content.userAddress,
			);

			// Perform withdrawal of all shares
			const result = await siloService.withdrawAll({
				userAddress: content.userAddress,
				shares: positionInfo.regularDepositAmount,
			});

			if (!result.success) {
				return {
					success: false,
					response: result.error || "Withdrawal failed",
				};
			}

			return {
				success: true,
				response: `Successfully withdrew all assets from Silo vault ${content.siloAddress}`,
				transactionHash: result.transactionHash,
			};
		} catch (error) {
			return {
				success: false,
				response: error instanceof Error ? error.message : "Withdrawal failed",
			};
		}
	},
};
