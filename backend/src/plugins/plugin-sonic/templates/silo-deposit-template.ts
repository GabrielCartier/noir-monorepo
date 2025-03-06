// FIXME Need to add the user address to the template
export const SILO_DEPOSIT_TEMPLATE = `Given the last message from the user and only that message, check if the token is in the supported tokens list. Then check if there is a silo
vault that supports the token. For this you need to check go through the list of silo vaults and check if the token exist. Finally, you
need to check if the user has enough balance in their wallet to deposit the amount requested.
The user will provide the amount to deposit and the token (name, symbol or address).

{{recentMessages}}
{{walletInfo}}
{{supportedTokens}}
{{siloVaults}}
{{userVaultAddress}}

Extract the following information about the requested silo deposit:
- Input token symbol or address (the token to deposit)
- The silo address to deposit the token (it should be called siloTokenAddress in the supportedTokens list)
- The silo config address to deposit the token (it should be called siloConfigAddress in the supportedTokens list)
- The user's vault address (from the userVaultAddress)
- Amount to deposit: Must be a string representing the amount (only number without coin symbol, e.g., "0.1")

When multiple silo vaults are found for the same token:
1. Choose the vault with the highest APY
2. If APYs are equal, choose the one with the highest liquidity
3. If still equal, choose the first one

If there is a problem with the information provided, respond with a JSON markdown block containing your response:

\`\`\`json
{
    "error": string
}
\`\`\`

Otherwise, respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined:

\`\`\`json
{
    "amount": number | null,
    "siloAddress": string | null,
    "tokenAddress": string | null,
    "userVaultAddress": string | null,
    "siloConfigAddress": string | null
}
\`\`\`
`;

// 1. First Action: Find Valid Vaults for Token
export const findValidVaultsTemplate = `Given the last message from the user and only that message, extract the token (symbol, address or name) they want to deposit.
{{recentMessages}}

Then, using the siloVaults data below, follow these steps:
1. Find all vaults that match the user's token (compare Symbol, Token Address, or Name)
2. For each matching vault, map it to this format:
   - siloAddress: use the "Silo Token Address" field
   - configAddress: use the "Config Address" field
   - apy: use the "APY" field (remove % and convert to number)
   - tokenAddress: use the "Token Address" field
3. Sort the mapped vaults by APY (highest first)

{{siloVaults}}

If no token is found in the message or no matching vaults are found, return:
\`\`\`json
{
    "error": "No token specified in message" // or "No vaults found for token X"
}
\`\`\`

Otherwise return:
\`\`\`json
{
    "vaults": [{
        "siloAddress": string,  // from "Silo Token Address"
        "configAddress": string,  // from "Config Address" 
        "apy": number,  // from "APY" (converted to number)
        "tokenAddress": string  // from "Token Address"
    }]
}
\`\`\`
`;

// 2. Second Action: Select Best Vault
export const selectVaultTemplate = `
Given these vaults for token {{tokenSymbol}}, select the best one based on:
1. Highest APY
2. Highest liquidity if APY is equal

\`\`\`json
{
    "selectedVault": {
        "siloAddress": string,
        "configAddress": string,
        "apy": number
    }
}
\`\`\`
`;

// 3. Final Action: Validate and Format Deposit
export const validateDepositTemplate = `
Validate the deposit of {{amount}} {{tokenSymbol}} using:
{{walletInfo}}
{{userVaultAddress}}

\`\`\`json
{
    "amount": string,
    "siloAddress": string,
    "tokenAddress": string,
    "userVaultAddress": string,
    "siloConfigAddress": string,
    "error": string | null
}
\`\`\`
`;
