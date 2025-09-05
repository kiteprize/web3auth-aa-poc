"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package } from "lucide-react";
import { useState } from "react";
import type { Address } from "viem";

import type { TransactionRequest } from "@/lib/biconomy/types";
import TransactionStatusBadge, { type TransactionState } from "./TransactionStatusBadge";
import TxHashLink from "./TxHashLink";

interface BatchTransactionProps {
  onExecute: (transactions: TransactionRequest[]) => Promise<void>;
  disabled?: boolean;
}

export default function BatchTransaction({ onExecute, disabled = false }: BatchTransactionProps) {
  const [txState, setTxState] = useState<TransactionState>({ status: "idle" });
  const [form, setForm] = useState({
    calls: [
      { to: "" as Address | "", value: "", data: "0x" as `0x${string}` },
      { to: "" as Address | "", value: "", data: "0x" as `0x${string}` },
    ],
  });

  const handleExecute = async () => {
    const validCalls = form.calls.filter((call) => call.to);
    if (validCalls.length === 0) return;

    setTxState({ status: "pending" });
    
    try {
      const transactions = validCalls.map((call) => ({
        to: call.to as Address,
        value: call.value ? BigInt(call.value) : BigInt(0),
        data: call.data,
      }));
      
      await onExecute(transactions);
      setTxState({ status: "success" });
    } catch (error) {
      setTxState({
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          배치 트랜잭션
          <TransactionStatusBadge tx={txState} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {form.calls.map((call, index) => (
          <div key={index} className="border rounded-lg p-3 space-y-2">
            <Label>트랜잭션 {index + 1}</Label>
            <Input
              placeholder="주소 (0x...)"
              value={call.to}
              onChange={(e) => {
                const newCalls = [...form.calls];
                newCalls[index].to = e.target.value as Address;
                setForm({ calls: newCalls });
              }}
              disabled={disabled || txState.status === "pending"}
            />
            <Input
              placeholder="값 (wei, 선택사항)"
              value={call.value}
              onChange={(e) => {
                const newCalls = [...form.calls];
                newCalls[index].value = e.target.value;
                setForm({ calls: newCalls });
              }}
              disabled={disabled || txState.status === "pending"}
            />
            <Input
              placeholder="데이터 (0x...)"
              value={call.data}
              onChange={(e) => {
                const newCalls = [...form.calls];
                newCalls[index].data = e.target.value as `0x${string}`;
                setForm({ calls: newCalls });
              }}
              disabled={disabled || txState.status === "pending"}
            />
          </div>
        ))}
        <Button
          onClick={handleExecute}
          disabled={
            disabled ||
            txState.status === "pending" ||
            form.calls.every((call) => !call.to)
          }
          className="w-full"
        >
          {txState.status === "pending" ? "실행 중..." : "배치 실행"}
        </Button>
        {txState.error && (
          <p className="text-red-500 text-sm">{txState.error}</p>
        )}
        <TxHashLink hash={txState.hash} />
      </CardContent>
    </Card>
  );
}