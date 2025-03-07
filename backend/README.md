# Elysia with Bun runtime

## Development
To start the development server run:
```bash
bun run dev
```


## Curl for creating a vault

curl -X POST http://localhost:3000/message \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "12dea96f-ec20-0935-a6ab-75692c994959",
    "text": "Deposit 1 USDC in a silo vault",
    "agentId": "416659f6-a8ab-4d90-87b5-fd5635ebe37d",
    "walletAddress": "0xf672715f2bA85794659a7150e8C21F8d157bFe1D"
  }'


## Curl for depositing tokens

curl -X POST http://localhost:3000/message \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "12dea96f-ec20-0935-a6ab-75692c994959",
    "text": "Deposit 1 USDC in a silo vault",
    "agentId": "416659f6-a8ab-4d90-87b5-fd5635ebe37d",
    "walletAddress": "0xf672715f2bA85794659a7150e8C21F8d157bFe1D"
  }'
  
  {"text": "Vault created for user 9229f9f2-b61a-0cec-a3ab-220661fc7e27", "metadata": {"type": "vault_info", "isMain": true, "source": "sonic_plugin", "userId": "9229f9f2-b61a-0cec-a3ab-220661fc7e27", "isShared": true, "createdAt": "2025-03-06T13:51:38.146Z", "vaultAddress": "0x79D73FBAE74f8B386b2F68Ca01e081FEe5eF690d", "walletAddress": "0xf672715f2bA85794659a7150e8C21F8d157bFe1D", "transactionHash": "0x70a819701f902c6dfece5bfb46c194a68257b16916ccbd1e44d2a5ae0bbbf621"}}