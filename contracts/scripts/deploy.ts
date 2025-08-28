import { ethers } from "hardhat";

async function main() {
  console.log("Deploying MiniSwap contracts...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy Factory
  const Factory = await ethers.getContractFactory("MiniSwapFactory");
  const factory = await Factory.deploy(deployer.address);
  await factory.waitForDeployment();
  console.log("Factory deployed to:", await factory.getAddress());

  // Deploy WETH (for testing)
  // TODO: Replace with actual WETH address on mainnet/testnet
  const WETH = await ethers.getContractFactory("WETH9");
  const weth = await WETH.deploy();
  await weth.waitForDeployment();
  console.log("WETH deployed to:", await weth.getAddress());

  // Deploy Router
  const Router = await ethers.getContractFactory("MiniSwapRouter");
  const router = await Router.deploy(await factory.getAddress(), await weth.getAddress());
  await router.waitForDeployment();
  console.log("Router deployed to:", await router.getAddress());

  // Save deployment addresses
  const fs = require("fs");
  const deploymentData = {
    factory: await factory.getAddress(),
    router: await router.getAddress(),
    weth: await weth.getAddress(),
    deployer: deployer.address,
    network: (await ethers.provider.getNetwork()).name,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(
    "./deployments/latest.json",
    JSON.stringify(deploymentData, null, 2)
  );

  console.log("\nDeployment complete!");
  console.log("Deployment data saved to ./deployments/latest.json");

  return deploymentData;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });