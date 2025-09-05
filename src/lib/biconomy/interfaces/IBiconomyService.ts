import type { Address, Hash, WalletClient } from "viem";
import type { TransactionRequest } from "../types";

export interface IBiconomyService {
  initialize(walletClient: WalletClient): Promise<void>;
  getAccountAddress(): Address | null;
  isInitialized(): boolean;
  disconnect(): void;
  waitForTransactionReceipt(hash: Hash): Promise<any>;
}

export interface ITransactionService extends IBiconomyService {
  sendNativeToken(to: Address, amount: string): Promise<Hash>;
  sendBEP20Token(tokenAddress: Address, to: Address, amount: string, decimals?: number): Promise<Hash>;
  executeSimpleTransaction(to: Address, data?: `0x${string}`): Promise<Hash>;
  executeBatchTransaction(transactions: TransactionRequest[]): Promise<Hash>;
}

export interface IQuoteService {
  getQuote(instructions: any[], options?: any): Promise<any>;
  executeQuote(quote: any): Promise<{ hash: Hash }>;
}