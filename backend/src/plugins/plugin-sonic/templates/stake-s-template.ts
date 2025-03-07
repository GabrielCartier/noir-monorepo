// 1. First Action: Parse Staking Amount
export const findStakingAmountTemplate = `Given the last message from the user and only that message, extract the amount of $S tokens they want to stake.

{{recentMessages}}
{{walletInfo}}
{{userVaultAddress}}

For the message "Stake 100 S":
1. Amount is 100
2. Use the vault address from context

For the message "Stake 50% of my S":
1. Find S balance in walletInfo
2. Calculate 50% of that amount
3. Use the vault address from context

Example walletInfo format:
- Token: S
  Balance: 1000
  Address: 0x...

If no amount can be determined, return:
\`\`\`json
{
    "error": "Could not determine staking amount. Please specify how many $S tokens you want to stake."
}
\`\`\`

Otherwise return:
\`\`\`json
{
    "amount": number,
    "userVaultAddress": string
}
\`\`\`
`;

// 2. Final Action: Validate Staking Amount
export const validateStakingAmountTemplate = `
Validate the staking of {{amount}} $S tokens using the wallet information below:

{{walletInfo}}
{{userVaultAddress}}

Check:
1. Amount is positive and non-zero
2. User has sufficient balance (check S token balance in walletInfo)
3. Amount is reasonable (not trying to stake more than available)
4. Vault address is available

Return:
\`\`\`json
{
    "amount": number,
    "userVaultAddress": string,
    "error": string | null
}
\`\`\`
`;
