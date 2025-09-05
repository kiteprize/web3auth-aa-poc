import { type Address, type Hash, parseEther, encodeFunctionData, parseUnits } from "viem";

import { ERC20_ABI } from "../config";
import { QuoteService } from "./QuoteService";
import type { ITransactionService } from "../interfaces/IBiconomyService";
import type { TransactionRequest } from "../types";

export class TransactionService extends QuoteService implements ITransactionService {
  async sendNativeToken(to: Address, amount: string): Promise<Hash> {
    try {
      const valueInWei = parseEther(amount);
      
      const quote = await this.getQuote([
        {
          calls: [
            {
              to,
              value: valueInWei,
              data: "0x",
            },
          ],
        },
      ]);

      const { hash } = await this.executeQuote(quote);
      
      console.log("Native token transfer initiated:", { to, amount, hash });
      return hash;
    } catch (error) {
      console.error("Failed to send native token:", error);
      throw error;
    }
  }

  async sendBEP20Token(tokenAddress: Address, to: Address, amount: string, decimals: number = 18): Promise<Hash> {
    try {
      const amountInUnits = parseUnits(amount, decimals);
      
      const transferData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [to, amountInUnits],
      });

      const quote = await this.getQuote([
        {
          calls: [
            {
              to: tokenAddress,
              value: BigInt(0),
              data: transferData,
            },
          ],
        },
      ]);

      const { hash } = await this.executeQuote(quote);
      
      console.log("BEP-20 token transfer initiated:", { tokenAddress, to, amount, hash });
      return hash;
    } catch (error) {
      console.error("Failed to send BEP-20 token:", error);
      throw error;
    }
  }

  async executeSimpleTransaction(to: Address, data: `0x${string}` = "0x"): Promise<Hash> {
    try {
      const quote = await this.getQuote([
        {
          calls: [
            {
              to,
              value: BigInt(0),
              data,
            },
          ],
        },
      ]);

      const { hash } = await this.executeQuote(quote);
      
      console.log("Simple transaction executed:", { to, data, hash });
      return hash;
    } catch (error) {
      console.error("Failed to execute simple transaction:", error);
      throw error;
    }
  }

  async executeBatchTransaction(transactions: TransactionRequest[]): Promise<Hash> {
    try {
      const calls = transactions.map(tx => ({
        to: tx.to,
        value: tx.value || BigInt(0),
        data: tx.data || "0x" as `0x${string}`,
      }));

      const quote = await this.getQuote([
        {
          calls,
        },
      ]);

      const { hash } = await this.executeQuote(quote);
      
      console.log("Batch transaction executed:", { callsCount: calls.length, hash });
      return hash;
    } catch (error) {
      console.error("Failed to execute batch transaction:", error);
      throw error;
    }
  }
}