"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap } from "lucide-react";
import { useState } from "react";
import type { Address } from "viem";

import TransactionStatusBadge, { type TransactionState } from "./TransactionStatusBadge";
import TxHashLink from "./TxHashLink";

interface SimpleTransactionProps {
  onExecute: (to: Address, data?: `0x${string}`) => Promise<void>;
  disabled?: boolean;
}

export default function SimpleTransaction({ onExecute, disabled = false }: SimpleTransactionProps) {
  const [txState, setTxState] = useState<TransactionState>({ status: "idle" });
  const [form, setForm] = useState({
    to: "" as Address | "",
    data: "0x" as `0x${string}`,
  });

  const handleExecute = async () => {
    if (!form.to) return;
    
    setTxState({ status: "pending" });
    
    try {
      await onExecute(form.to as Address, form.data);
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
          <Zap className="w-5 h-5" />
          간단한 트랜잭션
          <TransactionStatusBadge tx={txState} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="simple-to">컨트랙트 주소</Label>
          <Input
            id="simple-to"
            placeholder="0x..."
            value={form.to}
            onChange={(e) => setForm({ ...form, to: e.target.value as Address })}
            disabled={disabled || txState.status === "pending"}
          />
        </div>
        <div>
          <Label htmlFor="simple-data">데이터 (hex)</Label>
          <Input
            id="simple-data"
            placeholder="0x"
            value={form.data}
            onChange={(e) => setForm({ ...form, data: e.target.value as `0x${string}` })}
            disabled={disabled || txState.status === "pending"}
          />
        </div>
        <Button
          onClick={handleExecute}
          disabled={disabled || txState.status === "pending" || !form.to}
          className="w-full"
        >
          {txState.status === "pending" ? "실행 중..." : "트랜잭션 실행"}
        </Button>
        {txState.error && (
          <p className="text-red-500 text-sm">{txState.error}</p>
        )}
        <TxHashLink hash={txState.hash} />
      </CardContent>
    </Card>
  );
}