import { type Web3AuthContextConfig } from "@web3auth/modal/react";
import { WEB3AUTH_NETWORK, type Web3AuthOptions } from "@web3auth/modal";

const clientId =
  "BHj47Vic7HtkPuSTLYDUhUDuYy8hBf-KgADruO9VB0XeqYovaDJcesGTlu64YwY0R-t3J_U60JIv3pKVFMVG4wE";

const web3AuthOptions: Web3AuthOptions = {
  clientId: process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID ?? clientId,
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

export default web3AuthContextConfig;
