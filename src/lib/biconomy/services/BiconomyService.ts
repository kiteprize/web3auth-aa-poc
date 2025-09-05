import { 
  createMeeClient, 
  toMultichainNexusAccount,
  getMEEVersion,
  MEEVersion,
  type MeeClient 
} from "@biconomy/abstractjs";
import { http, type Address, type Hash, type WalletClient } from "viem";
import { bsc } from "viem/chains";

import { BICONOMY_CONFIG } from "../config";
import type { IBiconomyService } from "../interfaces/IBiconomyService";

// Nexus implementation address for EIP-7702 delegation
const NEXUS_IMPLEMENTATION = "0x000000004F43C49e93C970E84001853a70923B03";

export class BiconomyService implements IBiconomyService {
  protected meeClient: MeeClient | null = null;
  protected accountAddress: Address | null = null;
  protected authorization: any = null;
  
  async initialize(walletClient: WalletClient): Promise<void> {
    try {
      const [account] = await walletClient.getAddresses();
      if (!account) {
        throw new Error("No account found in wallet client");
      }

      console.log("Initializing Biconomy with Fusion Mode for Web3Auth compatibility:", account);
      console.log("Using Fusion Mode (no EIP-7702 required) for broad wallet compatibility");

      // Skip EIP-7702 authorization for Fusion Mode
      this.authorization = null;

      // Create nexus smart account for Fusion Mode
      // Note: accountAddress should NOT be overridden for Fusion Mode
      const nexusAccount = await toMultichainNexusAccount({
        signer: walletClient as any,
        chainConfigurations: [
          {
            chain: bsc,
            transport: http(BICONOMY_CONFIG.rpcUrl),
            version: getMEEVersion(MEEVersion.V2_1_0),
          },
        ],
        // Do NOT override accountAddress for Fusion Mode - let it create a separate smart account
      });

      console.log("Nexus smart account created for Fusion Mode:", {
        smartAccountAddress: nexusAccount.addressOn(bsc.id),
        ownerEOA: account,
        chainId: bsc.id,
      });

      this.meeClient = await createMeeClient({
        account: nexusAccount,
        apiKey: BICONOMY_CONFIG.apiKey,
      });

      // For Fusion Mode, use the smart account address but store EOA for reference
      this.accountAddress = nexusAccount.addressOn(bsc.id);
      
      console.log("Biconomy MEE Client initialized with Fusion Mode:", {
        smartAccountAddress: this.accountAddress,
        chainId: bsc.id,
        mode: "Fusion (no EIP-7702 required)"
      });
    } catch (error) {
      console.error("Failed to initialize Biconomy client:", error);
      throw error;
    }
  }

  getAccountAddress(): Address | null {
    return this.accountAddress;
  }

  isInitialized(): boolean {
    return this.meeClient !== null && this.accountAddress !== null;
  }

  getAuthorization(): any {
    return this.authorization;
  }

  protected getMeeClient(): MeeClient {
    if (!this.meeClient) {
      throw new Error("Biconomy client not initialized");
    }
    return this.meeClient;
  }

  async waitForTransactionReceipt(hash: Hash) {
    const client = this.getMeeClient();
    
    try {
      const receipt = await client.waitForSupertransactionReceipt({ hash });
      console.log("Transaction receipt:", receipt);
      return receipt;
    } catch (error) {
      console.error("Failed to get transaction receipt:", error);
      throw error;
    }
  }

  disconnect(): void {
    this.meeClient = null;
    this.accountAddress = null;
    this.authorization = null;
    console.log("Biconomy client disconnected");
  }
}