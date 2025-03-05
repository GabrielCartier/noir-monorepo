# Elysia with Bun runtime

## Development
To start the development server run:
```bash
bun run dev
```

## Curl

curl -X POST http://localhost:3000/message \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "416659f6-a8ab-4d90-87b5-fd5635ebe37d",
    "text": "deposit 0.01 S (0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38)",
    "roomId": "default-room",
    "userId": "user",
    "userName": "User",
    "content": {
      "amount": "10000000000000000",
      "tokenAddress": "0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38",
      "siloAddress": "0xf55902DE87Bd80c6a35614b48d7f8B612a083C12",
      "userAddress": "0x2D9b0C8529f49CB9561ba21f87AA77886e32858E"
    }
  }'

