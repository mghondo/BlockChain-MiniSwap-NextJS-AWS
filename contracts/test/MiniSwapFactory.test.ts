import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { MiniSwapFactory, ERC20Mock } from "../typechain-types";

describe("MiniSwapFactory", function () {
  let factory: MiniSwapFactory;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let tokenA: ERC20Mock;
  let tokenB: ERC20Mock;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy factory
    const Factory = await ethers.getContractFactory("MiniSwapFactory");
    factory = await Factory.deploy(owner.address);
    await factory.waitForDeployment();

    // Deploy test tokens
    const Token = await ethers.getContractFactory("ERC20Mock");
    tokenA = await Token.deploy("Token A", "TKNA", ethers.parseEther("10000"));
    tokenB = await Token.deploy("Token B", "TKNB", ethers.parseEther("10000"));
    await tokenA.waitForDeployment();
    await tokenB.waitForDeployment();

    // Ensure token ordering for predictable testing
    if (await tokenA.getAddress() > await tokenB.getAddress()) {
      [tokenA, tokenB] = [tokenB, tokenA];
    }
  });

  describe("Deployment", function () {
    it("Should set the right fee setter", async function () {
      expect(await factory.feeToSetter()).to.equal(owner.address);
    });

    it("Should initialize with empty pairs array", async function () {
      expect(await factory.allPairsLength()).to.equal(0);
    });

    it("Should have no fee recipient initially", async function () {
      expect(await factory.feeTo()).to.equal(ethers.ZeroAddress);
    });
  });

  describe("Pair Creation", function () {
    it("Should create a new pair successfully", async function () {
      const tx = await factory.createPair(
        await tokenA.getAddress(), 
        await tokenB.getAddress()
      );
      
      await expect(tx)
        .to.emit(factory, "PairCreated")
        .withArgs(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          (await factory.allPairs(0)),
          1
        );

      expect(await factory.allPairsLength()).to.equal(1);
      
      const pairAddress = await factory.getPair(
        await tokenA.getAddress(), 
        await tokenB.getAddress()
      );
      expect(pairAddress).to.not.equal(ethers.ZeroAddress);

      // Test bidirectional mapping
      expect(await factory.getPair(
        await tokenB.getAddress(), 
        await tokenA.getAddress()
      )).to.equal(pairAddress);
    });

    it("Should fail to create pair with identical tokens", async function () {
      await expect(
        factory.createPair(await tokenA.getAddress(), await tokenA.getAddress())
      ).to.be.revertedWith("MiniSwap: IDENTICAL_ADDRESSES");
    });

    it("Should fail to create pair with zero address", async function () {
      await expect(
        factory.createPair(ethers.ZeroAddress, await tokenA.getAddress())
      ).to.be.revertedWith("MiniSwap: ZERO_ADDRESS");
      
      await expect(
        factory.createPair(await tokenA.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWith("MiniSwap: ZERO_ADDRESS");
    });

    it("Should fail to create duplicate pair", async function () {
      // Create first pair
      await factory.createPair(await tokenA.getAddress(), await tokenB.getAddress());
      
      // Try to create the same pair again
      await expect(
        factory.createPair(await tokenA.getAddress(), await tokenB.getAddress())
      ).to.be.revertedWith("MiniSwap: PAIR_EXISTS");

      // Try reverse order (should also fail)
      await expect(
        factory.createPair(await tokenB.getAddress(), await tokenA.getAddress())
      ).to.be.revertedWith("MiniSwap: PAIR_EXISTS");
    });

    it("Should maintain correct pair count with multiple pairs", async function () {
      const TokenC = await ethers.getContractFactory("ERC20Mock");
      const tokenC = await TokenC.deploy("Token C", "TKNC", ethers.parseEther("10000"));
      await tokenC.waitForDeployment();

      // Create multiple pairs
      await factory.createPair(await tokenA.getAddress(), await tokenB.getAddress());
      await factory.createPair(await tokenA.getAddress(), await tokenC.getAddress());
      await factory.createPair(await tokenB.getAddress(), await tokenC.getAddress());

      expect(await factory.allPairsLength()).to.equal(3);

      // Verify all pairs are accessible
      const pair1 = await factory.allPairs(0);
      const pair2 = await factory.allPairs(1);
      const pair3 = await factory.allPairs(2);

      expect(pair1).to.not.equal(ethers.ZeroAddress);
      expect(pair2).to.not.equal(ethers.ZeroAddress);
      expect(pair3).to.not.equal(ethers.ZeroAddress);
      
      // All pairs should be unique
      expect(pair1).to.not.equal(pair2);
      expect(pair1).to.not.equal(pair3);
      expect(pair2).to.not.equal(pair3);
    });
  });

  describe("Fee Management", function () {
    it("Should allow fee setter to set fee recipient", async function () {
      await factory.setFeeTo(addr1.address);
      expect(await factory.feeTo()).to.equal(addr1.address);
    });

    it("Should allow fee setter to change fee setter", async function () {
      await factory.setFeeToSetter(addr1.address);
      expect(await factory.feeToSetter()).to.equal(addr1.address);

      // New fee setter should be able to set fees
      await factory.connect(addr1).setFeeTo(addr2.address);
      expect(await factory.feeTo()).to.equal(addr2.address);
    });

    it("Should reject non-fee-setter attempts to set fees", async function () {
      await expect(
        factory.connect(addr1).setFeeTo(addr2.address)
      ).to.be.revertedWith("MiniSwap: FORBIDDEN");

      await expect(
        factory.connect(addr1).setFeeToSetter(addr2.address)
      ).to.be.revertedWith("MiniSwap: FORBIDDEN");
    });
  });

  describe("Gas Optimization Analysis", function () {
    it("Should create pairs with consistent gas usage", async function () {
      // Create multiple tokens for testing
      const tokens = [];
      for (let i = 0; i < 5; i++) {
        const Token = await ethers.getContractFactory("ERC20Mock");
        const token = await Token.deploy(`Token ${i}`, `TKN${i}`, ethers.parseEther("1000"));
        await token.waitForDeployment();
        tokens.push(token);
      }

      // Measure gas usage for pair creation
      const gasUsed = [];
      for (let i = 0; i < tokens.length - 1; i++) {
        const tx = await factory.createPair(
          await tokens[i].getAddress(),
          await tokens[i + 1].getAddress()
        );
        const receipt = await tx.wait();
        gasUsed.push(receipt?.gasUsed || 0n);
      }

      // Gas usage should be consistent (not growing with number of pairs)
      const avgGas = gasUsed.reduce((a, b) => a + b, 0n) / BigInt(gasUsed.length);
      for (const gas of gasUsed) {
        expect(gas).to.be.closeTo(avgGas, avgGas / 20n); // Within 5% of average
      }

      // Log gas usage for analysis
      console.log("Pair creation gas usage:", gasUsed.map(g => g.toString()));
      console.log("Average gas:", avgGas.toString());
    });
  });

  describe("Security & Edge Cases", function () {
    it("Should handle rapid concurrent pair creation attempts", async function () {
      // Create tokens for concurrent testing
      const tokens = [];
      for (let i = 0; i < 3; i++) {
        const Token = await ethers.getContractFactory("ERC20Mock");
        const token = await Token.deploy(`Concurrent ${i}`, `CON${i}`, ethers.parseEther("1000"));
        await token.waitForDeployment();
        tokens.push(token);
      }

      // Attempt concurrent pair creation (should handle gracefully)
      const promises = [];
      for (let i = 0; i < tokens.length - 1; i++) {
        promises.push(
          factory.createPair(await tokens[i].getAddress(), await tokens[i + 1].getAddress())
        );
      }

      await Promise.all(promises);
      expect(await factory.allPairsLength()).to.equal(2);
    });

    it("Should maintain state consistency under stress", async function () {
      // Create 20 pairs to stress test
      const pairs = [];
      for (let i = 0; i < 10; i++) {
        const Token1 = await ethers.getContractFactory("ERC20Mock");
        const Token2 = await ethers.getContractFactory("ERC20Mock");
        
        const token1 = await Token1.deploy(`Stress1-${i}`, `STR1${i}`, ethers.parseEther("1000"));
        const token2 = await Token2.deploy(`Stress2-${i}`, `STR2${i}`, ethers.parseEther("1000"));
        
        await token1.waitForDeployment();
        await token2.waitForDeployment();

        await factory.createPair(await token1.getAddress(), await token2.getAddress());
        pairs.push({ token1, token2 });
      }

      expect(await factory.allPairsLength()).to.equal(10);

      // Verify all mappings are still correct
      for (let i = 0; i < pairs.length; i++) {
        const { token1, token2 } = pairs[i];
        const pairAddr = await factory.getPair(
          await token1.getAddress(),
          await token2.getAddress()
        );
        expect(pairAddr).to.not.equal(ethers.ZeroAddress);
        expect(pairAddr).to.equal(await factory.allPairs(i));
      }
    });
  });
});