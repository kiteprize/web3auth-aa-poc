import { bsc } from "viem/chains";
import type { BiconomyConfig, TokenInfo } from "./types";

export const BICONOMY_CONFIG: BiconomyConfig = {
  apiKey: process.env.NEXT_PUBLIC_BICONOMY_MEE_API_KEY || "",
  meeId: process.env.NEXT_PUBLIC_BICONOMY_MEE_ID || "",
  chainId: bsc.id, // BSC 메인넷 (ChainId: 56)
  rpcUrl: "https://bsc-dataseed.bnbchain.org",
};

// BNB Smart Chain 메인넷의 주요 토큰들
export const MAINNET_TOKENS: Record<string, TokenInfo> = {
  USDT: {
    address: "0x55d398326f99059fF775485246999027B3197955", // BSC 메인넷 USDT
    name: "Tether USD",
    symbol: "USDT",
    decimals: 18,
  },
  USDC: {
    address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", // BSC 메인넷 USDC
    name: "USD Coin",
    symbol: "USDC", 
    decimals: 18,
  },
  BUSD: {
    address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", // BSC 메인넷 BUSD
    name: "Binance USD",
    symbol: "BUSD",
    decimals: 18,
  },
};

export const SPONSORSHIP_OPTIONS = {
  // Biconomy MEE 메인넷 스폰서십 옵션
  url: "https://mee-relayer-v2.biconomy.io/api/v2/relay",
  gasTank: {
    address: "0x00000072a5F551D6E80b2f6ad4fB256A27841Bbc" as const, // BSC 스폰서십 페이마스터
    token: "0x0000000000000000000000000000000000000000" as const, // Native token for gas
    chainId: bsc.id,
  },
};

// ERC-20 Token ABI (전송에 필요한 부분만)
export const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
] as const;