import { db } from '../database';

export interface Pool {
  id: number;
  token_a_address: string;
  token_b_address: string;
  fee_tier: number;
  tvl_usd: number;
  created_at: Date;
}

export class PoolRepository {
  async findOrCreatePool(tokenA: string, tokenB: string): Promise<Pool> {
    const [sortedA, sortedB] = tokenA < tokenB ? [tokenA, tokenB] : [tokenB, tokenA];
    
    const existing = await db.query(
      'SELECT * FROM pools WHERE token_a_address = $1 AND token_b_address = $2',
      [sortedA.toLowerCase(), sortedB.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    const newPool = await db.query(
      'INSERT INTO pools (token_a_address, token_b_address) VALUES ($1, $2) RETURNING *',
      [sortedA.toLowerCase(), sortedB.toLowerCase()]
    );

    return newPool.rows[0];
  }

  async getTopPoolsByTVL(limit: number = 20): Promise<Pool[]> {
    const query = `
      SELECT 
        p.*,
        COUNT(t.id) as transaction_count,
        AVG(t.slippage_percent) as avg_slippage
      FROM pools p
      LEFT JOIN transactions t ON p.id = t.pool_id
      GROUP BY p.id
      ORDER BY p.tvl_usd DESC
      LIMIT $1
    `;
    
    const result = await db.query(query, [limit]);
    return result.rows;
  }

  async getPoolPriceChanges(poolId: number) {
    const query = `
      SELECT 
        created_at,
        price_ratio,
        LAG(price_ratio) OVER (ORDER BY created_at) as prev_price,
        (price_ratio - LAG(price_ratio) OVER (ORDER BY created_at)) / LAG(price_ratio) OVER (ORDER BY created_at) * 100 as change_percent
      FROM transactions 
      WHERE pool_id = $1 AND transaction_type = 'swap'
      ORDER BY created_at DESC 
      LIMIT 100
    `;
    
    const result = await db.query(query, [poolId]);
    return result.rows;
  }
}