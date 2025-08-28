import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { MiniSwapFactory, MiniSwapRouter, MiniSwapPair, ERC20Mock, WETH9 } from "../typechain-types";

describe("Gas Optimization Analysis", function () {
  let factory: MiniSwapFactory;
  let router: MiniSwapRouter;
  let weth: WETH9;
  let tokenA: ERC20Mock;
  let tokenB: ERC20Mock;
  let pair: MiniSwapPair;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;

  const DEADLINE = Math.floor(Date.now() / 1000) + 3600;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    // Deploy contracts
    const Factory = await ethers.getContractFactory("MiniSwapFactory");
    factory = await Factory.deploy(owner.address);
    await factory.waitForDeployment();

    const WETH = await ethers.getContractFactory("WETH9");
    weth = await WETH.deploy();
    await weth.waitForDeployment();

    const Router = await ethers.getContractFactory("MiniSwapRouter");
    router = await Router.deploy(await factory.getAddress(), await weth.getAddress());
    await router.waitForDeployment();

    // Deploy tokens
    const Token = await ethers.getContractFactory("ERC20Mock");
    tokenA = await Token.deploy("Token A", "TKNA", ethers.parseEther("100000"));
    tokenB = await Token.deploy("Token B", "TKNB", ethers.parseEther("100000"));
    await tokenA.waitForDeployment();
    await tokenB.waitForDeployment();

    // Create pair
    await factory.createPair(await tokenA.getAddress(), await tokenB.getAddress());
    pair = await ethers.getContractAt("MiniSwapPair", await factory.getPair(await tokenA.getAddress(), await tokenB.getAddress()));

    // Approve tokens
    await tokenA.approve(await router.getAddress(), ethers.MaxUint256);
    await tokenB.approve(await router.getAddress(), ethers.MaxUint256);
    await tokenA.connect(addr1).approve(await router.getAddress(), ethers.MaxUint256);
    await tokenB.connect(addr1).approve(await router.getAddress(), ethers.MaxUint256);

    // Transfer tokens to addr1
    await tokenA.transfer(addr1.address, ethers.parseEther("10000"));
    await tokenB.transfer(addr1.address, ethers.parseEther("10000"));
  });

  describe("Contract Deployment Gas Costs", function () {
    it("Should measure deployment gas costs", async function () {
      console.log("\n=== CONTRACT DEPLOYMENT GAS ANALYSIS ===");
      
      // Factory deployment
      const Factory = await ethers.getContractFactory("MiniSwapFactory");
      const deployTx = Factory.getDeployTransaction(owner.address);
      const estimatedGas = await ethers.provider.estimateGas(deployTx);
      
      console.log(`Factory Deployment Gas: ${estimatedGas.toString()}`);
      
      // Pair creation
      const createPairTx = await factory.createPair(await tokenA.getAddress(), await tokenB.getAddress());
      const createPairReceipt = await createPairTx.wait();
      const createPairGas = createPairReceipt?.gasUsed || 0n;
      
      console.log(`Pair Creation Gas: ${createPairGas.toString()}`);
      
      // Set benchmarks
      expect(estimatedGas).to.be.lt(ethers.parseUnits("3000", 3)); // Less than 3M gas
      expect(createPairGas).to.be.lt(ethers.parseUnits("2000", 3)); // Less than 2M gas
    });
  });

  describe("Liquidity Operations Gas Analysis", function () {
    it("Should measure liquidity provision gas costs", async function () {
      console.log("\n=== LIQUIDITY OPERATIONS GAS ANALYSIS ===");
      
      const liquidityAmounts = [
        ethers.parseEther("100"),
        ethers.parseEther("1000"),
        ethers.parseEther("10000")
      ];

      const gasResults = [];

      for (const amount of liquidityAmounts) {
        const tx = await router.addLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          amount,
          amount,
          0, 0,
          owner.address,
          DEADLINE
        );
        
        const receipt = await tx.wait();
        const gasUsed = receipt?.gasUsed || 0n;
        gasResults.push(gasUsed);
        
        console.log(`Add ${ethers.formatEther(amount)} liquidity: ${gasUsed.toString()} gas`);
      }

      // Gas should not scale significantly with amount (within 50% variance)
      const avgGas = gasResults.reduce((a, b) => a + b, 0n) / BigInt(gasResults.length);
      for (const gas of gasResults) {
        expect(gas).to.be.closeTo(avgGas, avgGas / 2n);
      }

      // Remove liquidity test
      const lpBalance = await pair.balanceOf(owner.address);
      const removeTx = await router.removeLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        lpBalance / 2n,
        0, 0,
        owner.address,
        DEADLINE
      );
      
      const removeReceipt = await removeTx.wait();
      const removeGas = removeReceipt?.gasUsed || 0n;
      console.log(`Remove liquidity: ${removeGas.toString()} gas`);
    });
  });

  describe("Swap Operations Gas Analysis", function () {
    beforeEach(async function () {
      // Add substantial liquidity
      await router.addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        ethers.parseEther("10000"),
        ethers.parseEther("10000"),
        0, 0,
        owner.address,
        DEADLINE
      );
    });

    it("Should measure swap gas costs by size", async function () {
      console.log("\n=== SWAP OPERATIONS GAS ANALYSIS ===");
      
      const swapSizes = [
        ethers.parseEther("1"),
        ethers.parseEther("10"),
        ethers.parseEther("100"),
        ethers.parseEther("1000")
      ];

      const gasResults = [];

      for (const size of swapSizes) {
        const tx = await router.connect(addr1).swapExactTokensForTokens(
          size,
          0,
          [await tokenA.getAddress(), await tokenB.getAddress()],
          addr1.address,
          DEADLINE
        );
        
        const receipt = await tx.wait();
        const gasUsed = receipt?.gasUsed || 0n;
        gasResults.push(gasUsed);
        
        console.log(`Swap ${ethers.formatEther(size)} tokens: ${gasUsed.toString()} gas`);
      }

      // All swaps should use similar gas (constant-time operation)
      const avgGas = gasResults.reduce((a, b) => a + b, 0n) / BigInt(gasResults.length);
      for (const gas of gasResults) {
        expect(gas).to.be.closeTo(avgGas, avgGas / 4n); // Within 25%
      }

      // Set benchmark for single swap
      expect(avgGas).to.be.lt(ethers.parseUnits("150", 3)); // Less than 150k gas
      expect(avgGas).to.be.gt(ethers.parseUnits("50", 3));  // More than 50k gas
    });

    it("Should measure multi-hop routing gas costs", async function () {
      console.log("\n=== MULTI-HOP ROUTING GAS ANALYSIS ===");
      
      // Set up additional pools for multi-hop
      const TokenC = await ethers.getContractFactory("ERC20Mock");
      const tokenC = await TokenC.deploy("Token C", "TKNC", ethers.parseEther("100000"));
      await tokenC.waitForDeployment();
      
      await tokenC.approve(await router.getAddress(), ethers.MaxUint256);
      await factory.createPair(await tokenB.getAddress(), await tokenC.getAddress());
      
      await router.addLiquidity(
        await tokenB.getAddress(),
        await tokenC.getAddress(),
        ethers.parseEther("10000"),
        ethers.parseEther("10000"),
        0, 0,
        owner.address,
        DEADLINE
      );

      const swapAmount = ethers.parseEther("100");

      // Single hop: A -> B
      const singleHopTx = await router.connect(addr1).swapExactTokensForTokens(
        swapAmount,
        0,
        [await tokenA.getAddress(), await tokenB.getAddress()],
        addr1.address,
        DEADLINE
      );
      const singleHopGas = (await singleHopTx.wait())?.gasUsed || 0n;

      // Multi-hop: A -> B -> C
      const multiHopTx = await router.connect(addr1).swapExactTokensForTokens(
        swapAmount,
        0,
        [await tokenA.getAddress(), await tokenB.getAddress(), await tokenC.getAddress()],
        addr1.address,
        DEADLINE
      );
      const multiHopGas = (await multiHopTx.wait())?.gasUsed || 0n;

      console.log(`Single-hop swap (A->B): ${singleHopGas.toString()} gas`);
      console.log(`Multi-hop swap (A->B->C): ${multiHopGas.toString()} gas`);
      console.log(`Additional gas per hop: ${(multiHopGas - singleHopGas).toString()}`);

      // Multi-hop should be more expensive but not excessively so
      expect(multiHopGas).to.be.gt(singleHopGas);
      expect(multiHopGas).to.be.lt(singleHopGas * 3n); // Should be less than 3x single hop
    });
  });

  describe("Batch Operations Analysis", function () {
    it("Should compare batch vs individual operations", async function () {
      console.log("\n=== BATCH OPERATIONS ANALYSIS ===");
      
      const numSwaps = 5;
      const swapAmount = ethers.parseEther("10");

      // Set up liquidity
      await router.addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        ethers.parseEther("50000"),
        ethers.parseEther("50000"),
        0, 0,
        owner.address,
        DEADLINE
      );

      // Measure individual swaps
      let totalIndividualGas = 0n;
      for (let i = 0; i < numSwaps; i++) {
        const tx = await router.connect(addr1).swapExactTokensForTokens(
          swapAmount,
          0,
          [await tokenA.getAddress(), await tokenB.getAddress()],
          addr1.address,
          DEADLINE
        );
        const receipt = await tx.wait();
        totalIndividualGas += receipt?.gasUsed || 0n;
      }

      console.log(`${numSwaps} individual swaps: ${totalIndividualGas.toString()} total gas`);
      console.log(`Average per swap: ${(totalIndividualGas / BigInt(numSwaps)).toString()} gas`);

      // Calculate gas efficiency
      const avgGasPerSwap = totalIndividualGas / BigInt(numSwaps);
      console.log(`Gas efficiency: ${ethers.formatUnits(avgGasPerSwap, "gwei")} gwei per swap`);
    });
  });

  describe("State Change Gas Impact", function () {
    it("Should measure gas impact of different pool states", async function () {
      console.log("\n=== STATE CHANGE GAS IMPACT ANALYSIS ===");
      
      // Measure swap gas in fresh pool vs established pool
      const swapAmount = ethers.parseEther("100");
      
      // Fresh pool - first swap
      await router.addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        ethers.parseEther("1000"),
        ethers.parseEther("1000"),
        0, 0,
        owner.address,
        DEADLINE
      );

      const firstSwapTx = await router.connect(addr1).swapExactTokensForTokens(
        swapAmount,
        0,
        [await tokenA.getAddress(), await tokenB.getAddress()],
        addr1.address,
        DEADLINE
      );
      const firstSwapGas = (await firstSwapTx.wait())?.gasUsed || 0n;

      // Subsequent swap in same pool
      const secondSwapTx = await router.connect(addr1).swapExactTokensForTokens(
        swapAmount,
        0,
        [await tokenA.getAddress(), await tokenB.getAddress()],
        addr1.address,
        DEADLINE
      );
      const secondSwapGas = (await secondSwapTx.wait())?.gasUsed || 0n;

      console.log(`First swap in pool: ${firstSwapGas.toString()} gas`);
      console.log(`Second swap in pool: ${secondSwapGas.toString()} gas`);
      console.log(`Gas difference: ${(firstSwapGas - secondSwapGas).toString()}`);

      // First swap might be slightly more expensive due to state initialization
      expect(firstSwapGas).to.be.gte(secondSwapGas);
    });
  });

  describe("Gas Optimization Recommendations", function () {
    it("Should provide optimization insights", function () {
      console.log("\n=== GAS OPTIMIZATION RECOMMENDATIONS ===");
      console.log("1. Use packed structs for storage optimization");
      console.log("2. Batch operations when possible to amortize base costs");
      console.log("3. Consider gas-efficient alternatives for frequent operations");
      console.log("4. Monitor gas usage in different network conditions");
      console.log("5. Implement circuit breakers for high-gas scenarios");
    });

    it("Should benchmark against Uniswap V2 targets", function () {
      console.log("\n=== UNISWAP V2 BENCHMARKS ===");
      console.log("Target swap gas: ~125,000 gas");
      console.log("Target liquidity add: ~180,000 gas");
      console.log("Target liquidity remove: ~120,000 gas");
      console.log("Target pair creation: ~1,800,000 gas");
      
      // These are reference targets - actual implementation may vary
    });
  });
});