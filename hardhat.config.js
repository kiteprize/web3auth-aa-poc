/** @type import('hardhat/config').HardhatUserConfig */
export default {
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
      url:
        process.env.BSC_TESTNET_RPC_URL ||
        "https://bsc-testnet-dataseed.bnbchain.org",
      accounts: [
        process.env.DEVELOPER_PRIVATE_KEY ||
          "0xcf88cea92c94fb57f91e1ae45237afdff6583fad2ac67737a42a8f549ed613c8",
      ],
      chainId: 97,
      gasPrice: 10000000000, // 10 gwei
    },
    bscMainnet: {
      url:
        process.env.BSC_MAINNET_RPC_URL || "https://bsc-dataseed.binance.org",
      accounts: [
        process.env.DEVELOPER_PRIVATE_KEY ||
          "0xcf88cea92c94fb57f91e1ae45237afdff6583fad2ac67737a42a8f549ed613c8",
      ],
      chainId: 56,
      gasPrice: 5000000000, // 5 gwei
    },
  },
};
