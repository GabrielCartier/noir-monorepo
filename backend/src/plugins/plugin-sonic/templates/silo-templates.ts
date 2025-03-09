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
export const findValidVaultsTemplate = `Given the last message from the user and only that message, extract the token (symbol, address or name) and the amount they want to deposit.
{{recentMessages}}

For the message "Deposit 1 S in a silo vault":
1. Token to look for is "S"
2. Amount is 1

Using the siloVaults data below:
1. Find all vaults where either:
   - Symbol exactly matches "S"
   - Name contains "S"
   - Token Address matches (if an address was provided)
2. For each matching vault, map it to this format:
   - siloAddress: copy the "Silo Token Address" field exactly
   - configAddress: copy the "Config Address" field exactly
   - apy: convert the "APY" field to a number (remove the % sign)
   - tokenAddress: copy the "Token Address" field exactly
3. Sort the mapped vaults by APY (highest first)

{{siloVaults}}

If no matching vaults are found, return:
\`\`\`json
{
    "error": "No verified vaults found for token S"
}
\`\`\`

Otherwise return:
\`\`\`json
{
    "vaults": [{
        "siloAddress": string,
        "configAddress": string,
        "apy": number,
        "tokenAddress": string
    }],
    "amount": number
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

// Template for finding vaults with active positions
export const findVaultsWithPositionsTemplate = `Given the last message from the user and only that message, find all vaults where the user has an active position.

{{recentMessages}}
{{siloVaults}}
{{userVaultAddress}}

For each vault in siloVaults:
1. Look for the "Silo Token Address" field in each vault entry
2. Include that address in the response if it exists

Additionally, include these specific silo addresses if they exist:
- 0xB2fCA0e72DF1B7f844E439668dc3A58646C7D65a

If no vaults are found, return:
\`\`\`json
{
    "error": "No vaults with active positions found"
}
\`\`\`

Otherwise return:
\`\`\`json
{
    "vaults": [{
        "siloAddress": string  // Use the "Silo Token Address" field from each vault or the additional addresses
    }]
}
\`\`\`
`;
