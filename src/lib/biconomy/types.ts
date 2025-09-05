import type { Address, Hash } from "viem";

export interface BiconomyContextType {
  isConnected: boolean;
  isLoading: boolean;
  accountAddress?: Address;
  chainId?: number;
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
  sendNativeToken: (to: Address, amount: string) => Promise<Hash>;
  sendBEP20Token: (tokenAddress: Address, to: Address, amount: string) => Promise<Hash>;
  executeSimpleTransaction: (to: Address, data?: `0x${string}`) => Promise<Hash>;
  executeBatchTransaction: (calls: { to: Address; value?: bigint; data?: `0x${string}` }[]) => Promise<Hash>;
}

export interface TransactionRequest {
  to: Address;
  value?: bigint;
  data?: `0x${string}`;
}

export interface TokenInfo {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
}

export interface BiconomyConfig {
  apiKey: string;
  meeId: string;
  chainId: number;
  rpcUrl: string;
}