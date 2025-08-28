#!/bin/bash

echo "🚀 Starting MiniSwap Local Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Installing dependencies...${NC}"

# Install root dependencies
npm install

# Install contract dependencies
cd contracts
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..

echo -e "${GREEN}✅ Dependencies installed${NC}"

echo -e "${YELLOW}Step 2: Starting Docker containers...${NC}"

# Start Docker containers
cd docker
docker-compose down
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 10

cd ..

echo -e "${GREEN}✅ Docker containers started${NC}"

echo -e "${YELLOW}Step 3: Setting up DynamoDB tables...${NC}"

# Create DynamoDB tables
node scripts/setup-dynamodb-tables.js

echo -e "${GREEN}✅ DynamoDB tables created${NC}"

echo -e "${YELLOW}Step 4: Deploying smart contracts...${NC}"

# Deploy contracts to local node
cd contracts
npm run deploy:local

cd ..

echo -e "${GREEN}✅ Smart contracts deployed${NC}"

echo -e "${GREEN}🎉 MiniSwap is now running locally!${NC}"
echo ""
echo "📍 Access points:"
echo "   Frontend:        http://localhost:3000"
echo "   Hardhat Node:    http://localhost:8545"
echo "   DynamoDB:        http://localhost:8000"
echo "   DynamoDB Admin:  http://localhost:8001"
echo ""
echo "To stop all services, run: npm run docker:down"