// 1. First Action: Parse Staking Amount
export const findStakingAmountTemplate = `Given the last message from the user and only that message, extract the amount of $S tokens they want to stake.

{{recentMessages}}
{{walletInfo}}
{{userVaultAddress}}

For the message "Stake 100 S":
1. Amount is 100
2. Use the vault address from context (must be a valid Ethereum address starting with 0x and 40 characters long)

For the message "Stake 50% of my S":
1. Find S balance in walletInfo
2. Calculate 50% of that amount
3. Use the vault address from context (must be a valid Ethereum address starting with 0x and 40 characters long)

Example walletInfo format:
- Token: S
  Balance: 1000
  Address: 0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38

Example userVaultAddress:
0x79D73FBAE74f8B386b2F68Ca01e081FEe5eF690d

If no amount can be determined, return:
\`\`\`json
{
    "error": "Could not determine staking amount. Please specify how many $S tokens you want to stake."
}
\`\`\`

If the vault address is not a valid Ethereum address, return:
\`\`\`json
{
    "error": "Invalid vault address format. Please ensure you have a valid vault."
}
\`\`\`

Otherwise return:
\`\`\`json
{
    "amount": number,
    "userVaultAddress": string (must be a valid Ethereum address)
}
\`\`\`
`;
