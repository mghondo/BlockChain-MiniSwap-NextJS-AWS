#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MiniSwapStack } from '../lib/miniswap-stack';

const app = new cdk.App();

new MiniSwapStack(app, 'MiniSwapStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
});