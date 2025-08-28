import { ethers } from "hardhat";

async function main() {
  console.log("Testing MiniSwap contract deployment...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  try {
    // Deploy Factory first
    console.log("Deploying Factory...");
    const Factory = await ethers.getContractFactory("MiniSwapFactory");
    const factory = await Factory.deploy(deployer.address);
    await factory.waitForDeployment();
    console.log("✅ Factory deployed to:", await factory.getAddress());

    // Deploy WETH for testing
    console.log("Deploying WETH...");
    const WETH = await ethers.getContractFactory("WETH9");
    const weth = await WETH.deploy();
    await weth.waitForDeployment();
    console.log("✅ WETH deployed to:", await weth.getAddress());

    // Deploy Router
    console.log("Deploying Router...");
    const Router = await ethers.getContractFactory("MiniSwapRouter");
    const router = await Router.deploy(await factory.getAddress(), await weth.getAddress());
    await router.waitForDeployment();
    console.log("✅ Router deployed to:", await router.getAddress());

    console.log("\n🎉 All contracts deployed successfully!");
    console.log("Factory:", await factory.getAddress());
    console.log("WETH:", await weth.getAddress());
    console.log("Router:", await router.getAddress());

    return {
      factory: await factory.getAddress(),
      weth: await weth.getAddress(),
      router: await router.getAddress()
    };

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}

main()
  .then((addresses) => {
    console.log("\n✅ Test deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Test deployment failed:", error);
    process.exit(1);
  });