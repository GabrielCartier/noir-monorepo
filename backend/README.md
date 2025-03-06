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
  