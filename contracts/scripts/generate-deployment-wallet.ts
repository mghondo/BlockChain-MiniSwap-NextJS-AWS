import { ethers } from "ethers";
import { writeFileSync } from "fs";
import * as crypto from "crypto";

interface WalletInfo {
  address: string;
  privateKey: string;
  mnemonic: string;
  derivationPath: string;
  createdAt: string;
  purpose: string;
}

function generateSecureWallet(): WalletInfo {
  // Generate random wallet with mnemonic
  const wallet = ethers.Wallet.createRandom();
  
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic?.phrase || "",
    derivationPath: "m/44'/60'/0'/0/0",
    createdAt: new Date().toISOString(),
    purpose: "MiniSwap testnet deployment"
  };
}

function saveWalletSecurely(wallet: WalletInfo): void {
  // Save wallet info (without private key) for reference
  const publicInfo = {
    address: wallet.address,
    derivationPath: wallet.derivationPath,
    createdAt: wallet.createdAt,
    purpose: wallet.purpose
  };

  writeFileSync('./deployment-wallet-info.json', JSON.stringify(publicInfo, null, 2));

  // Create .env template
  const envTemplate = `# MiniSwap Deployment Configuration
# SECURITY: Never commit this file to version control!

# Testnet Configuration
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
PRIVATE_KEY=${wallet.privateKey}

# Optional: Etherscan API key for contract verification
ETHERSCAN_API_KEY=your_etherscan_api_key_here

# Gas Configuration
REPORT_GAS=true
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key_here
`;

  writeFileSync('./deployment.env.example', envTemplate);

  console.log("🔐 SECURE DEPLOYMENT WALLET GENERATED");
  console.log("=====================================");
  console.log("");
  console.log("📋 Wallet Information:");
  console.log(`   Address: ${wallet.address}`);
  console.log(`   Created: ${wallet.createdAt}`);
  console.log("");
  console.log("💾 Files Created:");
  console.log("   deployment-wallet-info.json (safe to commit)");
  console.log("   deployment.env.example (template for .env)");
  console.log("");
  console.log("🔑 CRITICAL SECURITY INFORMATION:");
  console.log("=====================================");
  console.log("1. PRIVATE KEY (KEEP SECRET):");
  console.log(`   ${wallet.privateKey}`);
  console.log("");
  console.log("2. MNEMONIC PHRASE (BACKUP SAFELY):");
  console.log(`   ${wallet.mnemonic}`);
  console.log("");
  console.log("⚠️  SECURITY WARNINGS:");
  console.log("- NEVER share your private key or mnemonic");
  console.log("- Store the mnemonic in a secure password manager");
  console.log("- Never commit .env files to git");
  console.log("- Use this wallet ONLY for testnet deployments");
  console.log("- Generate a new wallet for production");
  console.log("");
  console.log("💰 NEXT STEPS:");
  console.log("1. Get Sepolia ETH from faucet:");
  console.log("   https://sepoliafaucet.com/");
  console.log("   https://www.alchemy.com/faucets/ethereum-sepolia");
  console.log("");
  console.log("2. Copy deployment.env.example to .env and update:");
  console.log("   - Add your Infura project ID");
  console.log("   - Add Etherscan API key (optional)");
  console.log("");
  console.log("3. Verify .gitignore includes .env file");
  console.log("");
  console.log("4. Send test ETH to the address above");
  console.log("");
  console.log("5. Run deployment:");
  console.log("   npm run deploy:testnet:secure");
}

function main(): void {
  console.log("🚀 Generating secure deployment wallet...");
  console.log("This will create a new wallet specifically for testnet deployment.");
  console.log("");

  const wallet = generateSecureWallet();
  saveWalletSecurely(wallet);

  console.log("✅ Wallet generation complete!");
  console.log("");
  console.log("⚡ Remember: This is for TESTNET only!");
  console.log("   Generate a different wallet for production deployment.");
}

main();