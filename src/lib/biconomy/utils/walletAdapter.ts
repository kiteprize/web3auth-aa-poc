import { createWalletClient, custom, type WalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bsc } from "viem/chains";
import type { IProvider } from "@web3auth/base";

export class WalletAdapter {
  static async createFromWeb3AuthProvider(
    provider: IProvider
  ): Promise<WalletClient> {
    try {
      console.log(
        "Creating WalletClient with LocalAccount for EIP-7702 support..."
      );

      // Extract private key from Web3Auth provider
      const privateKey = await provider.request({
        method: "private_key",
      });

      if (!privateKey) {
        throw new Error("Failed to extract private key from Web3Auth provider");
      }

      // Create LocalAccount from private key for full EIP-7702 compatibility
      const account = privateKeyToAccount(`0x${privateKey}`);
      console.log("LocalAccount created:", account.address);

      // Create WalletClient with LocalAccount - this ensures signAuthorization works
      const walletClient = createWalletClient({
        account,
        chain: bsc,
        transport: custom(provider),
      });

      console.log(
        "WalletClient created with LocalAccount for EIP-7702 compatibility"
      );
      return walletClient;
    } catch (error) {
      console.error("Failed to create WalletClient with LocalAccount:", error);
      throw new Error(
        `WalletAdapter initialization failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  static async getAddress(walletClient: WalletClient): Promise<string> {
    const [address] = await walletClient.getAddresses();
    if (!address) {
      throw new Error("No address found in wallet client");
    }
    return address;
  }
}
