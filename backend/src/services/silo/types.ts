import type { BigNumber } from "ethers";

export interface SiloConfig {
	siloAddress: string;
	tokenAddress: string;
}

export interface DepositParams {
	amount: BigNumber;
	userAddress: string;
}

export interface WithdrawParams {
	shares: BigNumber;
	userAddress: string;
}

export interface PositionInfo {
	regularDepositAmount: BigNumber;
}

export interface TransactionResponse {
	success: boolean;
	transactionHash?: string;
	error?: string;
}
