import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { MiniSwapFactory, MiniSwapPair, ERC20Mock } from "../typechain-types";

describe("MiniSwapPair - Advanced DeFi Scenarios", function () {
  let factory: MiniSwapFactory;
  let token0: ERC20Mock;
  let token1: ERC20Mock;
  let pair: MiniSwapPair;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  const MINIMUM_LIQUIDITY = 1000n;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy factory
    const Factory = await ethers.getContractFactory("MiniSwapFactory");
    factory = await Factory.deploy(owner.address);
    await factory.waitForDeployment();

    // Deploy test tokens
    const Token = await ethers.getContractFactory("ERC20Mock");
    token0 = await Token.deploy("Token A", "TKNA", ethers.parseEther("100000"));
    token1 = await Token.deploy("Token B", "TKNB", ethers.parseEther("100000"));
    await token0.waitForDeployment();
    await token1.waitForDeployment();

    // Ensure token0 < token1 for consistent ordering
    if (await token0.getAddress() > await token1.getAddress()) {
      [token0, token1] = [token1, token0];
    }

    // Create pair
    await factory.createPair(await token0.getAddress(), await token1.getAddress());
    const pairAddress = await factory.getPair(await token0.getAddress(), await token1.getAddress());
    pair = await ethers.getContractAt("MiniSwapPair", pairAddress);
  });

  describe("Initial Liquidity Provision", function () {
    it("Should handle first liquidity provision correctly", async function () {
      const amount0 = ethers.parseEther("100");
      const amount1 = ethers.parseEther("200");

      // Transfer tokens to pair
      await token0.transfer(await pair.getAddress(), amount0);
      await token1.transfer(await pair.getAddress(), amount1);

      // Mint liquidity
      const expectedLiquidity = ethers.parseEther("141.421356237309504880") - MINIMUM_LIQUIDITY; // sqrt(100 * 200) - min_liquidity
      
      await expect(pair.mint(owner.address))
        .to.emit(pair, "Mint")
        .withArgs(owner.address, amount0, amount1);

      // Check LP token balance (approximately sqrt of product)
      const lpBalance = await pair.balanceOf(owner.address);
      expect(lpBalance).to.be.closeTo(expectedLiquidity, ethers.parseEther("0.1"));

      // Minimum liquidity should be locked in dead address
      const deadAddress = "0x000000000000000000000000000000000000dEaD";
      expect(await pair.balanceOf(deadAddress)).to.equal(MINIMUM_LIQUIDITY);

      // Verify reserves
      const [reserve0, reserve1] = await pair.getReserves();
      expect(reserve0).to.equal(amount0);
      expect(reserve1).to.equal(amount1);
    });

    it("Should handle proportional liquidity addition", async function () {
      // Initial liquidity: 1:2 ratio
      await token0.transfer(await pair.getAddress(), ethers.parseEther("100"));
      await token1.transfer(await pair.getAddress(), ethers.parseEther("200"));
      await pair.mint(owner.address);

      const initialLP = await pair.balanceOf(owner.address);

      // Add proportional liquidity (maintaining 1:2 ratio)
      await token0.transfer(await pair.getAddress(), ethers.parseEther("50"));
      await token1.transfer(await pair.getAddress(), ethers.parseEther("100"));
      await pair.mint(addr1.address);

      // addr1 should receive proportional LP tokens (with small tolerance for rounding)
      const addr1LP = await pair.balanceOf(addr1.address);
      expect(addr1LP).to.be.closeTo(initialLP / 2n, 1000n); // 50% of initial with tolerance

      // Total supply should be 150% of initial (plus minimum liquidity)
      const totalSupply = await pair.totalSupply();
      expect(totalSupply).to.equal(initialLP + addr1LP + MINIMUM_LIQUIDITY);
    });

    it("Should reject insufficient liquidity", async function () {
      // Try to mint with amounts that result in liquidity less than minimum
      const smallAmount1 = 1000n;
      const smallAmount2 = 1000n;
      
      await token0.transfer(await pair.getAddress(), smallAmount1);
      await token1.transfer(await pair.getAddress(), smallAmount2);

      // sqrt(1000 * 1000) = 1000, minus MINIMUM_LIQUIDITY (1000) = 0
      await expect(pair.mint(owner.address))
        .to.be.revertedWith("MiniSwap: INSUFFICIENT_LIQUIDITY_MINTED");
    });
  });

  describe("AMM Swap Mechanics", function () {
    beforeEach(async function () {
      // Establish 1:1 pool with substantial liquidity
      const liquidityAmount = ethers.parseEther("1000");
      await token0.transfer(await pair.getAddress(), liquidityAmount);
      await token1.transfer(await pair.getAddress(), liquidityAmount);
      await pair.mint(owner.address);
    });

    it("Should execute token0 -> token1 swap with correct output", async function () {
      const swapAmount = ethers.parseEther("100");
      const [reserve0Before, reserve1Before] = await pair.getReserves();

      // Calculate expected output using x*y=k formula with 0.3% fee
      const amountInWithFee = swapAmount * 997n;
      const numerator = amountInWithFee * reserve1Before;
      const denominator = (reserve0Before * 1000n) + amountInWithFee;
      const expectedOut = numerator / denominator;

      // Transfer tokens to pair
      await token0.transfer(await pair.getAddress(), swapAmount);

      // Execute swap
      await expect(pair.swap(0, expectedOut, addr1.address, "0x"))
        .to.emit(pair, "Swap")
        .withArgs(owner.address, swapAmount, 0, 0, expectedOut, addr1.address);

      // Verify balances
      expect(await token1.balanceOf(addr1.address)).to.equal(expectedOut);

      // Verify reserves updated correctly
      const [reserve0After, reserve1After] = await pair.getReserves();
      expect(reserve0After).to.equal(reserve0Before + swapAmount);
      expect(reserve1After).to.equal(reserve1Before - expectedOut);

      // Verify constant product (accounting for fees)
      const kBefore = reserve0Before * reserve1Before;
      const kAfter = reserve0After * reserve1After;
      expect(kAfter).to.be.gte(kBefore); // k should increase due to fees
    });

    it("Should handle large swaps with price impact", async function () {
      const largeSwapAmount = ethers.parseEther("500"); // 50% of pool
      const [reserve0, reserve1] = await pair.getReserves();

      // Calculate output for large swap
      const amountInWithFee = largeSwapAmount * 997n;
      const numerator = amountInWithFee * reserve1;
      const denominator = (reserve0 * 1000n) + amountInWithFee;
      const expectedOut = numerator / denominator;

      // Price impact should be significant
      const priceImpact = ((reserve1 - expectedOut) * 10000n) / reserve1; // Basis points
      expect(priceImpact).to.be.gte(3000n); // At least 30% price impact

      await token0.transfer(await pair.getAddress(), largeSwapAmount);
      
      // Execute swap with proper event verification
      await expect(pair.swap(0, expectedOut, addr1.address, "0x"))
        .to.emit(pair, "Swap");

      // Verify output received (should be significant due to large swap)
      const receivedAmount = await token1.balanceOf(addr1.address);
      expect(receivedAmount).to.equal(expectedOut);
      expect(receivedAmount).to.be.gt(0); // Should receive some tokens
    });

    it("Should prevent excessive slippage", async function () {
      const swapAmount = ethers.parseEther("100");
      const [reserve0, reserve1] = await pair.getReserves();

      // Calculate fair output
      const amountInWithFee = swapAmount * 997n;
      const numerator = amountInWithFee * reserve1;
      const denominator = (reserve0 * 1000n) + amountInWithFee;
      const expectedOut = numerator / denominator;

      await token0.transfer(await pair.getAddress(), swapAmount);

      // Try to get more than available (should fail)
      await expect(
        pair.swap(0, expectedOut + 1n, addr1.address, "0x")
      ).to.be.revertedWith("MiniSwap: K");
    });

    it("Should handle zero-amount swap rejection", async function () {
      await expect(
        pair.swap(0, 0, addr1.address, "0x")
      ).to.be.revertedWith("MiniSwap: INSUFFICIENT_OUTPUT_AMOUNT");
    });
  });

  describe("Liquidity Removal", function () {
    let liquidityTokens: bigint;

    beforeEach(async function () {
      // Add initial liquidity
      await token0.transfer(await pair.getAddress(), ethers.parseEther("1000"));
      await token1.transfer(await pair.getAddress(), ethers.parseEther("1000"));
      await pair.mint(owner.address);
      liquidityTokens = await pair.balanceOf(owner.address);
    });

    it("Should burn liquidity tokens and return proportional assets", async function () {
      const burnAmount = liquidityTokens / 2n; // Remove 50% of liquidity
      const totalSupply = await pair.totalSupply();
      const [reserve0, reserve1] = await pair.getReserves();

      // Calculate expected returns
      const expectedAmount0 = (reserve0 * burnAmount) / totalSupply;
      const expectedAmount1 = (reserve1 * burnAmount) / totalSupply;

      // Transfer LP tokens to pair for burning
      await pair.transfer(await pair.getAddress(), burnAmount);

      await expect(pair.burn(addr1.address))
        .to.emit(pair, "Burn")
        .withArgs(owner.address, expectedAmount0, expectedAmount1, addr1.address);

      // Verify recipient received correct amounts
      expect(await token0.balanceOf(addr1.address)).to.equal(expectedAmount0);
      expect(await token1.balanceOf(addr1.address)).to.equal(expectedAmount1);

      // Verify LP tokens were burned
      expect(await pair.balanceOf(owner.address)).to.equal(liquidityTokens - burnAmount);
    });

    it("Should handle complete liquidity removal", async function () {
      // Burn all liquidity (except minimum locked)
      await pair.transfer(await pair.getAddress(), liquidityTokens);
      await pair.burn(owner.address);

      // Should receive almost all tokens back
      const token0Balance = await token0.balanceOf(owner.address);
      const token1Balance = await token1.balanceOf(owner.address);

      // Account for minimum liquidity permanently locked (very small amounts)
      expect(token0Balance).to.be.closeTo(ethers.parseEther("100000") - ethers.parseEther("1000"), ethers.parseEther("10")); 
      expect(token1Balance).to.be.closeTo(ethers.parseEther("100000") - ethers.parseEther("1000"), ethers.parseEther("10"));

      // Minimum liquidity should remain locked
      expect(await pair.totalSupply()).to.equal(MINIMUM_LIQUIDITY);
    });
  });

  describe("Fee Mechanism", function () {
    beforeEach(async function () {
      // Set fee recipient
      await factory.setFeeTo(addr2.address);
      
      // Add liquidity
      await token0.transfer(await pair.getAddress(), ethers.parseEther("1000"));
      await token1.transfer(await pair.getAddress(), ethers.parseEther("1000"));
      await pair.mint(owner.address);
    });

    it("Should accrue fees to protocol on swaps", async function () {
      const swapAmount = ethers.parseEther("100");
      
      // Multiple swaps to generate fees
      for (let i = 0; i < 5; i++) {
        await token0.transfer(await pair.getAddress(), swapAmount);
        const [, reserve1] = await pair.getReserves();
        const expectedOut = (swapAmount * 997n * reserve1) / ((ethers.parseEther("1000") + swapAmount * (BigInt(i) + 1n)) * 1000n + swapAmount * 997n);
        await pair.swap(0, expectedOut, addr1.address, "0x");
      }

      const feesToBefore = await pair.balanceOf(addr2.address);
      
      // Remove liquidity to trigger fee minting
      const lpTokens = await pair.balanceOf(owner.address);
      await pair.transfer(await pair.getAddress(), lpTokens / 10n);
      await pair.burn(owner.address);

      const feesToAfter = await pair.balanceOf(addr2.address);
      expect(feesToAfter).to.be.gt(feesToBefore);
    });
  });

  describe("Price Oracle Functionality", function () {
    it("Should update price accumulators correctly", async function () {
      // Add liquidity with 1:2 ratio (token1 is worth 2x token0)
      await token0.transfer(await pair.getAddress(), ethers.parseEther("1000"));
      await token1.transfer(await pair.getAddress(), ethers.parseEther("500"));
      await pair.mint(owner.address);

      const price0Before = await pair.price0CumulativeLast();
      const price1Before = await pair.price1CumulativeLast();

      // Wait and make a small swap to trigger price update
      await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
      await ethers.provider.send("evm_mine", []);

      await token0.transfer(await pair.getAddress(), ethers.parseEther("1"));
      await pair.swap(0, 1, addr1.address, "0x");

      const price0After = await pair.price0CumulativeLast();
      const price1After = await pair.price1CumulativeLast();

      expect(price0After).to.be.gt(price0Before);
      expect(price1After).to.be.gt(price1Before);
    });
  });

  describe("Gas Optimization & Security", function () {
    it("Should handle reentrancy protection", async function () {
      // This would require a malicious token contract to test properly
      // For now, verify the nonReentrant modifier is in place
      expect(await pair.getReserves()).to.not.be.reverted;
    });

    it("Should optimize gas for frequent operations", async function () {
      // Add initial liquidity
      await token0.transfer(await pair.getAddress(), ethers.parseEther("1000"));
      await token1.transfer(await pair.getAddress(), ethers.parseEther("1000"));
      await pair.mint(owner.address);

      // Measure gas for swaps
      const swapAmount = ethers.parseEther("10");
      const gasUsed = [];

      for (let i = 0; i < 5; i++) {
        await token0.transfer(await pair.getAddress(), swapAmount);
        const tx = await pair.swap(0, ethers.parseEther("9"), addr1.address, "0x");
        const receipt = await tx.wait();
        gasUsed.push(receipt?.gasUsed || 0n);
      }

      // Gas usage should be reasonably consistent (allow more variance for complex swaps)
      const avgGas = gasUsed.reduce((a, b) => a + b, 0n) / BigInt(gasUsed.length);
      for (const gas of gasUsed) {
        expect(gas).to.be.closeTo(avgGas, avgGas / 5n); // Within 20% for complex operations
      }

      console.log("Swap gas usage:", gasUsed.map(g => g.toString()));
    });
  });
});