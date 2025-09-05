"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Wallet } from "lucide-react";
import React, { useState } from "react";
import type { Address } from "viem";

import TransactionProgress, { createDefaultSteps, type TransactionStep } from "@/components/TransactionProgress";
import BatchTransaction from "@/components/biconomy/BatchTransaction";
import ConnectionStatus from "@/components/biconomy/ConnectionStatus";
import NativeTokenTransfer from "@/components/biconomy/NativeTokenTransfer";
import SimpleTransaction from "@/components/biconomy/SimpleTransaction";
import TokenTransfer from "@/components/biconomy/TokenTransfer";
import { useBiconomy } from "@/contexts/biconomyContext";
import { TransactionTracker } from "@/lib/biconomy/services/TransactionTracker";
import type { TransactionRequest } from "@/lib/biconomy/types";

export default function BiconomyDashboardRefactored() {
  const {
    isConnected,
    isLoading,
    accountAddress,
    chainId,
    connect,
    sendNativeToken,
    sendBEP20Token,
    executeSimpleTransaction,
    executeBatchTransaction,
  } = useBiconomy();

  // Transaction tracking
  const [transactionSteps, setTransactionSteps] = useState<TransactionStep[]>([]);
  const [currentTransactionHash, setCurrentTransactionHash] = useState<string | undefined>();
  const [tracker] = useState(() => new TransactionTracker((steps) => {
    setTransactionSteps(steps);
  }));

  const executeTransaction = async (txFunction: () => Promise<string>): Promise<void> => {
    try {
      const hash = await tracker.trackTransaction(txFunction(), createDefaultSteps());
      setCurrentTransactionHash(hash);
    } catch (error) {
      console.error("Transaction failed:", error);
      throw error;
    }
  };

  const handleNativeTokenTransfer = async (to: Address, amount: string) => {
    await executeTransaction(() => sendNativeToken(to, amount));
  };

  const handleTokenTransfer = async (tokenAddress: Address, to: Address, amount: string) => {
    await executeTransaction(() => sendBEP20Token(tokenAddress, to, amount));
  };

  const handleSimpleTransaction = async (to: Address, data?: `0x${string}`) => {
    await executeTransaction(() => executeSimpleTransaction(to, data));
  };

  const handleBatchTransaction = async (transactions: TransactionRequest[]) => {
    await executeTransaction(() => executeBatchTransaction(transactions));
  };

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wallet className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Biconomy 연결 필요
            </h3>
            <p className="text-gray-500 mb-6 text-center">
              수수료 대납 기능을 사용하려면 먼저 Web3Auth로 로그인하세요.
            </p>
            <Button
              onClick={connect}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? "연결 중..." : "Biconomy 연결"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Connection Status */}
      <ConnectionStatus
        accountAddress={accountAddress!}
        chainId={chainId}
      />

      {/* Transaction Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NativeTokenTransfer
          onTransfer={handleNativeTokenTransfer}
          disabled={isLoading}
        />
        
        <TokenTransfer
          onTransfer={handleTokenTransfer}
          disabled={isLoading}
        />
        
        <SimpleTransaction
          onExecute={handleSimpleTransaction}
          disabled={isLoading}
        />
        
        <BatchTransaction
          onExecute={handleBatchTransaction}
          disabled={isLoading}
        />
      </div>

      {/* Transaction Progress */}
      {transactionSteps.length > 0 && (
        <TransactionProgress
          steps={transactionSteps}
          txHash={currentTransactionHash}
          networkConfig={{
            blockExplorer: "https://bscscan.com"
          }}
          onReset={() => {
            tracker.reset();
            setCurrentTransactionHash(undefined);
          }}
        />
      )}
    </div>
  );
}