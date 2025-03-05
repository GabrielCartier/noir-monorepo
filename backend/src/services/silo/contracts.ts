import type { BigNumber } from 'ethers';

export interface IERC20 {
  address: string;
  abi: Array<{
    inputs: Array<{ name: string; type: string }>;
    name: string;
    outputs: Array<{ name: string; type: string }>;
    stateMutability: string;
    type: string;
  }>;
  approve(
    spender: string,
    amount: BigNumber,
  ): Promise<{ hash: string; wait: () => Promise<{ status: number }> }>;
  balanceOf(account: string): Promise<BigNumber>;
  transfer(
    recipient: string,
    amount: BigNumber,
  ): Promise<{ hash: string; wait: () => Promise<{ status: number }> }>;
}

export interface ISilo {
  address: string;
  abi: Array<{
    inputs: Array<{ name: string; type: string }>;
    name: string;
    outputs: Array<{ name: string; type: string }>;
    stateMutability: string;
    type: string;
  }>;
  deposit(
    assets: BigNumber,
    receiver: string,
  ): Promise<{ hash: string; wait: () => Promise<{ status: number }> }>;
  withdraw(
    assets: BigNumber,
    receiver: string,
    owner: string,
  ): Promise<{ hash: string; wait: () => Promise<{ status: number }> }>;
  redeem(
    shares: BigNumber,
    receiver: string,
    owner: string,
  ): Promise<{ hash: string; wait: () => Promise<{ status: number }> }>;
  balanceOf(account: string): Promise<BigNumber>;
  previewRedeem(shares: BigNumber, collateralType?: number): Promise<BigNumber>;
  isSolvent(user: string): Promise<boolean>;
}
