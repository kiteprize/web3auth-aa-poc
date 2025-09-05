"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { type Address, type Hash } from "viem";
import { bsc } from "viem/chains";
import { useWeb3Auth } from "@web3auth/modal/react";

import { BiconomyServiceFactory } from "@/lib/biconomy/factories/BiconomyServiceFactory";
import { WalletAdapter } from "@/lib/biconomy/utils/walletAdapter";
import type { BiconomyContextType, TransactionRequest } from "@/lib/biconomy/types";
import type { ITransactionService } from "@/lib/biconomy/interfaces/IBiconomyService";
import type { ITransactionNotificationService } from "@/lib/biconomy/interfaces/INotificationService";

const BiconomyContext = createContext<BiconomyContextType | undefined>(undefined);

interface BiconomyProviderProps {
  children: ReactNode;
}

export function BiconomyProvider({ children }: BiconomyProviderProps) {
  const { provider } = useWeb3Auth();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [accountAddress, setAccountAddress] = useState<Address | undefined>(undefined);
  
  // 무한 루프 방지를 위한 ref
  const hasAttemptedConnection = useRef(false);
  const lastProviderRef = useRef(provider);
  
  const [transactionService] = useState<ITransactionService>(() => 
    BiconomyServiceFactory.createTransactionService()
  );
  const [notificationService] = useState<ITransactionNotificationService>(() => 
    BiconomyServiceFactory.createNotificationService()
  );

  const connect = useCallback(async () => {
    if (!provider) {
      notificationService.showError("Web3Auth provider not available");
      return;
    }

    // 이미 연결 중이거나 연결된 경우 중복 시도 방지
    if (isLoading || isConnected) {
      return;
    }

    setIsLoading(true);
    hasAttemptedConnection.current = true;
    
    try {
      const walletClient = await WalletAdapter.createFromWeb3AuthProvider(provider);
      await transactionService.initialize(walletClient);
      
      const address = transactionService.getAccountAddress();
      if (address) {
        setAccountAddress(address);
        setIsConnected(true);
        notificationService.showSuccess("Biconomy MEE 연결 성공!");
        console.log("Biconomy connected successfully:", address);
      }
    } catch (error) {
      console.error("Failed to connect Biconomy:", error);
      notificationService.showError("Biconomy 연결 실패: " + (error as Error).message);
      // 에러 발생시 재시도하지 않음 (무한 루프 방지)
    } finally {
      setIsLoading(false);
    }
  }, [provider, transactionService, notificationService, isLoading, isConnected]);

  const disconnect = useCallback(() => {
    transactionService.disconnect();
    setIsConnected(false);
    setAccountAddress(undefined);
    hasAttemptedConnection.current = false; // 연결 해제 시 재시도 허용
    notificationService.showSuccess("Biconomy 연결 해제됨");
  }, [transactionService, notificationService]);

  // 수동 재연결 함수 (에러 이후 재시도를 위해)
  const reconnect = useCallback(async () => {
    console.log("Manual reconnection requested...");
    hasAttemptedConnection.current = false;
    setIsConnected(false);
    setAccountAddress(undefined);
    await connect();
  }, [connect]);

  const sendNativeToken = useCallback(async (to: Address, amount: string): Promise<Hash> => {
    if (!isConnected) {
      throw new Error("Biconomy not connected");
    }
    
    return notificationService.notifyNativeTokenTransfer(amount)(
      transactionService.sendNativeToken(to, amount)
    );
  }, [isConnected, transactionService, notificationService]);

  const sendBEP20Token = useCallback(async (tokenAddress: Address, to: Address, amount: string): Promise<Hash> => {
    if (!isConnected) {
      throw new Error("Biconomy not connected");
    }
    
    return notificationService.notifyBEP20TokenTransfer(amount)(
      transactionService.sendBEP20Token(tokenAddress, to, amount)
    );
  }, [isConnected, transactionService, notificationService]);

  const executeSimpleTransaction = useCallback(async (to: Address, data?: `0x${string}`): Promise<Hash> => {
    if (!isConnected) {
      throw new Error("Biconomy not connected");
    }
    
    return notificationService.notifySimpleTransaction()(
      transactionService.executeSimpleTransaction(to, data)
    );
  }, [isConnected, transactionService, notificationService]);

  const executeBatchTransaction = useCallback(async (calls: TransactionRequest[]): Promise<Hash> => {
    if (!isConnected) {
      throw new Error("Biconomy not connected");
    }
    
    return notificationService.notifyBatchTransaction(calls.length)(
      transactionService.executeBatchTransaction(calls)
    );
  }, [isConnected, transactionService, notificationService]);

  // Web3Auth provider 변경 시 자동으로 재연결 시도 (무한 루프 방지)
  useEffect(() => {
    lastProviderRef.current = provider;

    const handleConnect = async () => {
      if (!provider) {
        notificationService.showError("Web3Auth provider not available");
        return;
      }

      if (isLoading || isConnected) {
        return;
      }

      setIsLoading(true);
      hasAttemptedConnection.current = true;
      
      try {
        const walletClient = await WalletAdapter.createFromWeb3AuthProvider(provider);
        await transactionService.initialize(walletClient);
        
        const address = transactionService.getAccountAddress();
        if (address) {
          setAccountAddress(address);
          setIsConnected(true);
          notificationService.showSuccess("Biconomy MEE 연결 성공!");
          console.log("Biconomy connected successfully:", address);
        }
      } catch (error) {
        console.error("Failed to connect Biconomy:", error);
        notificationService.showError("Biconomy 연결 실패: " + (error as Error).message);
        // 에러 발생시 재시도하지 않음 (무한 루프 방지)
      } finally {
        setIsLoading(false);
      }
    };

    const handleDisconnect = () => {
      transactionService.disconnect();
      setIsConnected(false);
      setAccountAddress(undefined);
      hasAttemptedConnection.current = false;
      notificationService.showSuccess("Biconomy 연결 해제됨");
    };

    // provider가 있고, 아직 연결되지 않았고, 로딩 중이 아닌 경우
    if (provider && !isConnected && !isLoading && !hasAttemptedConnection.current) {
      console.log("Web3Auth provider available, attempting to connect Biconomy...");
      handleConnect();
    } 
    // provider가 없어졌고 연결되어 있는 경우
    else if (!provider && isConnected) {
      console.log("Web3Auth provider lost, disconnecting Biconomy...");
      handleDisconnect();
    }
  }, [provider, isConnected, isLoading, transactionService, notificationService]);

  const contextValue: BiconomyContextType = {
    isConnected,
    isLoading,
    accountAddress,
    chainId: bsc.id,
    connect,
    disconnect,
    reconnect,
    sendNativeToken,
    sendBEP20Token,
    executeSimpleTransaction,
    executeBatchTransaction,
  };

  return (
    <BiconomyContext.Provider value={contextValue}>
      {children}
    </BiconomyContext.Provider>
  );
}

export function useBiconomy(): BiconomyContextType {
  const context = useContext(BiconomyContext);
  if (context === undefined) {
    throw new Error("useBiconomy must be used within a BiconomyProvider");
  }
  return context;
}