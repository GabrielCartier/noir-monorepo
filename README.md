# Thrust AI

Thrust AI is an autonomous DeFi agent platform built on the Sonic Chain, leveraging the ElizaOS framework with OpenAI integration. It enables AI agents to manage user vaults and interact with various DeFi protocols autonomously.

## 🌟 Features

- **AI-Powered Vault Management**: Create and manage secure vaults controlled by AI agents
- **Smart Contract Integration**: Custom contracts for automated DeFi interactions
- **Protocol Integration**:
  - Beets LTS Sonic Staking
  - Silo Lending
- **User-Friendly Interface**: Easy-to-use frontend for deposits and withdrawals
- **Secure Architecture**: Built with viem and Alchemy providers

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/GabrielCartier/noir-monorepo.git

# Navigate to project directory
cd noir-monorepo

# Install dependencies
bun i

# Start the frontend
bun run dev

# In a new terminal, start the backend
cd backend
bun run dev

# Access the application
# Open your browser and navigate to http://localhost:3001
```

## 💡 Custom Prompts

### Staking with Beets LTS
```
I want to stake {amount} SONIC tokens in the Beets LTS pool for maximum yield.
```

### Depositing to Silo
```
Please deposit {amount} {token} into Silo lending for the best lending opportunities.
```

### Withdrawing from Silos
```
Withdraw all my assets from active Silo lending positions.
```

## 🛠 Technology Stack

- **Frontend**: React/Next.js
- **Backend**: Node.js
- **Blockchain Integration**: 
  - Viem
  - Alchemy SDK
- **AI Framework**: ElizaOS with OpenAI
- **Smart Contracts**: Solidity
- **Network**: Sonic Chain

## 🔐 Security

The vault system implements a secure delegation model where:
1. Users maintain ownership of their assets
2. AI agents have limited, revocable permissions
3. All transactions require smart contract validation

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This is experimental software. Use at your own risk. The authors take no responsibility for your usage of this software.
