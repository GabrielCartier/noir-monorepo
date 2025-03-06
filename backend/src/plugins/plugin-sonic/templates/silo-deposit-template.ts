// FIXME Need to add the user address to the template
export const SILO_DEPOSIT_TEMPLATE = `Given the last message from the user and only that message, check if the token is in the supported tokens list. Then check if there is a silo
vault that supports the token. For this you need to check go through the list of silo vaults and check if the token exist. Finally, you
need to check if the user has enough balance in their wallet to deposit the amount requested.
The user will provide the amount to deposit and the token (name, symbol or address).

{{recentMessages}}
{{walletInfo}}
{{supportedTokens}}
{{siloVaults}}

Extract the following information about the requested silo deposit:
- Input token symbol or address (the token to deposit)
- The silo address to deposit the token (it should be called siloTokenAddress in the supportedTokens list)
- The silo config address to deposit the token (it should be called siloConfigAddress in the supportedTokens list)
- The vault address (from the user's vaults list)
- Amount to deposit: Must be a string representing the amount (only number without coin symbol, e.g., "0.1")

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
    "vaultAddress": string | null,
    "siloConfigAddress": string | null
}
\`\`\`
`;
