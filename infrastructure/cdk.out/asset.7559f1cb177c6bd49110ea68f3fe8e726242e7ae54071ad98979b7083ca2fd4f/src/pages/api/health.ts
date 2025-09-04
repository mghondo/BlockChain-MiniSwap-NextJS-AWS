import type { NextApiRequest, NextApiResponse } from 'next';
import { checkDatabaseConnection } from '../../lib/database';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const timestamp = new Date().toISOString();
  
  try {
    // Test database connection
    const dbHealthy = await checkDatabaseConnection();
    
    if (dbHealthy) {
      res.status(200).json({ 
        status: 'healthy', 
        timestamp,
        database: 'connected',
        environment: process.env.NODE_ENV,
        dbHost: process.env.DB_HOST?.replace(/\..+/, '.***') // Partially hide host for security
      });
    } else {
      res.status(503).json({ 
        status: 'unhealthy', 
        timestamp,
        database: 'disconnected',
        environment: process.env.NODE_ENV 
      });
    }
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({ 
      status: 'error', 
      timestamp,
      database: 'error',
      environment: process.env.NODE_ENV,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}