import { db } from '../database';

export interface Transaction {
  id: number;
  user_id: number;
  pool_id: number;
  transaction_hash: string;
  transaction_type: string;
  token_in: string;
  token_out: string;
  amount_in: string;
  amount_out: string;
  price_ratio: number;
  slippage_percent: number;
  block_number: bigint;
  created_at: Date;
}

export class TransactionRepository {
  async createTransaction(
    userId: number,
    poolId: number,
    hash: string,
    type: string,
    tokenIn: string,
    tokenOut: string,
    amountIn: string,
    amountOut: string,
    priceRatio: number,
    slippage: number,
    blockNumber: bigint
  ): Promise<Transaction> {
    const query = `
      INSERT INTO transactions 
      (user_id, pool_id, transaction_hash, transaction_type, token_in, token_out, 
       amount_in, amount_out, price_ratio, slippage_percent, block_number) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
      RETURNING *
    `;
    
    const result = await db.query(query, [
      userId, poolId, hash, type, tokenIn.toLowerCase(), tokenOut.toLowerCase(),
      amountIn, amountOut, priceRatio, slippage, blockNumber.toString()
    ]);
    
    return result.rows[0];
  }

  async getRecentTransactions(limit: number = 50): Promise<Transaction[]> {
    const query = `
      SELECT 
        t.*,
        u.wallet_address,
        p.token_a_address,
        p.token_b_address,
        ROW_NUMBER() OVER (ORDER BY t.created_at DESC) as rank
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      JOIN pools p ON t.pool_id = p.id
      ORDER BY t.created_at DESC
      LIMIT $1
    `;
    
    const result = await db.query(query, [limit]);
    return result.rows;
  }

  async getPoolVolumeAnalysis(poolId: number, days: number = 7) {
    const query = `
      SELECT 
        DATE(created_at) as trade_date,
        COUNT(*) as daily_transactions,
        SUM(amount_in * price_ratio) as daily_volume,
        AVG(price_ratio) as avg_price,
        MIN(price_ratio) as min_price,
        MAX(price_ratio) as max_price,
        STDDEV(price_ratio) as price_volatility
      FROM transactions 
      WHERE pool_id = $1 
        AND created_at > NOW() - INTERVAL '${days} days'
        AND transaction_type = 'swap'
      GROUP BY DATE(created_at)
      ORDER BY trade_date DESC
    `;
    
    const result = await db.query(query, [poolId]);
    return result.rows;
  }
}