import { db } from '../database';

export interface User {
  id: number;
  wallet_address: string;
  created_at: Date;
}

export class UserRepository {
  async findOrCreateUser(walletAddress: string): Promise<User> {
    const existingUser = await db.query(
      'SELECT * FROM users WHERE wallet_address = $1',
      [walletAddress.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return existingUser.rows[0];
    }

    const newUser = await db.query(
      'INSERT INTO users (wallet_address) VALUES ($1) RETURNING *',
      [walletAddress.toLowerCase()]
    );

    return newUser.rows[0];
  }

  async getUserTransactionStats(userId: number) {
    const query = `
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as transactions_7d,
        AVG(slippage_percent) as avg_slippage,
        SUM(amount_in * price_ratio) as total_volume_estimate
      FROM transactions 
      WHERE user_id = $1
    `;
    
    const result = await db.query(query, [userId]);
    return result.rows[0];
  }
}