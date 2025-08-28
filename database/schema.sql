-- MiniSwap Simple Schema - Portfolio Project
-- Clean, straightforward tables for DEX functionality

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trading pools
CREATE TABLE pools (
    id SERIAL PRIMARY KEY,
    token_a_address VARCHAR(42) NOT NULL,
    token_b_address VARCHAR(42) NOT NULL,
    fee_tier INTEGER DEFAULT 3000,
    tvl_usd DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_pool_pair UNIQUE (token_a_address, token_b_address)
);

-- Transaction history
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    pool_id INTEGER REFERENCES pools(id),
    transaction_hash VARCHAR(66) UNIQUE NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    token_in VARCHAR(42),
    token_out VARCHAR(42),
    amount_in DECIMAL(30, 0),
    amount_out DECIMAL(30, 0),
    price_ratio DECIMAL(20, 10),
    slippage_percent DECIMAL(5, 2),
    block_number BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Basic indexes for common queries
CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_pools_tokens ON pools(token_a_address, token_b_address);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_pool ON transactions(pool_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);