import { ethers } from "hardhat";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

interface DeploymentRecord {
  network: string;
  chainId: number;
  timestamp: string;
  deployer: string;
  factory: string;
  router: string;
  weth: string;
  gasUsed: {
    factory: string;
    router: string;
    weth: string;
    total: string;
  };
  verification: {
    factory: boolean;
    router: boolean;
    weth: boolean;
  };
  txHashes: {
    factory: string;
    router: string;
    weth: string;
  };
}

async function validateEnvironment(): Promise<void> {
  const required = ['SEPOLIA_RPC_URL', 'PRIVATE_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate private key format
  const privateKey = process.env.PRIVATE_KEY!;
  if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
    throw new Error('Invalid private key format. Must be 64-character hex string starting with 0x');
  }

  console.log("✅ Environment validation passed");
}

async function checkNetworkConnection(): Promise<void> {
  try {
    const network = await ethers.provider.getNetwork();
    const blockNumber = await ethers.provider.getBlockNumber();
    
    console.log(`🌐 Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`📦 Current block: ${blockNumber}`);
    
    if (network.chainId !== 11155111n) {
      throw new Error(`Expected Sepolia testnet (chain ID 11155111), got ${network.chainId}`);
    }
  } catch (error) {
    throw new Error(`Network connection failed: ${error}`);
  }
}

async function validateDeployerBalance(): Promise<void> {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  const minBalance = ethers.parseEther("0.1"); // 0.1 ETH minimum

  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);

  if (balance < minBalance) {
    throw new Error(`Insufficient balance. Need at least 0.1 ETH, have ${ethers.formatEther(balance)} ETH`);
  }

  console.log("✅ Deployer balance sufficient");
}

async function estimateDeploymentCosts(): Promise<bigint> {
  console.log("🔍 Estimating deployment costs...");

  const [deployer] = await ethers.getSigners();

  // Estimate factory deployment
  const Factory = await ethers.getContractFactory("MiniSwapFactory");
  const factoryEstimate = await Factory.getDeployTransaction(deployer.address);
  const factoryGas = await ethers.provider.estimateGas(factoryEstimate);

  // Estimate WETH deployment
  const WETH = await ethers.getContractFactory("WETH9");
  const wethEstimate = await WETH.getDeployTransaction();
  const wethGas = await ethers.provider.estimateGas(wethEstimate);

  // Router gas estimate (requires factory address, so we'll use a mock)
  const routerGasEstimate = 2500000n; // Conservative estimate

  const totalGas = factoryGas + wethGas + routerGasEstimate;
  
  // Get current gas price
  const gasPrice = (await ethers.provider.getFeeData()).gasPrice || 0n;
  const totalCost = totalGas * gasPrice;

  console.log(`⛽ Estimated gas usage:`);
  console.log(`   Factory: ${factoryGas.toLocaleString()}`);
  console.log(`   WETH: ${wethGas.toLocaleString()}`);
  console.log(`   Router: ${routerGasEstimate.toLocaleString()}`);
  console.log(`   Total: ${totalGas.toLocaleString()}`);
  console.log(`💸 Estimated cost: ${ethers.formatEther(totalCost)} ETH`);

  return totalCost;
}

async function deployContracts(): Promise<DeploymentRecord> {
  console.log("🚀 Starting secure deployment...");

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const deploymentTimestamp = new Date().toISOString();

  let totalGasUsed = 0n;
  const txHashes: any = {};
  const gasUsed: any = {};

  // Deploy Factory
  console.log("📋 Deploying Factory...");
  const Factory = await ethers.getContractFactory("MiniSwapFactory");
  const factory = await Factory.deploy(deployer.address);
  await factory.waitForDeployment();
  
  const factoryReceipt = await factory.deploymentTransaction()?.wait();
  const factoryGas = factoryReceipt?.gasUsed || 0n;
  totalGasUsed += factoryGas;
  txHashes.factory = factoryReceipt?.hash || "";
  gasUsed.factory = factoryGas.toString();

  console.log(`✅ Factory deployed: ${await factory.getAddress()}`);
  console.log(`   Gas used: ${factoryGas.toLocaleString()}`);

  // Deploy WETH
  console.log("💎 Deploying WETH...");
  const WETH = await ethers.getContractFactory("WETH9");
  const weth = await WETH.deploy();
  await weth.waitForDeployment();

  const wethReceipt = await weth.deploymentTransaction()?.wait();
  const wethGas = wethReceipt?.gasUsed || 0n;
  totalGasUsed += wethGas;
  txHashes.weth = wethReceipt?.hash || "";
  gasUsed.weth = wethGas.toString();

  console.log(`✅ WETH deployed: ${await weth.getAddress()}`);
  console.log(`   Gas used: ${wethGas.toLocaleString()}`);

  // Deploy Router
  console.log("🔀 Deploying Router...");
  const Router = await ethers.getContractFactory("MiniSwapRouter");
  const router = await Router.deploy(
    await factory.getAddress(),
    await weth.getAddress()
  );
  await router.waitForDeployment();

  const routerReceipt = await router.deploymentTransaction()?.wait();
  const routerGas = routerReceipt?.gasUsed || 0n;
  totalGasUsed += routerGas;
  txHashes.router = routerReceipt?.hash || "";
  gasUsed.router = routerGas.toString();
  gasUsed.total = totalGasUsed.toString();

  console.log(`✅ Router deployed: ${await router.getAddress()}`);
  console.log(`   Gas used: ${routerGas.toLocaleString()}`);
  console.log(`📊 Total gas used: ${totalGasUsed.toLocaleString()}`);

  // Create deployment record
  const deploymentRecord: DeploymentRecord = {
    network: network.name,
    chainId: Number(network.chainId),
    timestamp: deploymentTimestamp,
    deployer: deployer.address,
    factory: await factory.getAddress(),
    router: await router.getAddress(),
    weth: await weth.getAddress(),
    gasUsed,
    verification: {
      factory: false,
      router: false,
      weth: false
    },
    txHashes
  };

  return deploymentRecord;
}

async function verifyContracts(deployment: DeploymentRecord): Promise<void> {
  if (!process.env.ETHERSCAN_API_KEY) {
    console.log("⚠️  No Etherscan API key provided, skipping verification");
    return;
  }

  console.log("🔍 Verifying contracts on Etherscan...");

  try {
    // Verify Factory
    console.log("Verifying Factory...");
    await run("verify:verify", {
      address: deployment.factory,
      constructorArguments: [deployment.deployer],
    });
    deployment.verification.factory = true;
    console.log("✅ Factory verified");

    // Verify WETH
    console.log("Verifying WETH...");
    await run("verify:verify", {
      address: deployment.weth,
      constructorArguments: [],
    });
    deployment.verification.weth = true;
    console.log("✅ WETH verified");

    // Verify Router
    console.log("Verifying Router...");
    await run("verify:verify", {
      address: deployment.router,
      constructorArguments: [deployment.factory, deployment.weth],
    });
    deployment.verification.router = true;
    console.log("✅ Router verified");

  } catch (error) {
    console.log(`⚠️  Contract verification failed: ${error}`);
  }
}

async function saveDeploymentRecord(deployment: DeploymentRecord): Promise<void> {
  const deploymentsDir = "./deployments";
  if (!existsSync(deploymentsDir)) {
    mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${deploymentsDir}/sepolia-${timestamp}.json`;
  writeFileSync(filename, JSON.stringify(deployment, null, 2));

  // Save as latest
  const latestFilename = `${deploymentsDir}/sepolia-latest.json`;
  writeFileSync(latestFilename, JSON.stringify(deployment, null, 2));

  console.log(`💾 Deployment record saved:`);
  console.log(`   ${filename}`);
  console.log(`   ${latestFilename}`);
}

async function printSummary(deployment: DeploymentRecord): Promise<void> {
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETED SUCCESSFULLY");
  console.log("=".repeat(60));
  console.log(`📅 Timestamp: ${deployment.timestamp}`);
  console.log(`🌐 Network: ${deployment.network} (${deployment.chainId})`);
  console.log(`👤 Deployer: ${deployment.deployer}`);
  console.log(`⛽ Total Gas: ${BigInt(deployment.gasUsed.total).toLocaleString()}`);
  console.log("");
  console.log("📋 Contract Addresses:");
  console.log(`   Factory: ${deployment.factory}`);
  console.log(`   Router:  ${deployment.router}`);
  console.log(`   WETH:    ${deployment.weth}`);
  console.log("");
  console.log("🔍 Etherscan Links:");
  console.log(`   Factory: https://sepolia.etherscan.io/address/${deployment.factory}`);
  console.log(`   Router:  https://sepolia.etherscan.io/address/${deployment.router}`);
  console.log(`   WETH:    https://sepolia.etherscan.io/address/${deployment.weth}`);
  console.log("");
  console.log("📊 Verification Status:");
  console.log(`   Factory: ${deployment.verification.factory ? '✅' : '❌'}`);
  console.log(`   Router:  ${deployment.verification.router ? '✅' : '❌'}`);
  console.log(`   WETH:    ${deployment.verification.weth ? '✅' : '❌'}`);
  console.log("=".repeat(60));
}

async function main(): Promise<void> {
  try {
    console.log("🔧 MiniSwap Secure Testnet Deployment");
    console.log("=====================================");

    // Pre-deployment validation
    await validateEnvironment();
    await checkNetworkConnection();
    await validateDeployerBalance();
    
    const estimatedCost = await estimateDeploymentCosts();
    
    // Confirm deployment
    console.log("\n⚠️  Ready to deploy. This will use real ETH on Sepolia testnet.");
    
    // Deploy contracts
    const deployment = await deployContracts();
    
    // Verify contracts
    await verifyContracts(deployment);
    
    // Save deployment record
    await saveDeploymentRecord(deployment);
    
    // Print summary
    await printSummary(deployment);
    
    console.log("\n🎯 Next Steps:");
    console.log("1. Update frontend/.env.production with contract addresses");
    console.log("2. Test the deployment with frontend integration");
    console.log("3. Set up monitoring and alerts");
    console.log("4. Prepare for production deployment");

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

// Import run function for verification
const { run } = require("hardhat");

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });