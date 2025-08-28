#!/bin/bash

echo "🚀 Starting MiniSwap Testnet Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f "contracts/.env" ]; then
    echo -e "${RED}Error: contracts/.env file not found!${NC}"
    echo "Please create a .env file with your private key and RPC URLs."
    echo "You can use contracts/.env.example as a template."
    exit 1
fi

# Load environment variables
source contracts/.env

# Check if required variables are set
if [ -z "$PRIVATE_KEY" ] || [ -z "$SEPOLIA_RPC_URL" ]; then
    echo -e "${RED}Error: Required environment variables not set!${NC}"
    echo "Please ensure PRIVATE_KEY and SEPOLIA_RPC_URL are set in contracts/.env"
    exit 1
fi

echo -e "${YELLOW}Step 1: Installing dependencies...${NC}"

# Install dependencies
cd contracts
npm install

echo -e "${GREEN}✅ Dependencies installed${NC}"

echo -e "${YELLOW}Step 2: Compiling contracts...${NC}"

# Compile contracts
npm run compile

echo -e "${GREEN}✅ Contracts compiled${NC}"

echo -e "${YELLOW}Step 3: Running tests...${NC}"

# Run tests
npm test

if [ $? -ne 0 ]; then
    echo -e "${RED}Tests failed! Aborting deployment.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All tests passed${NC}"

echo -e "${YELLOW}Step 4: Deploying to Sepolia testnet...${NC}"

# Deploy to testnet
npm run deploy:testnet

if [ $? -ne 0 ]; then
    echo -e "${RED}Deployment failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Contracts deployed to Sepolia${NC}"

echo -e "${YELLOW}Step 5: Verifying contracts on Etherscan...${NC}"

# Verify contracts (optional, requires Etherscan API key)
if [ ! -z "$ETHERSCAN_API_KEY" ]; then
    npm run verify
    echo -e "${GREEN}✅ Contracts verified on Etherscan${NC}"
else
    echo -e "${YELLOW}⚠️  Skipping Etherscan verification (no API key provided)${NC}"
fi

cd ..

echo -e "${GREEN}🎉 MiniSwap deployed to Sepolia testnet!${NC}"
echo ""
echo "📍 Deployment details saved to: contracts/deployments/latest.json"
echo ""
echo "Next steps:"
echo "1. Update frontend/.env.production with the deployed contract addresses"
echo "2. Deploy frontend to AWS Amplify"
echo "3. Configure DynamoDB tables in AWS"