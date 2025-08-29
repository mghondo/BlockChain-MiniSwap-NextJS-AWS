const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database migration script for AWS RDS setup
async function runMigration() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'miniswap',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  };

  const pool = new Pool(dbConfig);

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    // Read and execute schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Running database migration...');
    await client.query(schema);
    
    console.log('Migration completed successfully!');
    client.release();
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Test database connection
async function testConnection() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'miniswap',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  };

  const pool = new Pool(dbConfig);

  try {
    console.log('Testing database connection...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    console.log('Connection successful!', result.rows[0]);
    client.release();
  } catch (error) {
    console.error('Connection failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Command line interface
const command = process.argv[2];

if (command === 'migrate') {
  runMigration();
} else if (command === 'test') {
  testConnection();
} else {
  console.log('Usage: node migrate.js [migrate|test]');
  console.log('  migrate - Run database schema migration');
  console.log('  test    - Test database connection');
}