# MiniSwap - Production-Ready Uniswap V2 Clone on AWS

A fully-deployed decentralized exchange (DEX) implementing the Uniswap V2 protocol, running on AWS infrastructure with containerized deployment via ECS Fargate, PostgreSQL RDS database, and Application Load Balancer for high availability.

## 🌐 Live Application

**Production URL**: Deployed on AWS ECS with Application Load Balancer  
**Infrastructure**: AWS ECS Fargate, RDS PostgreSQL, ALB, VPC with public/private subnets

## 🏗️ Architecture Overview

```
miniswap/
├── contracts/          # Smart contracts (Hardhat)
│   ├── core/          # Factory & Pair contracts
│   ├── periphery/     # Router contract
│   └── libraries/     # Helper libraries
├── frontend/          # Next.js 14 application
│   ├── components/    # React components
│   ├── lib/          # Database integration
│   └── hooks/        # Custom React hooks
├── infrastructure/    # AWS CDK Infrastructure as Code
│   ├── lib/          # CDK stack definitions
│   └── bin/          # CDK app entry point
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

### Infrastructure (Production-Ready AWS Architecture)

#### **Container Orchestration**
- **AWS ECS Fargate**: Serverless container hosting for the Next.js application
- **Docker**: Multi-stage build for optimized production images (~150MB)
- **ECR**: Private container registry for secure image storage

#### **Database Layer**
- **Amazon RDS PostgreSQL**: Managed relational database in private subnets
- **AWS Secrets Manager**: Secure database credential management
- **Automatic backups**: 7-day retention with point-in-time recovery

#### **Networking & Security**
- **VPC with Multi-AZ**: High availability across availability zones
- **Public/Private Subnets**: Secure network segmentation
- **NAT Gateway**: Secure outbound internet access for private resources
- **Security Groups**: Granular network access control
- **Application Load Balancer**: HTTPS termination and health checks

#### **Infrastructure as Code**
- **AWS CDK (TypeScript)**: Reproducible infrastructure deployment
- **CloudFormation**: Managed stack updates and rollbacks
- **Environment Isolation**: Separate stacks for dev/staging/production

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

### AWS Production Deployment (ECS Fargate with CDK)

#### Prerequisites
- AWS CLI configured with appropriate credentials
- AWS CDK installed: `npm install -g aws-cdk`
- Docker Desktop running

#### Deploy Infrastructure
```bash
# Navigate to infrastructure directory
cd infrastructure

# Install CDK dependencies
npm install

# Bootstrap CDK (first time only)
npm run bootstrap

# Deploy the complete stack
npm run deploy
```

This will provision:
- VPC with public/private subnets across multiple AZs
- RDS PostgreSQL database instance
- ECS cluster with Fargate service
- Application Load Balancer
- ECR repository and push Docker image
- All necessary IAM roles and security groups

#### Docker Image Build & Deploy
The deployment automatically:
1. Builds multi-stage Docker image
2. Pushes to Amazon ECR
3. Updates ECS service with new image
4. Performs health checks before routing traffic

```dockerfile
# Production Dockerfile features:
- Multi-stage build for size optimization
- Non-root user for security
- Health check endpoint
- Environment variable configuration
- Optimized Next.js standalone build
```

#### Access the Application
After deployment, CDK outputs:
- **Application URL**: `http://[ALB-DNS-NAME].elb.amazonaws.com`
- **Database Endpoint**: RDS instance endpoint (private)
- **ECS Cluster**: Cluster name for monitoring

### Testnet Deployment (Sepolia)

1. Configure your `.env` file with testnet credentials
2. Run deployment script:
```bash
./scripts/deploy-testnet.sh
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

## 📊 Database Schema (PostgreSQL on RDS)

### Production Database Configuration
- **Engine**: PostgreSQL 15.x on Amazon RDS
- **Instance Class**: db.t3.micro (burstable performance)
- **Storage**: 20GB SSD with auto-scaling
- **Backup**: Automated daily backups with 7-day retention
- **Security**: Encrypted at rest, SSL/TLS in transit

### Tables Structure

#### Swaps Table
```sql
CREATE TABLE swaps (
    id UUID PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL,
    token_in VARCHAR(42) NOT NULL,
    token_out VARCHAR(42) NOT NULL,
    amount_in DECIMAL(78, 18),
    amount_out DECIMAL(78, 18),
    tx_hash VARCHAR(66) UNIQUE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_user_timestamp (user_address, timestamp)
);
```

#### Liquidity Table
```sql
CREATE TABLE liquidity (
    id UUID PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL,
    pool_address VARCHAR(42) NOT NULL,
    token0 VARCHAR(42) NOT NULL,
    token1 VARCHAR(42) NOT NULL,
    amount0 DECIMAL(78, 18),
    amount1 DECIMAL(78, 18),
    lp_tokens DECIMAL(78, 18),
    action VARCHAR(10),
    tx_hash VARCHAR(66) UNIQUE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_user_timestamp (user_address, timestamp)
);
```

#### Pools Table
```sql
CREATE TABLE pools (
    pool_address VARCHAR(42) PRIMARY KEY,
    token0 VARCHAR(42) NOT NULL,
    token1 VARCHAR(42) NOT NULL,
    reserve0 DECIMAL(78, 18),
    reserve1 DECIMAL(78, 18),
    total_supply DECIMAL(78, 18),
    last_updated TIMESTAMPTZ DEFAULT NOW()
);
```

## 🔧 Development Workflow

### Adding a New Feature
1. Create feature branch: `git checkout -b feature/your-feature`
2. Implement smart contract changes
3. Write tests for contracts
4. Update frontend components
5. Test locally with Docker
6. Submit pull request

### Infrastructure Updates
1. Modify CDK stack in `infrastructure/lib/`
2. Run `npm run diff` to preview changes
3. Deploy to staging: `npm run deploy -- --context env=staging`
4. Test thoroughly
5. Deploy to production: `npm run deploy -- --context env=production`

### Monitoring Production
- **ECS Console**: Monitor service health and logs
- **RDS Console**: Database metrics and performance
- **ALB Target Groups**: Health check status
- **CloudWatch Logs**: Application and container logs

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

### Blockchain & Smart Contracts
- **Solidity 0.8.20**: Smart contract development
- **Hardhat**: Ethereum development framework
- **OpenZeppelin**: Security-audited contract libraries

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Wagmi/Viem**: Ethereum interactions
- **Rainbow Kit**: Wallet connection
- **Tailwind CSS**: Utility-first CSS
- **React Query**: Data fetching and caching

### AWS Cloud Infrastructure
- **Amazon ECS Fargate**: Serverless container orchestration
- **Amazon RDS PostgreSQL**: Managed relational database
- **Application Load Balancer**: Traffic distribution and SSL termination
- **Amazon ECR**: Container image registry
- **AWS CDK**: Infrastructure as Code in TypeScript
- **AWS Secrets Manager**: Secure credential storage
- **Amazon VPC**: Network isolation and security

### DevOps & Deployment
- **Docker**: Multi-stage containerization
- **GitHub Actions**: CI/CD pipeline
- **CloudFormation**: Infrastructure state management
- **Health Checks**: Automated monitoring and recovery

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Resources

### Smart Contract Resources
- [Uniswap V2 Documentation](https://docs.uniswap.org/contracts/v2/overview)
- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)

### Frontend Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Wagmi Documentation](https://wagmi.sh)
- [Rainbow Kit Documentation](https://www.rainbowkit.com/docs)

### AWS Resources
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [Amazon ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Amazon RDS PostgreSQL](https://docs.aws.amazon.com/rds/postgresql/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

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
- [x] Deploy to AWS ECS Fargate
- [x] Set up RDS PostgreSQL database
- [x] Configure Application Load Balancer
- [x] Implement AWS CDK Infrastructure as Code
- [ ] Set up CI/CD pipeline with GitHub Actions
- [ ] Add CloudWatch monitoring and alerting
- [ ] Implement API rate limiting
- [ ] Add ElastiCache for Redis caching
- [ ] Configure auto-scaling policies
- [ ] Add custom domain with Route 53
- [ ] Implement WAF for DDoS protection

## 📞 Support

For questions or issues, please open a GitHub issue or reach out to [your-email@example.com]

---

**Disclaimer**: This is a demonstration project for portfolio purposes. The smart contracts are not audited and should not be used in production with real funds.