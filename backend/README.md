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
    "userId": "9229f9f2-b61a-0cec-a3ab-220661fc7e27",
    "walletAddress": "0x7e393441Edc1Bb1621318E000cDfC74947f23b26"
  }'
  