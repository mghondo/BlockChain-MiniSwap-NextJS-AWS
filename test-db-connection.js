const { Client } = require('pg');

async function testDatabaseConnection() {
    const client = new Client({
        host: 'miniswap-db-public-w79gky.ck3we2as6fj6.us-east-1.rds.amazonaws.com',
        port: 5432,
        database: 'miniswap',
        user: 'miniswap_admin',
        password: '8XiE}5W)*87%q>bn',
        ssl: {
            rejectUnauthorized: false // Required for RDS
        }
    });

    try {
        console.log('🔌 Connecting to database...');
        await client.connect();
        console.log('✅ Connected successfully!');

        // Test basic query
        console.log('🧪 Testing basic query...');
        const versionResult = await client.query('SELECT version();');
        console.log('📊 PostgreSQL version:', versionResult.rows[0].version);

        // Create test table
        console.log('🏗️  Creating test table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS test_swaps (
                id SERIAL PRIMARY KEY,
                user_address VARCHAR(42) NOT NULL,
                token_in VARCHAR(42) NOT NULL,
                token_out VARCHAR(42) NOT NULL,
                amount_in DECIMAL(36,18) NOT NULL,
                amount_out DECIMAL(36,18) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Test table created');

        // Insert test data
        console.log('📥 Inserting test data...');
        const insertResult = await client.query(`
            INSERT INTO test_swaps (user_address, token_in, token_out, amount_in, amount_out)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, created_at;
        `, [
            '0x742d35Cc6634C0532925a3b8D93aE5Db',
            '0xA0b86a33E6411d89e91e57B7A5c17F7D6',
            '0xB1c84C6442C8f5D5f29D89e91e57B7A6',
            '1000.0',
            '950.5'
        ]);
        console.log('✅ Test data inserted, ID:', insertResult.rows[0].id);

        // Query test data
        console.log('🔍 Querying test data...');
        const queryResult = await client.query('SELECT * FROM test_swaps ORDER BY created_at DESC LIMIT 5;');
        console.log('📋 Retrieved records:');
        queryResult.rows.forEach((row, index) => {
            console.log(`   ${index + 1}. ID: ${row.id}, User: ${row.user_address}, Amount: ${row.amount_in} → ${row.amount_out}`);
        });

        // Test database info
        console.log('ℹ️  Database info:');
        const dbInfo = await client.query(`
            SELECT 
                current_database() as db_name,
                current_user as current_user,
                inet_server_addr() as server_ip,
                version() as version
        `);
        console.log('   Database:', dbInfo.rows[0].db_name);
        console.log('   User:', dbInfo.rows[0].current_user);
        console.log('   Server IP:', dbInfo.rows[0].server_ip);

        console.log('🎉 All database tests passed!');

    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        if (error.code) {
            console.error('   Error code:', error.code);
        }
        process.exit(1);
    } finally {
        await client.end();
        console.log('🔌 Connection closed');
    }
}

testDatabaseConnection();