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
    "agentId": "416659f6-a8ab-4d90-87b5-fd5635ebe37d",
    "text": "create a vault for me",
    "roomId": "default-room",
    "userId": "12dea96f-ec20-0935-a6ab-75692c994959",
    "walletAddress": "0x1234567890thisisatestabcdef12345678"
  }'
