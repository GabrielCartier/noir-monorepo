export const SILO_DEPOSIT_TEMPLATE = `Given the recent messages and wallet information below:

{{recentMessages}}

{{walletInfo}}

{{siloVaults}}

Extract the following information about the requested silo deposit:
- Input token symbol or address (the token to deposit)
- Amount to deposit: Must be a string representing the amount (only number without coin symbol, e.g., "0.1")

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined:

\`\`\`json
{
    "amount": number | null,
    "siloAddress": string | null,
    "userAddress": string | null,
    "siloConfigAddress": string | null
}
\`\`\`
`;
