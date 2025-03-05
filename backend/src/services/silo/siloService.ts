import { Contract, type ethers } from "ethers";
import type {
	DepositParams,
	PositionInfo,
	SiloConfig,
	TransactionResponse,
	WithdrawParams,
} from "./types";

import { ERC20_ABI, SILO_ABI } from "./abis";

export class SiloService {
	private silo: Contract;
	private token: Contract;
	private provider: ethers.providers.JsonRpcProvider;

	constructor(
		config: SiloConfig,
		provider: ethers.providers.Provider | ethers.providers.JsonRpcProvider,
	) {
		// Cast provider to JsonRpcProvider
		this.provider = provider as ethers.providers.JsonRpcProvider;

		// Initialize contracts
		this.silo = new Contract(config.siloAddress, SILO_ABI, this.provider);
		this.token = new Contract(config.tokenAddress, ERC20_ABI, this.provider);
	}

	async deposit(params: DepositParams): Promise<TransactionResponse> {
		try {
			const signer = this.provider.getSigner(params.userAddress);
			const siloWithSigner = this.silo.connect(signer);
			const tokenWithSigner = this.token.connect(signer);

			// Approve token spending
			const approveTx = await tokenWithSigner.approve(
				this.silo.address,
				params.amount,
			);
			await approveTx.wait();

			// Perform deposit
			const depositTx = await siloWithSigner.deposit(
				params.amount,
				params.userAddress,
			);
			const receipt = await depositTx.wait();

			return {
				success: true,
				transactionHash: receipt.transactionHash,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Deposit failed",
			};
		}
	}

	async withdrawAll(params: WithdrawParams): Promise<TransactionResponse> {
		try {
			const signer = this.provider.getSigner(params.userAddress);
			const siloWithSigner = this.silo.connect(signer);

			// Get current shares balance
			const shares = await siloWithSigner.balanceOf(params.userAddress);

			// Redeem all shares
			const redeemTx = await siloWithSigner.redeem(
				shares,
				params.userAddress,
				params.userAddress,
			);
			const receipt = await redeemTx.wait();

			return {
				success: true,
				transactionHash: receipt.transactionHash,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : "Withdrawal failed",
			};
		}
	}

	async getPositionInfo(userAddress: string): Promise<PositionInfo> {
		// Get regular deposit amount
		const userShares = await this.silo.balanceOf(userAddress);
		const regularDepositAmount = await this.silo.previewRedeem(userShares);

		return {
			regularDepositAmount,
		};
	}
}
