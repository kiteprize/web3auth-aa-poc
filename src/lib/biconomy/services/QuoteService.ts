import { type Hash } from "viem";
import { bsc } from "viem/chains";

import { BiconomyService } from "./BiconomyService";
import type { IQuoteService } from "../interfaces/IBiconomyService";

export class QuoteService extends BiconomyService implements IQuoteService {
  async getQuote(instructions: any[], options: any = {}): Promise<any> {
    const client = this.getMeeClient();
    const authorization = this.getAuthorization();
    
    if (!authorization) {
      throw new Error("EIP-7702 authorization not available. Please ensure the service is properly initialized.");
    }
    
    console.log("Getting quote using EIP-7702 delegation with full gas sponsorship");
    
    try {
      const quote = await client.getQuote({
        instructions: instructions.map(instruction => ({
          chainId: bsc.id,
          ...instruction,
        })),
        delegate: true,          // Required for EIP-7702 orchestration
        authorization,           // EIP-7702 authorization signature
        sponsorship: true,       // Enable gas sponsorship
        ...options,
      });

      console.log("Quote generated using EIP-7702 delegation:", quote);
      return quote;
    } catch (error) {
      console.error("Failed to get quote:", error);
      throw error;
    }
  }

  async executeQuote(quote: any): Promise<{ hash: Hash }> {
    const client = this.getMeeClient();
    
    try {
      const result = await client.executeQuote({ quote });
      console.log("Quote executed using EIP-7702 delegation:", result);
      return result;
    } catch (error) {
      console.error("Failed to execute quote:", error);
      throw error;
    }
  }
}