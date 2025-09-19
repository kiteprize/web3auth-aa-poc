import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  getContract,
  encodeFunctionData,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bsc, bscTestnet } from "viem/chains";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Network configuration
const NETWORKS = {
  bscTestnet: {
    chain: bscTestnet,
    rpcUrl:
      process.env.BSC_TESTNET_RPC_URL ||
      "https://bsc-testnet-rpc.publicnode.com",
    entryPointAddress: "0x4337084d9e255ff0702461cf8895ce9e3b5ff108", // ERC-4337 EntryPoint v0.8
  },
  bscMainnet: {
    chain: bsc,
    rpcUrl:
      process.env.BSC_MAINNET_RPC_URL || "https://bsc-dataseed.binance.org",
    entryPointAddress: "0x4337084d9e255ff0702461cf8895ce9e3b5ff108", // ERC-4337 EntryPoint v0.8
  },
};

const currentNetwork = process.env.NETWORK || "bscTestnet";
const networkConfig = NETWORKS[currentNetwork];

if (!networkConfig) {
  throw new Error(
    `Unsupported network: ${currentNetwork}. Supported: ${Object.keys(
      NETWORKS
    ).join(", ")}`
  );
}

// Configuration
const config = {
  ...networkConfig,
  developerPrivateKey: process.env.BUNDLER_PRIVATE_KEY,
};

console.log("🚀 Starting AA Gasless ERC-20 Transfer PoC");
console.log("=====================================");

// Create clients
const publicClient = createPublicClient({
  chain: config.chain,
  transport: http(config.rpcUrl),
});

const developerAccount = privateKeyToAccount(config.developerPrivateKey);
const walletClient = createWalletClient({
  chain: config.chain,
  transport: http(config.rpcUrl),
  account: developerAccount,
});

console.log("📝 Developer Account:", developerAccount.address);

// Load deployment data
function loadDeploymentData() {
  const deploymentFileName = `deployment-${currentNetwork}.json`;
  const dataPath = path.join(__dirname, "..", deploymentFileName);
  return JSON.parse(fs.readFileSync(dataPath, "utf8"));
}

// Load Hardhat artifacts
function loadArtifacts() {
  const artifactsDir = path.join(__dirname, "..", "artifacts", "contracts");
  const aaArtifactsDir = path.join(
    __dirname,
    "..",
    "node_modules",
    "@account-abstraction",
    "contracts",
    "artifacts"
  );

  const testTokenAbi = JSON.parse(
    fs.readFileSync(path.join(artifactsDir, "TestToken.sol", "TestToken.json"))
  ).abi;
  const myAccountFactoryAbi = JSON.parse(
    fs.readFileSync(
      path.join(artifactsDir, "MyAccountFactory.sol", "MyAccountFactory.json")
    )
  ).abi;
  const myAccountAbi = JSON.parse(
    fs.readFileSync(path.join(artifactsDir, "MyAccount.sol", "MyAccount.json"))
  ).abi;
  const entryPointAbi = JSON.parse(
    fs.readFileSync(path.join(aaArtifactsDir, "EntryPoint.json"))
  ).abi;

  return { testTokenAbi, myAccountFactoryAbi, myAccountAbi, entryPointAbi };
}

async function createUserOperation(
  factoryAddress,
  tokenAddress,
  accountAddress,
  userPrivateKey,
  needsDeployment,
  entryPointAbi,
  factoryAbi,
  tokenAbi,
  accountAbi
) {
  console.log("\n🔨 Creating UserOperation...");

  const userAccount = privateKeyToAccount(userPrivateKey);

  // Get nonce from EntryPoint using proper ABI
  const nonce = await publicClient.readContract({
    address: config.entryPointAddress,
    abi: entryPointAbi,
    functionName: "getNonce",
    args: [accountAddress, BigInt(0)],
  });

  // Create initCode if account needs deployment
  let initCode = "0x";
  if (needsDeployment) {
    const createAccountCalldata = encodeFunctionData({
      abi: factoryAbi,
      functionName: "createAccount",
      args: [userAccount.address, BigInt(0)],
    });
    initCode = factoryAddress + createAccountCalldata.slice(2);
    console.log("📋 Account will be deployed with initCode");
  }

  // Create callData for token transfer using proper token ABI
  const transferCalldata = encodeFunctionData({
    abi: tokenAbi,
    functionName: "transfer",
    args: [developerAccount.address, parseEther("10")],
  });

  // Create execute calldata using proper account ABI
  const executeCalldata = encodeFunctionData({
    abi: accountAbi,
    functionName: "execute",
    args: [tokenAddress, BigInt(0), transferCalldata],
  });

  // Gas limits (packed into bytes32) - increase for deployment
  const verificationGasLimit = needsDeployment
    ? BigInt(1000000)
    : BigInt(100000);
  const callGasLimit = BigInt(100000);
  const accountGasLimits = `0x${verificationGasLimit
    .toString(16)
    .padStart(32, "0")}${callGasLimit.toString(16).padStart(32, "0")}`;

  // Gas fees (packed into bytes32) - set to 0 for gasless transaction
  const maxPriorityFeePerGas = BigInt(0);
  const maxFeePerGas = BigInt(0);
  const gasFees = `0x${maxPriorityFeePerGas
    .toString(16)
    .padStart(32, "0")}${maxFeePerGas.toString(16).padStart(32, "0")}`;

  const userOp = {
    sender: accountAddress,
    nonce,
    initCode,
    callData: executeCalldata,
    accountGasLimits,
    preVerificationGas: needsDeployment ? BigInt(100000) : BigInt(50000),
    gasFees,
    paymasterAndData: "0x",
    signature: "0x",
  };

  console.log("📋 UserOperation created");
  console.log("   Sender:", userOp.sender);
  console.log("   Nonce:", nonce);
  console.log("   InitCode length:", initCode.length);

  return { userOp, userAccount };
}

async function signUserOperation(userOp, userAccount, entryPointAbi) {
  console.log("\n✍️  Signing UserOperation...");

  const entryPoint = getContract({
    address: config.entryPointAddress,
    abi: entryPointAbi,
    client: publicClient,
  });

  const userOpHash = await entryPoint.read.getUserOpHash([userOp]);
  console.log("📝 UserOpHash:", userOpHash);

  // Sign the UserOpHash using EIP-191 message signing
  const signature = await userAccount.signMessage({
    message: { raw: userOpHash },
  });

  userOp.signature = signature;
  console.log("✅ UserOperation signed");

  return userOp;
}

async function main() {
  try {
    // Load deployment data and artifacts
    const deploymentData = loadDeploymentData();
    const { testTokenAbi, myAccountFactoryAbi, myAccountAbi, entryPointAbi } =
      loadArtifacts();

    console.log("📋 Using deployed contracts on", currentNetwork, ":");
    console.log("   TestToken:", deploymentData.contracts.TestToken);
    console.log(
      "   MyAccountFactory:",
      deploymentData.contracts.MyAccountFactory
    );
    console.log("   EntryPoint:", deploymentData.contracts.EntryPoint);

    // Generate user account
    console.log("\n👤 Generating user account...");
    const userPrivateKey =
      "0x" +
      Array(64)
        .fill(0)
        .map(() => Math.floor(Math.random() * 16).toString(16))
        .join("");
    const userAccount = privateKeyToAccount(userPrivateKey);
    console.log("User account:", userAccount.address);

    // Predict smart account address
    console.log("\n🔮 Predicting smart account address...");
    const factory = getContract({
      address: deploymentData.contracts.MyAccountFactory,
      abi: myAccountFactoryAbi,
      client: publicClient,
    });

    const smartAccountAddress = await factory.read.getAddress([
      userAccount.address,
      BigInt(0),
    ]);
    console.log("Smart account address:", smartAccountAddress);

    // Check if smart account exists - will be created during first UserOp
    console.log("\n🏗️  Checking smart account deployment...");
    const accountCode = await publicClient.getCode({
      address: smartAccountAddress,
    });
    const needsDeployment = !accountCode || accountCode === "0x";
    if (needsDeployment) {
      console.log("📋 Smart account will be created on first UserOperation");
    } else {
      console.log("📋 Smart account already exists");
    }

    // Get current nonce
    let currentNonce = await publicClient.getTransactionCount({
      address: developerAccount.address,
      blockTag: "pending",
    });

    // Skip funding - this is a gasless transaction PoC

    // Mint tokens to smart account
    console.log("\n🪙 Minting tokens to smart account...");
    const token = getContract({
      address: deploymentData.contracts.TestToken,
      abi: testTokenAbi,
      client: walletClient,
    });

    const mintHash = await token.write.mint(
      [smartAccountAddress, parseEther("100")],
      {
        nonce: currentNonce,
      }
    );
    await publicClient.waitForTransactionReceipt({ hash: mintHash });
    console.log("✅ Tokens minted");
    currentNonce++;

    // Create and sign UserOperation
    const { userOp, userAccount: userAcc } = await createUserOperation(
      deploymentData.contracts.MyAccountFactory,
      deploymentData.contracts.TestToken,
      smartAccountAddress,
      userPrivateKey,
      needsDeployment,
      entryPointAbi,
      myAccountFactoryAbi,
      testTokenAbi,
      myAccountAbi
    );

    const signedUserOp = await signUserOperation(
      userOp,
      userAcc,
      entryPointAbi
    );

    // Execute gasless transaction
    console.log("\n🚀 Executing gasless transaction...");

    const entryPoint = getContract({
      address: config.entryPointAddress,
      abi: entryPointAbi,
      client: walletClient,
    });

    // Check balances before
    console.log("📊 Checking balances before...");
    const smartBalanceBefore = await token.read.balanceOf([
      smartAccountAddress,
    ]);
    const devBalanceBefore = await token.read.balanceOf([
      developerAccount.address,
    ]);
    console.log(`   Smart account: ${smartBalanceBefore} tokens`);
    console.log(`   Developer: ${devBalanceBefore} tokens`);

    // Execute transaction
    const handleOpsHash = await entryPoint.write.handleOps(
      [[signedUserOp], developerAccount.address],
      {
        nonce: currentNonce,
      }
    );

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: handleOpsHash,
    });

    if (receipt.status === "success") {
      console.log("✅ Gasless transaction successful!");

      // Check balances after
      console.log("📊 Checking balances after...");
      const smartBalanceAfter = await token.read.balanceOf([
        smartAccountAddress,
      ]);
      const devBalanceAfter = await token.read.balanceOf([
        developerAccount.address,
      ]);
      console.log(`   Smart account: ${smartBalanceAfter} tokens`);
      console.log(`   Developer: ${devBalanceAfter} tokens`);

      const transferred = devBalanceAfter - devBalanceBefore;
      console.log(
        `💸 Successfully transferred ${transferred} tokens gaslessly!`
      );
    } else {
      console.log("❌ Transaction failed");
    }

    console.log("\n✅ PoC completed!");
  } catch (error) {
    console.error("\n❌ PoC failed:", error.message);
    if (error.cause?.data) {
      console.log("Error data:", error.cause.data);
    }
  }
}

main();
