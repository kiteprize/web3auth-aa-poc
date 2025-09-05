import { createWalletClient, custom, type WalletClient, type Address } from "viem";
import { bsc } from "viem/chains";
import type { IProvider } from "@web3auth/base";

export class WalletAdapter {
  static async createFromWeb3AuthProvider(provider: IProvider): Promise<WalletClient> {
    // First create a basic client to get the account address
    const basicClient = createWalletClient({
      chain: bsc,
      transport: custom(provider),
    });
    
    // Get the account address from Web3Auth provider
    const [account] = await basicClient.getAddresses();
    if (!account) {
      throw new Error("No account found in Web3Auth provider");
    }
    
    // Create the wallet client with explicit account for EIP-7702 signing
    return createWalletClient({
      account: account as Address,
      chain: bsc,
      transport: custom(provider),
    });
  }

  static async getAddress(walletClient: WalletClient): Promise<string> {
    const [address] = await walletClient.getAddresses();
    if (!address) {
      throw new Error("No address found in wallet client");
    }
    return address;
  }
}