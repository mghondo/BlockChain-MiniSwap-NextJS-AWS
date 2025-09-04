import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
  endpoint: process.env.NEXT_PUBLIC_DYNAMODB_ENDPOINT || undefined, // For local development
  credentials: process.env.NODE_ENV === 'development' ? {
    accessKeyId: 'local',
    secretAccessKey: 'local',
  } : undefined,
});

const docClient = DynamoDBDocumentClient.from(client);

export interface SwapRecord {
  id: string;
  userAddress: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  timestamp: number;
  txHash: string;
}

export interface LiquidityRecord {
  id: string;
  userAddress: string;
  token0: string;
  token1: string;
  amount0: string;
  amount1: string;
  lpTokens: string;
  action: 'ADD' | 'REMOVE';
  timestamp: number;
  txHash: string;
}

export interface PoolSnapshot {
  poolAddress: string;
  token0: string;
  token1: string;
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  timestamp: number;
}

const TABLES = {
  SWAPS: process.env.NEXT_PUBLIC_SWAPS_TABLE || 'miniswap-swaps',
  LIQUIDITY: process.env.NEXT_PUBLIC_LIQUIDITY_TABLE || 'miniswap-liquidity',
  POOLS: process.env.NEXT_PUBLIC_POOLS_TABLE || 'miniswap-pools',
};

export const dynamoDBService = {
  async saveSwap(swap: SwapRecord) {
    const command = new PutCommand({
      TableName: TABLES.SWAPS,
      Item: swap,
    });

    try {
      await docClient.send(command);
      return { success: true };
    } catch (error) {
      console.error('Error saving swap:', error);
      return { success: false, error };
    }
  },

  async saveLiquidity(liquidity: LiquidityRecord) {
    const command = new PutCommand({
      TableName: TABLES.LIQUIDITY,
      Item: liquidity,
    });

    try {
      await docClient.send(command);
      return { success: true };
    } catch (error) {
      console.error('Error saving liquidity:', error);
      return { success: false, error };
    }
  },

  async savePoolSnapshot(snapshot: PoolSnapshot) {
    const command = new PutCommand({
      TableName: TABLES.POOLS,
      Item: snapshot,
    });

    try {
      await docClient.send(command);
      return { success: true };
    } catch (error) {
      console.error('Error saving pool snapshot:', error);
      return { success: false, error };
    }
  },

  async getUserSwaps(userAddress: string, limit = 50) {
    const command = new QueryCommand({
      TableName: TABLES.SWAPS,
      IndexName: 'userAddress-timestamp-index',
      KeyConditionExpression: 'userAddress = :user',
      ExpressionAttributeValues: {
        ':user': userAddress,
      },
      ScanIndexForward: false,
      Limit: limit,
    });

    try {
      const response = await docClient.send(command);
      return response.Items as SwapRecord[];
    } catch (error) {
      console.error('Error fetching user swaps:', error);
      return [];
    }
  },

  async getUserLiquidity(userAddress: string, limit = 50) {
    const command = new QueryCommand({
      TableName: TABLES.LIQUIDITY,
      IndexName: 'userAddress-timestamp-index',
      KeyConditionExpression: 'userAddress = :user',
      ExpressionAttributeValues: {
        ':user': userAddress,
      },
      ScanIndexForward: false,
      Limit: limit,
    });

    try {
      const response = await docClient.send(command);
      return response.Items as LiquidityRecord[];
    } catch (error) {
      console.error('Error fetching user liquidity:', error);
      return [];
    }
  },

  async getPoolHistory(poolAddress: string, limit = 100) {
    const command = new QueryCommand({
      TableName: TABLES.POOLS,
      KeyConditionExpression: 'poolAddress = :pool',
      ExpressionAttributeValues: {
        ':pool': poolAddress,
      },
      ScanIndexForward: false,
      Limit: limit,
    });

    try {
      const response = await docClient.send(command);
      return response.Items as PoolSnapshot[];
    } catch (error) {
      console.error('Error fetching pool history:', error);
      return [];
    }
  },

  async getRecentSwaps(limit = 20) {
    const command = new ScanCommand({
      TableName: TABLES.SWAPS,
      Limit: limit,
    });

    try {
      const response = await docClient.send(command);
      return (response.Items as SwapRecord[]).sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error fetching recent swaps:', error);
      return [];
    }
  }
};