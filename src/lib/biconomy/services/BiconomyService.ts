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

      console.log("Initializing Biconomy with EIP-7702 delegation for Web3Auth:", account);
      console.log("Using LocalAccount-based EIP-7702 for full gas sponsorship support");

      // Sign EIP-7702 authorization for delegation to Nexus implementation
      console.log("Signing EIP-7702 authorization with LocalAccount...");
      try {
        this.authorization = await walletClient.signAuthorization({
          contractAddress: NEXUS_IMPLEMENTATION as Address,
          chainId: 0, // 0 means any chain for maximum flexibility
        });

        console.log("EIP-7702 authorization signed successfully:", {
          contractAddress: NEXUS_IMPLEMENTATION,
          chainId: this.authorization.chainId,
          nonce: this.authorization.nonce,
        });
      } catch (authError) {
        console.error("EIP-7702 authorization failed:", authError);
        throw new Error(`EIP-7702 authorization failed: ${authError instanceof Error ? authError.message : 'Unknown error'}`);
      }

      // Create nexus account with EIP-7702 delegation
      // Override accountAddress to use EOA for EIP-7702 flow
      const nexusAccount = await toMultichainNexusAccount({
        signer: walletClient as any,
        chainConfigurations: [
          {
            chain: bsc,
            transport: http(BICONOMY_CONFIG.rpcUrl),
            version: getMEEVersion(MEEVersion.V2_1_0),
          },
        ],
        accountAddress: account, // Use EOA address for EIP-7702 delegation
      });

      console.log("Nexus account created with EIP-7702 delegation:", {
        eoaAddress: account,
        nexusAddress: nexusAccount.addressOn(bsc.id),
        chainId: bsc.id,
      });

      this.meeClient = await createMeeClient({
        account: nexusAccount,
        apiKey: BICONOMY_CONFIG.apiKey,
      });

      // For EIP-7702 flow, use the EOA address directly
      this.accountAddress = account;
      
      console.log("Biconomy MEE Client initialized with EIP-7702:", {
        eoaAddress: this.accountAddress,
        chainId: bsc.id,
        mode: "EIP-7702 delegation with LocalAccount",
        hasAuthorization: !!this.authorization
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