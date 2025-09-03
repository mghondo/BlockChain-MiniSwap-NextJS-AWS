#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MiniSwapDatabaseStack } from '../lib/miniswap-database-stack';

const app = new cdk.App();

new MiniSwapDatabaseStack(app, 'MiniSwapDatabaseStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1'
  },
  description: 'MiniSwap Database Infrastructure - VPC + RDS PostgreSQL'
});

app.synth();