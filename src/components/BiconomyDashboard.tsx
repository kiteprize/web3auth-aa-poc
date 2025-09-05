"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Package,
  Send,
  Wallet,
  XCircle,
  Zap,
} from "lucide-react";
import React, { useState } from "react";
import type { Address } from "viem";

import TransactionProgress, { createDefaultSteps, type TransactionStep } from "@/components/TransactionProgress";
import { useBiconomy } from "@/contexts/biconomyContext";
import { MAINNET_TOKENS } from "@/lib/biconomy/config";
import { TransactionTracker } from "@/lib/biconomy/services/TransactionTracker";

interface TransactionState {
  hash?: string;
  status: "idle" | "pending" | "success" | "error";
  error?: string;
}

export default function BiconomyDashboard() {
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

  // Transaction states
  const [nativeTokenTx, setNativeTokenTx] = useState<TransactionState>({
    status: "idle",
  });
  const [bep20TokenTx, setBep20TokenTx] = useState<TransactionState>({
    status: "idle",
  });
  const [simpleTx, setSimpleTx] = useState<TransactionState>({
    status: "idle",
  });
  const [batchTx, setBatchTx] = useState<TransactionState>({ status: "idle" });

  // Form states
  const [nativeForm, setNativeForm] = useState({
    to: "" as Address | "",
    amount: "",
  });

  const [bep20Form, setBep20Form] = useState({
    tokenAddress: MAINNET_TOKENS.USDT.address,
    to: "" as Address | "",
    amount: "",
  });

  const [simpleForm, setSimpleForm] = useState({
    to: "" as Address | "",
    data: "0x" as `0x${string}`,
  });

  const [batchForm, setBatchForm] = useState({
    calls: [
      { to: "" as Address | "", value: "", data: "0x" as `0x${string}` },
      { to: "" as Address | "", value: "", data: "0x" as `0x${string}` },
    ],
  });

  const executeTransaction = async (
    txFunction: () => Promise<string>,
    setTxState: React.Dispatch<React.SetStateAction<TransactionState>>
  ) => {
    setTxState({ status: "pending" });
    
    try {
      const hash = await tracker.trackTransaction(txFunction(), createDefaultSteps());
      setCurrentTransactionHash(hash);
      setTxState({ status: "success", hash });
    } catch (error) {
      setTxState({
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleNativeTokenTransfer = async () => {
    if (!nativeForm.to || !nativeForm.amount) return;
    await executeTransaction(
      () => sendNativeToken(nativeForm.to as Address, nativeForm.amount),
      setNativeTokenTx
    );
  };

  const handleBEP20TokenTransfer = async () => {
    if (!bep20Form.to || !bep20Form.amount) return;
    await executeTransaction(
      () =>
        sendBEP20Token(
          bep20Form.tokenAddress,
          bep20Form.to as Address,
          bep20Form.amount
        ),
      setBep20TokenTx
    );
  };

  const handleSimpleTransaction = async () => {
    if (!simpleForm.to) return;
    await executeTransaction(
      () => executeSimpleTransaction(simpleForm.to as Address, simpleForm.data),
      setSimpleTx
    );
  };

  const handleBatchTransaction = async () => {
    const validCalls = batchForm.calls.filter((call) => call.to);
    if (validCalls.length === 0) return;

    await executeTransaction(
      () =>
        executeBatchTransaction(
          validCalls.map((call) => ({
            to: call.to as Address,
            value: call.value ? BigInt(call.value) : BigInt(0),
            data: call.data,
          }))
        ),
      setBatchTx
    );
  };

  const TransactionStatusBadge = ({ tx }: { tx: TransactionState }) => {
    switch (tx.status) {
      case "pending":
        return (
          <Badge variant='outline' className='text-yellow-600'>
            <AlertCircle className='w-3 h-3 mr-1' />
            진행중
          </Badge>
        );
      case "success":
        return (
          <Badge variant='outline' className='text-green-600'>
            <CheckCircle className='w-3 h-3 mr-1' />
            성공
          </Badge>
        );
      case "error":
        return (
          <Badge variant='outline' className='text-red-600'>
            <XCircle className='w-3 h-3 mr-1' />
            실패
          </Badge>
        );
      default:
        return null;
    }
  };

  const TxHashLink = ({ hash }: { hash?: string }) => {
    if (!hash) return null;
    const explorerUrl = `https://bscscan.com/tx/${hash}`;
    return (
      <a
        href={explorerUrl}
        target='_blank'
        rel='noopener noreferrer'
        className='text-blue-500 hover:text-blue-600 text-xs flex items-center gap-1'
      >
        <ExternalLink className='w-3 h-3' />
        BSCScan에서 보기
      </a>
    );
  };

  if (!isConnected) {
    return (
      <div className='max-w-4xl mx-auto p-6'>
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <Wallet className='w-12 h-12 text-gray-400 mb-4' />
            <h3 className='text-lg font-semibold text-gray-900 mb-2'>
              Biconomy 연결 필요
            </h3>
            <p className='text-gray-500 mb-6 text-center'>
              수수료 대납 기능을 사용하려면 먼저 Web3Auth로 로그인하세요.
            </p>
            <Button
              onClick={connect}
              disabled={isLoading}
              className='bg-blue-600 hover:bg-blue-700'
            >
              {isLoading ? "연결 중..." : "Biconomy 연결"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='max-w-6xl mx-auto p-6 space-y-6'>
      {/* 연결 상태 */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <CheckCircle className='w-5 h-5 text-green-500' />
            Biconomy MEE 연결됨
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
            <div>
              <span className='text-gray-500'>계정 주소:</span>
              <p className='font-mono text-xs break-all'>{accountAddress}</p>
            </div>
            <div>
              <span className='text-gray-500'>체인 ID:</span>
              <p>{chainId} (BNB Smart Chain)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* 네이티브 토큰 전송 */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Send className='w-5 h-5' />
              네이티브 토큰 전송 (BNB)
              <TransactionStatusBadge tx={nativeTokenTx} />
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div>
              <Label htmlFor='native-to'>받는 주소</Label>
              <Input
                id='native-to'
                placeholder='0x...'
                value={nativeForm.to}
                onChange={(e) =>
                  setNativeForm({
                    ...nativeForm,
                    to: e.target.value as Address,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor='native-amount'>전송량 (BNB)</Label>
              <Input
                id='native-amount'
                type='number'
                step='0.001'
                placeholder='0.001'
                value={nativeForm.amount}
                onChange={(e) =>
                  setNativeForm({ ...nativeForm, amount: e.target.value })
                }
              />
            </div>
            <Button
              onClick={handleNativeTokenTransfer}
              disabled={
                nativeTokenTx.status === "pending" ||
                !nativeForm.to ||
                !nativeForm.amount
              }
              className='w-full'
            >
              {nativeTokenTx.status === "pending" ? "전송 중..." : "BNB 전송"}
            </Button>
            {nativeTokenTx.error && (
              <p className='text-red-500 text-sm'>{nativeTokenTx.error}</p>
            )}
            <TxHashLink hash={nativeTokenTx.hash} />
          </CardContent>
        </Card>

        {/* BEP-20 토큰 전송 */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Send className='w-5 h-5' />
              BEP-20 토큰 전송
              <TransactionStatusBadge tx={bep20TokenTx} />
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div>
              <Label htmlFor='token-select'>토큰 선택</Label>
              <select
                id='token-select'
                value={bep20Form.tokenAddress}
                onChange={(e) =>
                  setBep20Form({
                    ...bep20Form,
                    tokenAddress: e.target.value as Address,
                  })
                }
                className='w-full p-2 border border-gray-300 rounded-md'
              >
                {Object.entries(MAINNET_TOKENS).map(([key, token]) => (
                  <option key={key} value={token.address}>
                    {token.symbol} - {token.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor='bep20-to'>받는 주소</Label>
              <Input
                id='bep20-to'
                placeholder='0x...'
                value={bep20Form.to}
                onChange={(e) =>
                  setBep20Form({ ...bep20Form, to: e.target.value as Address })
                }
              />
            </div>
            <div>
              <Label htmlFor='bep20-amount'>전송량</Label>
              <Input
                id='bep20-amount'
                type='number'
                step='0.1'
                placeholder='1.0'
                value={bep20Form.amount}
                onChange={(e) =>
                  setBep20Form({ ...bep20Form, amount: e.target.value })
                }
              />
            </div>
            <Button
              onClick={handleBEP20TokenTransfer}
              disabled={
                bep20TokenTx.status === "pending" ||
                !bep20Form.to ||
                !bep20Form.amount
              }
              className='w-full'
            >
              {bep20TokenTx.status === "pending" ? "전송 중..." : "토큰 전송"}
            </Button>
            {bep20TokenTx.error && (
              <p className='text-red-500 text-sm'>{bep20TokenTx.error}</p>
            )}
            <TxHashLink hash={bep20TokenTx.hash} />
          </CardContent>
        </Card>

        {/* 간단한 트랜잭션 */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Zap className='w-5 h-5' />
              간단한 트랜잭션
              <TransactionStatusBadge tx={simpleTx} />
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div>
              <Label htmlFor='simple-to'>컨트랙트 주소</Label>
              <Input
                id='simple-to'
                placeholder='0x...'
                value={simpleForm.to}
                onChange={(e) =>
                  setSimpleForm({
                    ...simpleForm,
                    to: e.target.value as Address,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor='simple-data'>데이터 (hex)</Label>
              <Input
                id='simple-data'
                placeholder='0x'
                value={simpleForm.data}
                onChange={(e) =>
                  setSimpleForm({
                    ...simpleForm,
                    data: e.target.value as `0x${string}`,
                  })
                }
              />
            </div>
            <Button
              onClick={handleSimpleTransaction}
              disabled={simpleTx.status === "pending" || !simpleForm.to}
              className='w-full'
            >
              {simpleTx.status === "pending" ? "실행 중..." : "트랜잭션 실행"}
            </Button>
            {simpleTx.error && (
              <p className='text-red-500 text-sm'>{simpleTx.error}</p>
            )}
            <TxHashLink hash={simpleTx.hash} />
          </CardContent>
        </Card>

        {/* 배치 트랜잭션 */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Package className='w-5 h-5' />
              배치 트랜잭션
              <TransactionStatusBadge tx={batchTx} />
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            {batchForm.calls.map((call, index) => (
              <div key={index} className='border rounded-lg p-3 space-y-2'>
                <Label>트랜잭션 {index + 1}</Label>
                <Input
                  placeholder='주소 (0x...)'
                  value={call.to}
                  onChange={(e) => {
                    const newCalls = [...batchForm.calls];
                    newCalls[index].to = e.target.value as Address;
                    setBatchForm({ calls: newCalls });
                  }}
                />
                <Input
                  placeholder='값 (wei, 선택사항)'
                  value={call.value}
                  onChange={(e) => {
                    const newCalls = [...batchForm.calls];
                    newCalls[index].value = e.target.value;
                    setBatchForm({ calls: newCalls });
                  }}
                />
                <Input
                  placeholder='데이터 (0x...)'
                  value={call.data}
                  onChange={(e) => {
                    const newCalls = [...batchForm.calls];
                    newCalls[index].data = e.target.value as `0x${string}`;
                    setBatchForm({ calls: newCalls });
                  }}
                />
              </div>
            ))}
            <Button
              onClick={handleBatchTransaction}
              disabled={
                batchTx.status === "pending" ||
                batchForm.calls.every((call) => !call.to)
              }
              className='w-full'
            >
              {batchTx.status === "pending" ? "실행 중..." : "배치 실행"}
            </Button>
            {batchTx.error && (
              <p className='text-red-500 text-sm'>{batchTx.error}</p>
            )}
            <TxHashLink hash={batchTx.hash} />
          </CardContent>
        </Card>
      </div>

      {/* 트랜잭션 진행 상황 */}
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
