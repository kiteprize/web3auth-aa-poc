"use client";

import web3AuthContextConfig from "@/contexts/web3authContext";
import { Web3AuthProvider } from "@web3auth/modal/react";

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