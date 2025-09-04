import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
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

    // CloudWatch Log Group for application logs
    const logGroup = new logs.LogGroup(this, `MiniSwapLogGroup-${randomSuffix}`, {
      logGroupName: `/aws/ecs/miniswap-${randomSuffix}`,
      retention: logs.RetentionDays.ONE_WEEK, // Cost-effective log retention
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // Fargate Task Definition for React application
    const taskDefinition = new ecs.FargateTaskDefinition(this, `MiniSwapTaskDef-${randomSuffix}`, {
      family: `miniswap-task-${randomSuffix}`,
      cpu: 256, // Minimal CPU for cost efficiency (0.25 vCPU)
      memoryLimitMiB: 512, // Minimal memory (0.5 GB)
    });

    // Container definition for React app
    const container = taskDefinition.addContainer(`MiniSwapContainer-${randomSuffix}`, {
      containerName: `miniswap-app-${randomSuffix}`,
      image: ecs.ContainerImage.fromAsset('../frontend'), // Build from local React app
      environment: {
        NODE_ENV: 'production',
        PORT: '3000'
      },
      secrets: {
        // Connect to existing database secret - we'll construct DATABASE_URL from components
        DB_HOST: ecs.Secret.fromSecretsManager(dbSecret, 'host'),
        DB_USER: ecs.Secret.fromSecretsManager(dbSecret, 'username'), 
        DB_PASSWORD: ecs.Secret.fromSecretsManager(dbSecret, 'password'),
        DB_NAME: ecs.Secret.fromSecretsManager(dbSecret, 'dbname'),
        DB_PORT: ecs.Secret.fromSecretsManager(dbSecret, 'port')
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'miniswap',
        logGroup
      }),
      portMappings: [{
        containerPort: 3000,
        protocol: ecs.Protocol.TCP
      }]
    });

    // Security group for Fargate service
    const fargateSecurityGroup = new ec2.SecurityGroup(this, `MiniSwapFargateSecurityGroup-${randomSuffix}`, {
      vpc,
      securityGroupName: `miniswap-fargate-sg-${randomSuffix}`,
      description: 'Security group for MiniSwap Fargate service',
      allowAllOutbound: true
    });

    // Security group for Application Load Balancer
    const albSecurityGroup = new ec2.SecurityGroup(this, `MiniSwapALBSecurityGroup-${randomSuffix}`, {
      vpc,
      securityGroupName: `miniswap-alb-sg-${randomSuffix}`,
      description: 'Security group for MiniSwap Application Load Balancer',
      allowAllOutbound: true
    });

    // Allow HTTP traffic from internet to ALB
    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP traffic from internet'
    );

    // Allow ALB to communicate with Fargate on port 3000
    fargateSecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(3000),
      'Allow ALB to access Fargate service'
    );

    // Application Load Balancer
    const alb = new elbv2.ApplicationLoadBalancer(this, `MiniSwapALB-${randomSuffix}`, {
      vpc,
      loadBalancerName: `miniswap-alb-${randomSuffix}`,
      internetFacing: true,
      securityGroup: albSecurityGroup,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC
      }
    });

    // Target group for Fargate service
    const targetGroup = new elbv2.ApplicationTargetGroup(this, `MiniSwapTargetGroup-${randomSuffix}`, {
      vpc,
      targetGroupName: `miniswap-tg-${randomSuffix}`,
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: '/api/health',
        protocol: elbv2.Protocol.HTTP,
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
        timeout: cdk.Duration.seconds(10),
        interval: cdk.Duration.seconds(30)
      }
    });

    // ALB Listener
    const listener = alb.addListener(`MiniSwapListener-${randomSuffix}`, {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      defaultTargetGroups: [targetGroup]
    });

    // Fargate Service
    const fargateService = new ecs.FargateService(this, `MiniSwapFargateService-${randomSuffix}`, {
      cluster,
      serviceName: `miniswap-service-${randomSuffix}`,
      taskDefinition,
      desiredCount: 1, // Start with 1 instance for cost efficiency
      assignPublicIp: false, // Service runs in private subnets
      securityGroups: [fargateSecurityGroup],
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      }
    });

    // Register Fargate service with target group
    fargateService.attachToApplicationTargetGroup(targetGroup);

    // Allow Fargate service to connect to database
    dbSecurityGroup.addIngressRule(
      fargateSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow Fargate service to access PostgreSQL database'
    );

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

    new cdk.CfnOutput(this, `TaskDefinitionArn-${randomSuffix}`, {
      value: taskDefinition.taskDefinitionArn,
      description: 'Fargate Task Definition ARN',
      exportName: `MiniSwap-TaskDef-${randomSuffix}`
    });

    new cdk.CfnOutput(this, `LogGroupName-${randomSuffix}`, {
      value: logGroup.logGroupName,
      description: 'CloudWatch Log Group Name',
      exportName: `MiniSwap-LogGroup-${randomSuffix}`
    });

    new cdk.CfnOutput(this, `LoadBalancerDNS-${randomSuffix}`, {
      value: alb.loadBalancerDnsName,
      description: 'Application Load Balancer DNS Name',
      exportName: `MiniSwap-ALB-DNS-${randomSuffix}`
    });

    new cdk.CfnOutput(this, `ServiceName-${randomSuffix}`, {
      value: fargateService.serviceName,
      description: 'ECS Fargate Service Name',
      exportName: `MiniSwap-Service-${randomSuffix}`
    });

    new cdk.CfnOutput(this, `ApplicationURL-${randomSuffix}`, {
      value: `http://${alb.loadBalancerDnsName}`,
      description: 'Application URL'
    });

    new cdk.CfnOutput(this, `RandomSuffix`, {
      value: randomSuffix,
      description: 'Random suffix used for resource names'
    });
  }
}