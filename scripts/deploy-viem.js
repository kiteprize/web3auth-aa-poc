import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  parseGwei,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bsc, bscTestnet } from "viem/chains";
import fs from "fs";

// Load compiled artifacts
const testTokenArtifact = JSON.parse(
  fs.readFileSync("artifacts/contracts/TestToken.sol/TestToken.json")
);
const myAccountFactoryArtifact = JSON.parse(
  fs.readFileSync(
    "artifacts/contracts/MyAccountFactory.sol/MyAccountFactory.json"
  )
);
const myPaymasterArtifact = JSON.parse(
  fs.readFileSync("artifacts/contracts/MyPaymaster.sol/MyPaymaster.json")
);

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

const config = {
  ...networkConfig,
  privateKey:
    process.env.DEVELOPER_PRIVATE_KEY ||
    "0xcf88cea92c94fb57f91e1ae45237afdff6583fad2ac67737a42a8f549ed613c8",
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

  // Initialize nonce on first call
  if (currentNonce === undefined) {
    currentNonce = await publicClient.getTransactionCount({
      address: account.address,
      blockTag: "pending",
    });
  }

  const hash = await walletClient.deployContract({
    abi,
    bytecode: bytecode.bytecode || bytecode,
    args,
    nonce: currentNonce,
    maxFeePerGas: parseGwei("0.002"),
    maxPriorityFeePerGas: parseGwei("0.001"),
  });

  currentNonce++; // Increment for next transaction

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`✅ ${name} deployed to:`, receipt.contractAddress);

  return receipt.contractAddress;
}

async function main() {
  console.log("🚀 Deploying contracts to", currentNetwork);
  console.log("📍 Network RPC:", config.rpcUrl);
  console.log("👤 Deploying with account:", account.address);
  console.log("🎯 EntryPoint address:", config.entryPointAddress);

  const balance = await publicClient.getBalance({ address: account.address });
  console.log("💰 Account balance:", parseEther(balance.toString()));

  // Deploy TestToken
  const testTokenAddress = await deployContract(
    "TestToken",
    testTokenArtifact.bytecode,
    testTokenArtifact.abi
  );

  // Deploy MyAccountFactory
  const factoryAddress = await deployContract(
    "MyAccountFactory",
    myAccountFactoryArtifact.bytecode,
    myAccountFactoryArtifact.abi,
    [config.entryPointAddress]
  );

  // Skip MyPaymaster deployment for now
  // const paymasterAddress = null;

  // Save deployment data
  const deploymentData = {
    network: currentNetwork,
    chainId: config.chain.id,
    contracts: {
      TestToken: testTokenAddress,
      MyAccountFactory: factoryAddress,
      EntryPoint: config.entryPointAddress,
    },
    deployer: account.address,
    timestamp: new Date().toISOString(),
  };

  const deploymentFileName = `deployment-${currentNetwork}.json`;
  fs.writeFileSync(deploymentFileName, JSON.stringify(deploymentData, null, 2));

  console.log(`\n✅ Deployment complete! Data saved to ${deploymentFileName}`);
}

main().catch(console.error);
