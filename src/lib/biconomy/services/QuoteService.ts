import { type Hash } from "viem";
import { bsc } from "viem/chains";

import { BiconomyService } from "./BiconomyService";
import type { IQuoteService } from "../interfaces/IBiconomyService";

export class QuoteService extends BiconomyService implements IQuoteService {
  async getQuote(instructions: any[], options: any = {}): Promise<any> {
    const client = this.getMeeClient();
    
    // Fusion Mode - no authorization required
    console.log("Getting quote using Fusion Mode (standard smart account execution)");
    
    try {
      const quote = await client.getQuote({
        instructions: instructions.map(instruction => ({
          chainId: bsc.id,
          ...instruction,
        })),
        // Fusion Mode: No delegate or authorization needed
        // delegate: false is default
        // authorization: not needed
        sponsorship: true,       // Enable gas sponsorship
        ...options,
      });

      console.log("Quote generated using Fusion Mode:", quote);
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
      console.log("Quote executed using Fusion Mode:", result);
      return result;
    } catch (error) {
      console.error("Failed to execute quote:", error);
      throw error;
    }
  }
}