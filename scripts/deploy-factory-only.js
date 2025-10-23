import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  parseGwei,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bsc, bscTestnet, polygonAmoy } from "viem/chains";
import fs from "fs";

// Load compiled artifacts
const myAccountFactoryArtifact = JSON.parse(
  fs.readFileSync(
    "artifacts/contracts/MyAccountFactory.sol/MyAccountFactory.json"
  )
);

// Network configuration
const NETWORKS = {
  bscTestnet: {
    chain: bscTestnet,
    rpcUrl:
      process.env.BSC_TESTNET_RPC_URL ||
      "https://bsc-testnet-dataseed.bnbchain.org",
    entryPointAddress: "0x4337084d9e255ff0702461cf8895ce9e3b5ff108", // ERC-4337 EntryPoint v0.8
    gasPrice: parseGwei("15"), // BSC uses legacy gas model, higher price for priority
  },
  bscMainnet: {
    chain: bsc,
    rpcUrl:
      process.env.BSC_MAINNET_RPC_URL || "https://bsc-dataseed.binance.org",
    entryPointAddress: "0x4337084d9e255ff0702461cf8895ce9e3b5ff108", // ERC-4337 EntryPoint v0.8
    gasPrice: parseGwei("5"), // BSC uses legacy gas model
  },
  polygonAmoy: {
    chain: polygonAmoy,
    rpcUrl:
      process.env.POLYGON_AMOY_RPC_URL ||
      "https://rpc-amoy.polygon.technology",
    entryPointAddress: "0x4337084d9e255ff0702461cf8895ce9e3b5ff108", // ERC-4337 EntryPoint v0.8
    // Polygon supports EIP-1559, so we don't set gasPrice (will use maxFeePerGas/maxPriorityFeePerGas)
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

const config = {
  ...networkConfig,
  privateKey:
    process.env.PRIVATE_KEY ||
    process.env.BUNDLER_PRIVATE_KEY ||
    "0x178e9804a7636c9213693bb0e419dd7de325d881f889b1ec696e8fbaa30f1df3",
};

const account = privateKeyToAccount(config.privateKey);

const publicClient = createPublicClient({
  chain: config.chain,
  transport: http(config.rpcUrl),
});

const walletClient = createWalletClient({
  chain: config.chain,
  transport: http(config.rpcUrl),
  account,
});

let currentNonce;

async function deployContract(name, bytecode, abi, args = []) {
  console.log(`\n📦 Deploying ${name}...`);

  try {
    // Initialize nonce on first call - always get fresh pending nonce
    if (currentNonce === undefined) {
      currentNonce = await publicClient.getTransactionCount({
        address: account.address,
        blockTag: "pending",
      });
      console.log(`   Fresh pending nonce fetched: ${currentNonce}`);
    }

    console.log(`   Using nonce: ${currentNonce}`);

    // Prepare gas settings based on network
    let gasSettings = {
      nonce: currentNonce,
      gas: 5000000, // Set explicit gas limit
    };

    // Use legacy gas model for BSC networks
    if (currentNetwork.includes("bsc")) {
      gasSettings.gasPrice = config.gasPrice;
      console.log(`   Using gas price: ${config.gasPrice} wei (legacy)`);
    } else {
      // For EIP-1559 compatible networks (like Polygon)
      console.log(`   Using EIP-1559 gas model`);
    }

    const hash = await walletClient.deployContract({
      abi,
      bytecode: bytecode.bytecode || bytecode,
      args,
      ...gasSettings,
    });

    console.log(`   Transaction hash: ${hash}`);

    currentNonce++; // Increment for next transaction

    console.log(`   Waiting for transaction receipt...`);

    // Wait for receipt with timeout
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      timeout: 120000, // 120 second timeout (Polygon can be slower)
    });

    console.log(`✅ ${name} deployed to:`, receipt.contractAddress);
    console.log(`   Gas used: ${receipt.gasUsed}`);

    return receipt.contractAddress;
  } catch (error) {
    console.error(`❌ Failed to deploy ${name}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log("🚀 Deploying Factory contract to", currentNetwork);
  console.log("📍 Network RPC:", config.rpcUrl);
  console.log("👤 Deploying with account:", account.address);
  console.log("🎯 EntryPoint address:", config.entryPointAddress);

  const balance = await publicClient.getBalance({ address: account.address });
  const nativeToken = currentNetwork.includes("polygon") ? "POL" : "BNB";
  console.log(
    `💰 Account balance: ${(Number(balance) / 1e18).toFixed(4)} ${nativeToken}`
  );

  // Deploy MyAccountFactory only
  const factoryAddress = await deployContract(
    "MyAccountFactory",
    myAccountFactoryArtifact.bytecode,
    myAccountFactoryArtifact.abi,
    [config.entryPointAddress]
  );

  // Save deployment data
  const deploymentData = {
    network: currentNetwork,
    chainId: config.chain.id,
    contracts: {
      MyAccountFactory: factoryAddress,
      EntryPoint: config.entryPointAddress,
    },
    deployer: account.address,
    timestamp: new Date().toISOString(),
  };

  const deploymentFileName = `deployment-${currentNetwork}-factory-only.json`;
  fs.writeFileSync(deploymentFileName, JSON.stringify(deploymentData, null, 2));

  console.log(`\n✅ Deployment complete! Data saved to ${deploymentFileName}`);
  console.log("\n📋 Deployment Summary:");
  console.log(`   Network: ${currentNetwork} (Chain ID: ${config.chain.id})`);
  console.log(`   Factory: ${factoryAddress}`);
  console.log(`   EntryPoint: ${config.entryPointAddress}`);
  console.log(`   Explorer: ${config.chain.blockExplorers?.default.url}`);
}

main().catch(console.error);
