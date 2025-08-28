# MiniSwap - Uniswap V2 Clone

A portfolio demonstration project implementing a decentralized exchange (DEX) based on the Uniswap V2 protocol. Built with modern Web3 technologies and AWS integration.

## 🏗️ Architecture Overview

```
miniswap/
├── contracts/          # Smart contracts (Hardhat)
│   ├── core/          # Factory & Pair contracts
│   ├── periphery/     # Router contract
│   └── libraries/     # Helper libraries
├── frontend/          # Next.js 14 application
│   ├── components/    # React components
│   ├── lib/          # DynamoDB integration
│   └── hooks/        # Custom React hooks
├── docker/           # Docker configurations
├── scripts/          # Deployment scripts
└── docs/            # Documentation
```

## 🚀 Features

### Smart Contracts
- **Factory Contract**: Creates and manages trading pairs
- **Pair Contract**: Implements AMM logic with constant product formula (x*y=k)
- **Router Contract**: Handles complex swap operations and liquidity management
- **Security Features**: Reentrancy guards, overflow protection

### Frontend
- **Modern UI**: Built with Next.js 14 and TypeScript
- **Wallet Integration**: Rainbow Kit for seamless wallet connectivity
- **Real-time Updates**: React Query for data synchronization
- **Responsive Design**: Tailwind CSS for mobile-first approach

### Infrastructure
- **AWS DynamoDB**: Transaction history and analytics
- **Docker**: Containerized development environment
- **AWS Amplify**: Production deployment ready

## 📋 Prerequisites

- Node.js 18+
- Docker & Docker Compose
- AWS Account (for production)
- MetaMask or compatible Web3 wallet

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/miniswap.git
cd miniswap
```

### 2. Install Dependencies
```bash
npm install
cd contracts && npm install && cd ..
cd frontend && npm install && cd ..
```

### 3. Configure Environment Variables

#### Contracts (.env)
```bash
cp contracts/.env.example contracts/.env
# Edit with your private key and RPC URLs
```

#### Frontend (.env.local)
```bash
cp frontend/.env.production frontend/.env.local
# Edit with your API keys and endpoints
```

#### Docker (.env)
```bash
cp docker/.env.example docker/.env
# Edit with your Docker environment variables
```

## 🏃‍♂️ Quick Start (Local Development)

### Using Docker (Recommended)
```bash
# Start all services with one command
./scripts/deploy-local.sh

# Or manually:
npm run docker:up
npm run setup:tables
npm run deploy:local
```

### Manual Setup
```bash
# Terminal 1: Start Hardhat node
cd contracts
npm run node

# Terminal 2: Deploy contracts
cd contracts
npm run deploy:local

# Terminal 3: Start frontend
cd frontend
npm run dev

# Terminal 4: Start DynamoDB local
docker run -p 8000:8000 amazon/dynamodb-local
```

Access the application at:
- Frontend: http://localhost:3000
- Hardhat RPC: http://localhost:8545
- DynamoDB Admin: http://localhost:8001

## 📦 Deployment

### Testnet Deployment (Sepolia)

1. Configure your `.env` file with testnet credentials
2. Run deployment script:
```bash
./scripts/deploy-testnet.sh
```

### Production Deployment (AWS Amplify)

1. Connect repository to AWS Amplify
2. Configure environment variables in Amplify Console
3. Deploy:
```bash
git push origin main
# Amplify will automatically build and deploy
```

## 🧪 Testing

### Smart Contract Tests
```bash
cd contracts
npm test
npm run coverage  # For coverage report
```

### Frontend Tests
```bash
cd frontend
npm test
npm run test:e2e  # End-to-end tests
```

## 📊 DynamoDB Schema

### Swaps Table
- **Partition Key**: `id` (String)
- **GSI**: `userAddress-timestamp-index`
- **Attributes**: userAddress, tokenIn, tokenOut, amountIn, amountOut, txHash

### Liquidity Table
- **Partition Key**: `id` (String)
- **GSI**: `userAddress-timestamp-index`
- **Attributes**: userAddress, token0, token1, amount0, amount1, lpTokens, action

### Pools Table
- **Partition Key**: `poolAddress` (String)
- **Sort Key**: `timestamp` (Number)
- **Attributes**: token0, token1, reserve0, reserve1, totalSupply

## 🔧 Development Workflow

### Adding a New Feature
1. Create feature branch: `git checkout -b feature/your-feature`
2. Implement smart contract changes
3. Write tests for contracts
4. Update frontend components
5. Test locally with Docker
6. Submit pull request

### Smart Contract Development
```bash
cd contracts
npm run compile      # Compile contracts
npm run test         # Run tests
npm run deploy:local # Deploy to local node
```

### Frontend Development
```bash
cd frontend
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Run linter
```

## 🚨 Important Security Notes

- **Never commit private keys or sensitive data**
- **Always test on testnet before mainnet deployment**
- **Contracts are unaudited - use at your own risk**
- **This is a demonstration project - not production ready**

## 📚 Key Technologies

- **Solidity 0.8.20**: Smart contract development
- **Hardhat**: Ethereum development framework
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Wagmi/Viem**: Ethereum interactions
- **Rainbow Kit**: Wallet connection
- **AWS DynamoDB**: NoSQL database
- **Docker**: Containerization
- **Tailwind CSS**: Utility-first CSS

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Resources

- [Uniswap V2 Documentation](https://docs.uniswap.org/contracts/v2/overview)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [AWS DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/)

## 🐛 Known Issues & TODOs

### Smart Contracts
- [ ] Implement WETH swap functions in Router
- [ ] Add flash loan functionality in Pair contract
- [ ] Implement fee-on-transfer token support
- [ ] Add permit functionality for gasless approvals

### Frontend
- [ ] Implement token selector modal
- [ ] Add transaction history view
- [ ] Implement pool analytics dashboard
- [ ] Add price charts
- [ ] Multi-chain support

### Infrastructure
- [ ] Set up CI/CD pipeline
- [ ] Add monitoring and alerting
- [ ] Implement rate limiting
- [ ] Add caching layer

## 📞 Support

For questions or issues, please open a GitHub issue or reach out to [your-email@example.com]

---

**Disclaimer**: This is a demonstration project for portfolio purposes. The smart contracts are not audited and should not be used in production with real funds.