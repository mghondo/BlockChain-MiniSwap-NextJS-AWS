const AWS = require('aws-sdk');

// Configure AWS SDK
const dynamodb = new AWS.DynamoDB({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'local',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'local',
});

const tables = [
  {
    TableName: 'miniswap-swaps',
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'userAddress', AttributeType: 'S' },
      { AttributeName: 'timestamp', AttributeType: 'N' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'userAddress-timestamp-index',
        KeySchema: [
          { AttributeName: 'userAddress', KeyType: 'HASH' },
          { AttributeName: 'timestamp', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
      }
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
  },
  {
    TableName: 'miniswap-liquidity',
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'userAddress', AttributeType: 'S' },
      { AttributeName: 'timestamp', AttributeType: 'N' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'userAddress-timestamp-index',
        KeySchema: [
          { AttributeName: 'userAddress', KeyType: 'HASH' },
          { AttributeName: 'timestamp', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
      }
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
  },
  {
    TableName: 'miniswap-pools',
    KeySchema: [
      { AttributeName: 'poolAddress', KeyType: 'HASH' },
      { AttributeName: 'timestamp', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'poolAddress', AttributeType: 'S' },
      { AttributeName: 'timestamp', AttributeType: 'N' }
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
  }
];

async function createTables() {
  console.log('Creating DynamoDB tables...\n');

  for (const tableParams of tables) {
    try {
      await dynamodb.createTable(tableParams).promise();
      console.log(`✅ Created table: ${tableParams.TableName}`);
    } catch (error) {
      if (error.code === 'ResourceInUseException') {
        console.log(`⚠️  Table already exists: ${tableParams.TableName}`);
      } else {
        console.error(`❌ Error creating table ${tableParams.TableName}:`, error);
      }
    }
  }

  console.log('\nTable creation complete!');
}

async function listTables() {
  console.log('\nListing all tables:');
  try {
    const result = await dynamodb.listTables().promise();
    console.log(result.TableNames);
  } catch (error) {
    console.error('Error listing tables:', error);
  }
}

async function main() {
  await createTables();
  await listTables();
}

main().catch(console.error);