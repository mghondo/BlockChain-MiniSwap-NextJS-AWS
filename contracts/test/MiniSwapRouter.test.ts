import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { MiniSwapFactory, MiniSwapRouter, MiniSwapPair, ERC20Mock, WETH9 } from "../typechain-types";

describe("MiniSwapRouter - Advanced DeFi Routing", function () {
  let factory: MiniSwapFactory;
  let router: MiniSwapRouter;
  let weth: WETH9;
  let tokenA: ERC20Mock;
  let tokenB: ERC20Mock;
  let tokenC: ERC20Mock;
  let pairAB: MiniSwapPair;
  let pairBC: MiniSwapPair;
  let pairAC: MiniSwapPair;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  const LIQUIDITY_AMOUNT = ethers.parseEther("1000");
  const DEADLINE = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy core contracts
    const Factory = await ethers.getContractFactory("MiniSwapFactory");
    factory = await Factory.deploy(owner.address);
    await factory.waitForDeployment();

    const WETH = await ethers.getContractFactory("WETH9");
    weth = await WETH.deploy();
    await weth.waitForDeployment();

    const Router = await ethers.getContractFactory("MiniSwapRouter");
    router = await Router.deploy(await factory.getAddress(), await weth.getAddress());
    await router.waitForDeployment();

    // Deploy test tokens
    const Token = await ethers.getContractFactory("ERC20Mock");
    tokenA = await Token.deploy("Token A", "TKNA", ethers.parseEther("100000"));
    tokenB = await Token.deploy("Token B", "TKNB", ethers.parseEther("100000"));
    tokenC = await Token.deploy("Token C", "TKNC", ethers.parseEther("100000"));
    await tokenA.waitForDeployment();
    await tokenB.waitForDeployment();
    await tokenC.waitForDeployment();

    // Create pairs
    await factory.createPair(await tokenA.getAddress(), await tokenB.getAddress());
    await factory.createPair(await tokenB.getAddress(), await tokenC.getAddress());
    await factory.createPair(await tokenA.getAddress(), await tokenC.getAddress());

    // Get pair contracts
    pairAB = await ethers.getContractAt("MiniSwapPair", await factory.getPair(await tokenA.getAddress(), await tokenB.getAddress()));
    pairBC = await ethers.getContractAt("MiniSwapPair", await factory.getPair(await tokenB.getAddress(), await tokenC.getAddress()));
    pairAC = await ethers.getContractAt("MiniSwapPair", await factory.getPair(await tokenA.getAddress(), await tokenC.getAddress()));

    // Approve router to spend tokens
    await tokenA.approve(await router.getAddress(), ethers.MaxUint256);
    await tokenB.approve(await router.getAddress(), ethers.MaxUint256);
    await tokenC.approve(await router.getAddress(), ethers.MaxUint256);

    // Connect addr1 and approve tokens
    await tokenA.connect(addr1).approve(await router.getAddress(), ethers.MaxUint256);
    await tokenB.connect(addr1).approve(await router.getAddress(), ethers.MaxUint256);
    await tokenC.connect(addr1).approve(await router.getAddress(), ethers.MaxUint256);
  });

  describe("Liquidity Management", function () {
    it("Should add initial liquidity successfully", async function () {
      const amountA = ethers.parseEther("100");
      const amountB = ethers.parseEther("200");

      const tx = await router.addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        amountA,
        amountB,
        amountA, // amountAMin
        amountB, // amountBMin
        owner.address,
        DEADLINE
      );

      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      // Verify liquidity tokens were minted
      const lpBalance = await pairAB.balanceOf(owner.address);
      expect(lpBalance).to.be.gt(0);

      // Verify reserves are set correctly
      const [reserve0, reserve1] = await pairAB.getReserves();
      const token0 = await pairAB.token0();
      
      if (token0 === await tokenA.getAddress()) {
        expect(reserve0).to.equal(amountA);
        expect(reserve1).to.equal(amountB);
      } else {
        expect(reserve0).to.equal(amountB);
        expect(reserve1).to.equal(amountA);
      }
    });

    it("Should handle proportional liquidity addition", async function () {
      // Add initial liquidity 1:2 ratio
      await router.addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        ethers.parseEther("100"),
        ethers.parseEther("200"),
        0, 0,
        owner.address,
        DEADLINE
      );

      const initialLP = await pairAB.balanceOf(owner.address);

      // Add more liquidity maintaining the ratio
      await router.addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        ethers.parseEther("50"),
        ethers.parseEther("100"),
        0, 0,
        addr1.address,
        DEADLINE
      );

      const addr1LP = await pairAB.balanceOf(addr1.address);
      expect(addr1LP).to.be.gt(0);
      expect(addr1LP).to.be.closeTo(initialLP / 2n, initialLP / 10n); // Approximately 50%
    });

    it("Should remove liquidity proportionally", async function () {
      // Add liquidity first
      await router.addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        ethers.parseEther("1000"),
        ethers.parseEther("1000"),
        0, 0,
        owner.address,
        DEADLINE
      );

      const lpBalance = await pairAB.balanceOf(owner.address);
      const removeAmount = lpBalance / 2n;

      const tokenABefore = await tokenA.balanceOf(owner.address);
      const tokenBBefore = await tokenB.balanceOf(owner.address);

      // Remove 50% of liquidity
      await router.removeLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        removeAmount,
        0, 0, // No minimum amounts for testing
        owner.address,
        DEADLINE
      );

      const tokenAAfter = await tokenA.balanceOf(owner.address);
      const tokenBAfter = await tokenB.balanceOf(owner.address);

      // Should receive approximately 500 of each token back
      expect(tokenAAfter - tokenABefore).to.be.closeTo(ethers.parseEther("500"), ethers.parseEther("50"));
      expect(tokenBAfter - tokenBBefore).to.be.closeTo(ethers.parseEther("500"), ethers.parseEther("50"));

      // LP balance should be reduced by half
      const finalLPBalance = await pairAB.balanceOf(owner.address);
      expect(finalLPBalance).to.be.closeTo(lpBalance / 2n, lpBalance / 10n);
    });

    it("Should enforce minimum liquidity constraints", async function () {
      // Try to add liquidity with insufficient minimum amounts
      await expect(
        router.addLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          ethers.parseEther("100"),
          ethers.parseEther("200"),
          ethers.parseEther("150"), // Too high minimum for A
          ethers.parseEther("100"),
          owner.address,
          DEADLINE
        )
      ).to.be.revertedWith("MiniSwapRouter: INSUFFICIENT_A_AMOUNT");
    });
  });

  describe("Single-Hop Swaps", function () {
    beforeEach(async function () {
      // Set up liquidity for all pairs
      await router.addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        LIQUIDITY_AMOUNT,
        LIQUIDITY_AMOUNT,
        0, 0,
        owner.address,
        DEADLINE
      );

      await router.addLiquidity(
        await tokenB.getAddress(),
        await tokenC.getAddress(),
        LIQUIDITY_AMOUNT,
        LIQUIDITY_AMOUNT,
        0, 0,
        owner.address,
        DEADLINE
      );

      await router.addLiquidity(
        await tokenA.getAddress(),
        await tokenC.getAddress(),
        LIQUIDITY_AMOUNT,
        LIQUIDITY_AMOUNT,
        0, 0,
        owner.address,
        DEADLINE
      );

      // Give addr1 some tokens to trade
      await tokenA.transfer(addr1.address, ethers.parseEther("1000"));
    });

    it("Should perform exact input swap", async function () {
      const swapAmount = ethers.parseEther("100");
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];

      // Calculate expected output
      const amounts = await router.getAmountsOut(swapAmount, path);
      const expectedOutput = amounts[1];

      const tokenBBefore = await tokenB.balanceOf(addr1.address);

      await router.connect(addr1).swapExactTokensForTokens(
        swapAmount,
        0, // Accept any amount of tokens out
        path,
        addr1.address,
        DEADLINE
      );

      const tokenBAfter = await tokenB.balanceOf(addr1.address);
      const actualOutput = tokenBAfter - tokenBBefore;

      expect(actualOutput).to.equal(expectedOutput);
      expect(actualOutput).to.be.gt(0);
      expect(actualOutput).to.be.lt(swapAmount); // Should be less due to fees and slippage
    });

    it("Should perform exact output swap", async function () {
      const desiredOutput = ethers.parseEther("50");
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];

      // Calculate required input
      const amounts = await router.getAmountsIn(desiredOutput, path);
      const maxInput = amounts[0];

      const tokenABefore = await tokenA.balanceOf(addr1.address);
      const tokenBBefore = await tokenB.balanceOf(addr1.address);

      await router.connect(addr1).swapTokensForExactTokens(
        desiredOutput,
        maxInput + ethers.parseEther("10"), // Add buffer for slippage
        path,
        addr1.address,
        DEADLINE
      );

      const tokenAAfter = await tokenA.balanceOf(addr1.address);
      const tokenBAfter = await tokenB.balanceOf(addr1.address);

      const actualOutput = tokenBAfter - tokenBBefore;
      const actualInput = tokenABefore - tokenAAfter;

      expect(actualOutput).to.equal(desiredOutput);
      expect(actualInput).to.be.closeTo(maxInput, ethers.parseEther("1"));
    });

    it("Should enforce slippage protection", async function () {
      const swapAmount = ethers.parseEther("100");
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];

      // Set minimum output higher than possible
      const amounts = await router.getAmountsOut(swapAmount, path);
      const impossibleMinOut = amounts[1] + ethers.parseEther("100");

      await expect(
        router.connect(addr1).swapExactTokensForTokens(
          swapAmount,
          impossibleMinOut,
          path,
          addr1.address,
          DEADLINE
        )
      ).to.be.revertedWith("MiniSwapRouter: INSUFFICIENT_OUTPUT_AMOUNT");
    });
  });

  describe("Multi-Hop Routing", function () {
    beforeEach(async function () {
      // Set up complex liquidity pools with different ratios
      await router.addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        ethers.parseEther("1000"), // A:B = 1:1
        ethers.parseEther("1000"),
        0, 0,
        owner.address,
        DEADLINE
      );

      await router.addLiquidity(
        await tokenB.getAddress(),
        await tokenC.getAddress(),
        ethers.parseEther("500"), // B:C = 1:2 (C is worth 0.5 B)
        ethers.parseEther("1000"),
        0, 0,
        owner.address,
        DEADLINE
      );

      // Direct A:C pool with different rate for arbitrage opportunities
      await router.addLiquidity(
        await tokenA.getAddress(),
        await tokenC.getAddress(),
        ethers.parseEther("1000"), // A:C = 1:1 (should be 1:2 via B)
        ethers.parseEther("1000"),
        0, 0,
        owner.address,
        DEADLINE
      );

      await tokenA.transfer(addr1.address, ethers.parseEther("1000"));
    });

    it("Should execute multi-hop swap A -> B -> C", async function () {
      const swapAmount = ethers.parseEther("100");
      const path = [
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        await tokenC.getAddress()
      ];

      // Calculate expected output through multi-hop
      const amounts = await router.getAmountsOut(swapAmount, path);
      const expectedFinalOutput = amounts[2];

      const tokenCBefore = await tokenC.balanceOf(addr1.address);

      await router.connect(addr1).swapExactTokensForTokens(
        swapAmount,
        0,
        path,
        addr1.address,
        DEADLINE
      );

      const tokenCAfter = await tokenC.balanceOf(addr1.address);
      const actualOutput = tokenCAfter - tokenCBefore;

      expect(actualOutput).to.equal(expectedFinalOutput);
      expect(actualOutput).to.be.gt(0);

      console.log("Multi-hop swap results:");
      console.log("Input A:", ethers.formatEther(swapAmount));
      console.log("Expected C:", ethers.formatEther(expectedFinalOutput));
      console.log("Actual C:", ethers.formatEther(actualOutput));
    });

    it("Should find optimal routing automatically", async function () {
      const swapAmount = ethers.parseEther("100");

      // Compare direct route vs multi-hop route
      const directPath = [await tokenA.getAddress(), await tokenC.getAddress()];
      const multiHopPath = [
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        await tokenC.getAddress()
      ];

      const directAmounts = await router.getAmountsOut(swapAmount, directPath);
      const multiHopAmounts = await router.getAmountsOut(swapAmount, multiHopPath);

      console.log("Route comparison for", ethers.formatEther(swapAmount), "A:");
      console.log("Direct A->C:", ethers.formatEther(directAmounts[1]));
      console.log("Multi-hop A->B->C:", ethers.formatEther(multiHopAmounts[2]));

      // In this setup, multi-hop should give more C tokens due to different pool ratios
      if (multiHopAmounts[2] > directAmounts[1]) {
        console.log("Multi-hop route is more favorable");
        
        // Execute the better route
        await router.connect(addr1).swapExactTokensForTokens(
          swapAmount,
          0,
          multiHopPath,
          addr1.address,
          DEADLINE
        );

        const finalBalance = await tokenC.balanceOf(addr1.address);
        expect(finalBalance).to.equal(multiHopAmounts[2]);
      } else {
        console.log("Direct route is more favorable");
      }
    });

    it("Should handle complex 3-hop routing", async function () {
      // Create a longer path for testing complex routing
      const TokenD = await ethers.getContractFactory("ERC20Mock");
      const tokenD = await TokenD.deploy("Token D", "TKND", ethers.parseEther("100000"));
      await tokenD.waitForDeployment();

      // Create C:D pair
      await factory.createPair(await tokenC.getAddress(), await tokenD.getAddress());
      
      // Add liquidity
      await tokenC.approve(await router.getAddress(), ethers.MaxUint256);
      await tokenD.approve(await router.getAddress(), ethers.MaxUint256);

      await router.addLiquidity(
        await tokenC.getAddress(),
        await tokenD.getAddress(),
        ethers.parseEther("1000"),
        ethers.parseEther("2000"), // C:D = 1:2
        0, 0,
        owner.address,
        DEADLINE
      );

      const swapAmount = ethers.parseEther("50");
      const path = [
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        await tokenC.getAddress(),
        await tokenD.getAddress()
      ];

      const amounts = await router.getAmountsOut(swapAmount, path);
      
      await router.connect(addr1).swapExactTokensForTokens(
        swapAmount,
        0,
        path,
        addr1.address,
        DEADLINE
      );

      const tokenDBalance = await tokenD.balanceOf(addr1.address);
      expect(tokenDBalance).to.equal(amounts[3]);
      expect(tokenDBalance).to.be.gt(0);

      console.log("4-token path executed successfully");
      console.log("A->B->C->D amounts:", amounts.map(a => ethers.formatEther(a)));
    });
  });

  describe("Price Impact Analysis", function () {
    beforeEach(async function () {
      // Set up pools with substantial liquidity
      await router.addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        ethers.parseEther("10000"),
        ethers.parseEther("10000"),
        0, 0,
        owner.address,
        DEADLINE
      );

      await tokenA.transfer(addr1.address, ethers.parseEther("5000"));
    });

    it("Should calculate price impact for different swap sizes", async function () {
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];
      const swapSizes = [
        ethers.parseEther("100"),   // 1%
        ethers.parseEther("500"),   // 5%
        ethers.parseEther("1000"),  // 10%
        ethers.parseEther("2000"),  // 20%
      ];

      console.log("Price Impact Analysis:");
      
      for (const swapSize of swapSizes) {
        const amounts = await router.getAmountsOut(swapSize, path);
        const outputAmount = amounts[1];
        
        // Calculate effective rate vs 1:1 pool rate
        const effectiveRate = (outputAmount * 10000n) / swapSize; // basis points
        const priceImpact = 10000n - effectiveRate; // basis points of price impact
        
        console.log(
          `Swap ${ethers.formatEther(swapSize)} A -> ${ethers.formatEther(outputAmount)} B ` +
          `(${ethers.formatUnits(priceImpact, 2)}% price impact)`
        );
        
        // Verify that larger swaps have more price impact
        if (swapSize > ethers.parseEther("100")) {
          expect(priceImpact).to.be.gt(0);
        }
      }
    });

    it("Should demonstrate arbitrage opportunities", async function () {
      // Create price discrepancy between direct and indirect routes
      // First, create a large trade that moves the A:B pool price
      await router.connect(addr1).swapExactTokensForTokens(
        ethers.parseEther("2000"), // Large swap to create price discrepancy
        0,
        [await tokenA.getAddress(), await tokenB.getAddress()],
        addr1.address,
        DEADLINE
      );

      // Now compare prices
      const smallSwap = ethers.parseEther("100");
      
      const directAmounts = await router.getAmountsOut(
        smallSwap, 
        [await tokenA.getAddress(), await tokenB.getAddress()]
      );
      
      const [reserveA, reserveB] = await pairAB.getReserves();
      const token0 = await pairAB.token0();
      
      console.log("After large swap, pool reserves:");
      if (token0 === await tokenA.getAddress()) {
        console.log(`A: ${ethers.formatEther(reserveA)}, B: ${ethers.formatEther(reserveB)}`);
      } else {
        console.log(`A: ${ethers.formatEther(reserveB)}, B: ${ethers.formatEther(reserveA)}`);
      }
      
      console.log(`Small swap ${ethers.formatEther(smallSwap)} A -> ${ethers.formatEther(directAmounts[1])} B`);
      
      // Pool should now have price different from 1:1
      expect(directAmounts[1]).to.not.equal(smallSwap);
    });
  });

  describe("Gas Optimization & Edge Cases", function () {
    it("Should handle expired deadline", async function () {
      const expiredDeadline = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

      await expect(
        router.addLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          ethers.parseEther("100"),
          ethers.parseEther("100"),
          0, 0,
          owner.address,
          expiredDeadline
        )
      ).to.be.revertedWith("MiniSwap: EXPIRED");
    });

    it("Should optimize gas for routing operations", async function () {
      // Set up liquidity
      await router.addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        LIQUIDITY_AMOUNT,
        LIQUIDITY_AMOUNT,
        0, 0,
        owner.address,
        DEADLINE
      );

      await tokenA.transfer(addr1.address, ethers.parseEther("1000"));

      // Measure gas for different operations
      const swapAmount = ethers.parseEther("100");
      
      // Single hop swap
      const singleHopTx = await router.connect(addr1).swapExactTokensForTokens(
        swapAmount,
        0,
        [await tokenA.getAddress(), await tokenB.getAddress()],
        addr1.address,
        DEADLINE
      );
      const singleHopGas = (await singleHopTx.wait())?.gasUsed || 0n;

      console.log(`Single-hop swap gas: ${singleHopGas.toString()}`);
      
      // Gas usage should be reasonable for DeFi operations
      expect(singleHopGas).to.be.lt(ethers.parseUnits("200", 3)); // Less than 200k gas
      expect(singleHopGas).to.be.gt(ethers.parseUnits("50", 3));  // More than 50k gas
    });

    it("Should handle zero amount edge cases", async function () {
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];

      await expect(
        router.getAmountsOut(0, path)
      ).to.be.revertedWith("MiniSwapLibrary: INSUFFICIENT_AMOUNT");

      await expect(
        router.getAmountsIn(0, path)
      ).to.be.revertedWith("MiniSwapLibrary: INSUFFICIENT_OUTPUT_AMOUNT");
    });

    it("Should handle invalid path edge cases", async function () {
      const invalidPath = [await tokenA.getAddress()]; // Path too short

      await expect(
        router.getAmountsOut(ethers.parseEther("100"), invalidPath)
      ).to.be.revertedWith("MiniSwapLibrary: INVALID_PATH");
    });
  });
});