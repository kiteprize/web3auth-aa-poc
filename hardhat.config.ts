import { HardhatUserConfig } from "hardhat/config";
import hardhatVerify from "@nomicfoundation/hardhat-verify";
import dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  plugins: [hardhatVerify],

  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    bscTestnet: {
      type: "http",
      url:
        process.env.BSC_TESTNET_RPC_URL ||
        "https://bsc-testnet-dataseed.bnbchain.org",
      accounts: [
        process.env.PRIVATE_KEY ||
          process.env.BUNDLER_PRIVATE_KEY ||
          "0x178e9804a7636c9213693bb0e419dd7de325d881f889b1ec696e8fbaa30f1df3",
      ],
      chainId: 97,
      gasPrice: 10000000000, // 10 gwei
    },
    bscMainnet: {
      type: "http",
      url:
        process.env.BSC_MAINNET_RPC_URL || "https://bsc-dataseed.binance.org",
      accounts: [
        process.env.PRIVATE_KEY ||
          process.env.BUNDLER_PRIVATE_KEY ||
          "0x178e9804a7636c9213693bb0e419dd7de325d881f889b1ec696e8fbaa30f1df3",
      ],
      chainId: 56,
      gasPrice: 5000000000, // 5 gwei
    },
    polygonAmoy: {
      type: "http",
      url:
        process.env.POLYGON_AMOY_RPC_URL ||
        "https://rpc-amoy.polygon.technology",
      accounts: [
        process.env.PRIVATE_KEY ||
          process.env.BUNDLER_PRIVATE_KEY ||
          "0x178e9804a7636c9213693bb0e419dd7de325d881f889b1ec696e8fbaa30f1df3",
      ],
      chainId: 80002,
      // Polygon Amoy supports EIP-1559, no need to set gasPrice
    },
  },

  // Hardhat 3.0 verification configuration
  verify: {
    etherscan: {
      apiKey:
        process.env.POLYGONSCAN_API_KEY ||
        process.env.ETHERSCAN_API_KEY ||
        "VVRBP8QTG2JU4ZW2P58AUFXYMDVUDJXTUE",
    },
    blockscout: {
      enabled: false, // Disable Blockscout to avoid errors
    },
  },

  // Hardhat 3.0 chain descriptors for Polygon Amoy
  chainDescriptors: {
    80002: {
      name: "Polygon Amoy",
      blockExplorers: {
        etherscan: {
          name: "PolygonScan Amoy",
          url: "https://amoy.polygonscan.com",
          apiUrl: "https://api-amoy.polygonscan.com/api",
        },
      },
    },
    97: {
      name: "BSC Testnet",
      blockExplorers: {
        etherscan: {
          name: "BscScan Testnet",
          url: "https://testnet.bscscan.com",
          apiUrl: "https://api-testnet.bscscan.com/api",
        },
      },
    },
    56: {
      name: "BSC Mainnet",
      blockExplorers: {
        etherscan: {
          name: "BscScan",
          url: "https://bscscan.com",
          apiUrl: "https://api.bscscan.com/api",
        },
      },
    },
  },
};

export default config;
