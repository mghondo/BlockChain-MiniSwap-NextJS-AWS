import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class MiniSwapDatabaseStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Generate random 6-character suffix for unique resource names
    const randomSuffix = Math.random().toString(36).substring(2, 8);

    // Create VPC
    const vpc = new ec2.Vpc(this, `MiniSwapVPC-${randomSuffix}`, {
      vpcName: `miniswap-vpc-${randomSuffix}`,
      maxAzs: 2,
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'private-subnet',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: 'public-subnet',
          subnetType: ec2.SubnetType.PUBLIC,
        }
      ],
      natGateways: 1, // Minimal NAT gateway for cost efficiency
      enableDnsHostnames: true,
      enableDnsSupport: true
    });

    // Database security group
    const dbSecurityGroup = new ec2.SecurityGroup(this, `MiniSwapDBSecurityGroup-${randomSuffix}`, {
      vpc,
      securityGroupName: `miniswap-db-sg-${randomSuffix}`,
      description: 'Security group for MiniSwap PostgreSQL database',
      allowAllOutbound: false
    });

    // Create database credentials secret
    const dbSecret = new secretsmanager.Secret(this, `MiniSwapDBSecret-${randomSuffix}`, {
      secretName: `swapapp-secrets-${randomSuffix}`,
      description: 'MiniSwap PostgreSQL credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'miniswap_admin' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\',
        passwordLength: 16
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // RDS subnet group
    const dbSubnetGroup = new rds.SubnetGroup(this, `MiniSwapDBSubnetGroup-${randomSuffix}`, {
      vpc,
      description: 'Subnet group for MiniSwap database',
      subnetGroupName: `miniswap-db-subnet-group-${randomSuffix}`,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // RDS PostgreSQL instance - minimal configuration
    const database = new rds.DatabaseInstance(this, `MiniSwapDB-${randomSuffix}`, {
      instanceIdentifier: `miniswap-db-${randomSuffix}`,
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_7
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO),
      credentials: rds.Credentials.fromSecret(dbSecret),
      vpc,
      subnetGroup: dbSubnetGroup,
      securityGroups: [dbSecurityGroup],
      databaseName: 'miniswap',
      multiAz: false, // Single AZ for cost savings
      allocatedStorage: 20, // Minimum storage
      maxAllocatedStorage: 100, // Allow some growth
      storageEncrypted: true,
      backupRetention: cdk.Duration.days(7),
      deletionProtection: false, // Allow easy cleanup
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      enablePerformanceInsights: false // Disable for cost savings
    });

    // SecretTargetAttachment removed - will handle connection strings manually

    // ECS Cluster - minimal configuration for containerized apps
    const cluster = new ecs.Cluster(this, `MiniSwapECSCluster-${randomSuffix}`, {
      vpc,
      clusterName: `miniswap-cluster-${randomSuffix}`,
      containerInsights: false // Disable for cost efficiency
    });

    // Outputs with unique names
    new cdk.CfnOutput(this, `VpcId-${randomSuffix}`, {
      value: vpc.vpcId,
      description: 'VPC ID for MiniSwap',
      exportName: `MiniSwap-VPC-${randomSuffix}`
    });

    new cdk.CfnOutput(this, `DatabaseEndpoint-${randomSuffix}`, {
      value: database.instanceEndpoint.hostname,
      description: 'RDS Database Endpoint',
      exportName: `MiniSwap-DB-Endpoint-${randomSuffix}`
    });

    new cdk.CfnOutput(this, `DatabaseSecretArn-${randomSuffix}`, {
      value: dbSecret.secretArn,
      description: 'Database Secret ARN',
      exportName: `MiniSwap-DB-Secret-${randomSuffix}`
    });

    new cdk.CfnOutput(this, `ECSClusterName-${randomSuffix}`, {
      value: cluster.clusterName,
      description: 'ECS Cluster Name',
      exportName: `MiniSwap-ECS-Cluster-${randomSuffix}`
    });

    new cdk.CfnOutput(this, `RandomSuffix`, {
      value: randomSuffix,
      description: 'Random suffix used for resource names'
    });
  }
}