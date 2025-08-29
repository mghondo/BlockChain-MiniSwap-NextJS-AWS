import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export class MiniSwapStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Use default VPC to keep costs down
    const vpc = ec2.Vpc.fromLookup(this, 'DefaultVPC', {
      isDefault: true
    });

    // Create database credentials secret
    const dbSecret = new secretsmanager.Secret(this, 'MiniSwapDBSecret', {
      description: 'MiniSwap PostgreSQL credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'miniswap_admin' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\'
      }
    });

    // RDS PostgreSQL instance - single AZ for cost efficiency
    const database = new rds.DatabaseInstance(this, 'MiniSwapDB', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_4
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO),
      credentials: rds.Credentials.fromSecret(dbSecret),
      vpc,
      databaseName: 'miniswap',
      multiAz: false, // Single AZ for cost savings
      allocatedStorage: 20, // Minimum storage
      storageEncrypted: true,
      backupRetention: cdk.Duration.days(7),
      deletionProtection: false, // Allow easy cleanup for portfolio project
      removalPolicy: cdk.RemovalPolicy.DESTROY // Clean removal for portfolio project
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'MiniSwapCluster', {
      vpc,
      clusterName: 'miniswap-cluster'
    });

    // CloudWatch Log Group
    const logGroup = new logs.LogGroup(this, 'MiniSwapLogGroup', {
      logGroupName: '/aws/ecs/miniswap',
      retention: logs.RetentionDays.ONE_WEEK, // Cost-effective log retention
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // Fargate service with ALB
    const fargateService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'MiniSwapService', {
      cluster,
      serviceName: 'miniswap-service',
      cpu: 256, // Minimal CPU for cost efficiency
      memoryLimitMiB: 512, // Minimal memory
      desiredCount: 1, // Start with single instance
      taskImageOptions: {
        image: ecs.ContainerImage.fromAsset('../frontend'), // Build from local Dockerfile
        containerPort: 3000,
        environment: {
          NODE_ENV: 'production',
          PORT: '3000'
        },
        secrets: {
          DB_HOST: ecs.Secret.fromSecretsManager(dbSecret, 'host'),
          DB_USER: ecs.Secret.fromSecretsManager(dbSecret, 'username'),
          DB_PASSWORD: ecs.Secret.fromSecretsManager(dbSecret, 'password'),
          DB_NAME: ecs.Secret.fromSecretsManager(dbSecret, 'dbname')
        },
        logDriver: ecs.LogDrivers.awsLogs({
          streamPrefix: 'miniswap',
          logGroup
        })
      },
      publicLoadBalancer: true,
      healthCheckGracePeriod: cdk.Duration.seconds(60)
    });

    // Auto scaling - keep minimal for portfolio project
    const scalableTarget = fargateService.service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 3 // Limited scaling to control costs
    });

    scalableTarget.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70
    });

    // Allow ECS tasks to connect to RDS
    database.connections.allowDefaultPortFrom(fargateService.service);

    // Add database endpoint to secrets manager
    new secretsmanager.SecretTargetAttachment(this, 'DBSecretAttachment', {
      secret: dbSecret,
      target: database
    });

    // Outputs
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: fargateService.loadBalancer.loadBalancerDnsName,
      description: 'Load Balancer DNS Name'
    });

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: database.instanceEndpoint.hostname,
      description: 'RDS Database Endpoint'
    });
  }
}