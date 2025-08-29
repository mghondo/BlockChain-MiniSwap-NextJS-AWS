# MiniSwap Infrastructure Setup

## Local Development Testing

### Prerequisites
- Docker and Docker Compose installed
- Node.js 18+ for CDK deployment

### Test Containerized App Locally
```bash
# Build and run the containerized application
docker-compose up --build

# Application will be available at http://localhost:3000
# PostgreSQL will be available at localhost:5432
```

### Stop Services
```bash
docker-compose down
```

## AWS Deployment

### Prerequisites
1. AWS CLI configured with appropriate credentials
2. CDK CLI installed: `npm install -g aws-cdk`

### Deploy Infrastructure
```bash
# Navigate to infrastructure directory
cd infrastructure

# Install dependencies
npm install

# Bootstrap CDK (first time only)
cdk bootstrap

# Deploy the stack
cdk deploy
```

### Database Migration
After infrastructure is deployed:

```bash
# Navigate to database directory
cd database

# Install dependencies
npm install

# Set environment variables for RDS connection
export DB_HOST="your-rds-endpoint"
export DB_USER="miniswap_admin"
export DB_PASSWORD="password-from-secrets-manager"
export DB_NAME="miniswap"
export NODE_ENV="production"

# Test connection
npm run test

# Run migration
npm run migrate
```

### Environment Variables for Production
The ECS service will automatically receive database credentials from AWS Secrets Manager. You only need to set:

- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `NEXT_PUBLIC_ALCHEMY_ID`
- `NEXT_PUBLIC_CHAIN_ID` (11155111 for Sepolia)

### Cost Optimization Features
- Single AZ deployment
- db.t3.micro RDS instance
- Minimal ECS task resources (256 CPU, 512 MB)
- Limited auto-scaling (1-3 tasks)
- 7-day log retention

### Cleanup
```bash
# Destroy the entire stack
cd infrastructure
cdk destroy
```