"use client";

import { Web3AuthProvider } from "@web3auth/modal/react";
import { WEB3AUTH_NETWORK, type Web3AuthOptions } from "@web3auth/modal";
import { type Web3AuthContextConfig } from "@web3auth/modal/react";

const web3AuthOptions: Web3AuthOptions = {
  clientId: process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID ?? "",
  web3AuthNetwork:
    process.env.NEXT_PUBLIC_DEFAULT_NETWORK === "mainnet"
      ? WEB3AUTH_NETWORK.SAPPHIRE_MAINNET
      : WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
  defaultChainId:
    process.env.NEXT_PUBLIC_DEFAULT_NETWORK === "mainnet" ? "0x38" : "0x61",
  storageType: "cookies",
};

const web3AuthContextConfig: Web3AuthContextConfig = {
  web3AuthOptions,
};

export const Web3AuthProviderWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <Web3AuthProvider config={web3AuthContextConfig}>
      {children}
    </Web3AuthProvider>
  );
};
