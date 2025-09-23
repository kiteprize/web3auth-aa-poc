import hardhatVerify from "@nomicfoundation/hardhat-verify";

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  plugins: [hardhatVerify],
  verify: {
    etherscan: {
      apiKey: process.env.ETHERSCAN_API_KEY,
    },
    blockscout: {
      enable: false,
    },
    bscTrace: {
      enable: true,
    },
  },
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
        process.env.BUNDLER_PRIVATE_KEY ||
          "0x178e9804a7636c9213693bb0e419dd7de325d881f889b1ec696e8fbaa30f1df3",
      ],
      chainId: 56,
      gasPrice: 5000000000, // 5 gwei
    },
  },
};
