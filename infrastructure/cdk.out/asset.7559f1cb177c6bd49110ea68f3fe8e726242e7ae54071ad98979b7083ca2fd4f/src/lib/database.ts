import { Pool } from 'pg';

// Database configuration supporting both local and AWS environments
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'miniswap',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // SSL configuration for AWS RDS - enable for remote connections
  ssl: process.env.DB_HOST?.includes('amazonaws.com') ? { rejectUnauthorized: false } : false,
};

const db = new Pool(dbConfig);

// Health check function for container health checks
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = await db.connect();
    await client.query('SELECT NOW()');
    client.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

export { db };