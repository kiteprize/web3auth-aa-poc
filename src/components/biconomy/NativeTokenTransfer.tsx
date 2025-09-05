"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send } from "lucide-react";
import { useState } from "react";
import type { Address } from "viem";

import TransactionStatusBadge, { type TransactionState } from "./TransactionStatusBadge";
import TxHashLink from "./TxHashLink";

interface NativeTokenTransferProps {
  onTransfer: (to: Address, amount: string) => Promise<void>;
  disabled?: boolean;
}

export default function NativeTokenTransfer({ onTransfer, disabled = false }: NativeTokenTransferProps) {
  const [txState, setTxState] = useState<TransactionState>({ status: "idle" });
  const [form, setForm] = useState({
    to: "" as Address | "",
    amount: "",
  });

  const handleTransfer = async () => {
    if (!form.to || !form.amount) return;
    
    setTxState({ status: "pending" });
    
    try {
      await onTransfer(form.to as Address, form.amount);
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
          <Send className="w-5 h-5" />
          네이티브 토큰 전송 (BNB)
          <TransactionStatusBadge tx={txState} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="native-to">받는 주소</Label>
          <Input
            id="native-to"
            placeholder="0x..."
            value={form.to}
            onChange={(e) => setForm({ ...form, to: e.target.value as Address })}
            disabled={disabled || txState.status === "pending"}
          />
        </div>
        <div>
          <Label htmlFor="native-amount">전송량 (BNB)</Label>
          <Input
            id="native-amount"
            type="number"
            step="0.001"
            placeholder="0.001"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            disabled={disabled || txState.status === "pending"}
          />
        </div>
        <Button
          onClick={handleTransfer}
          disabled={
            disabled ||
            txState.status === "pending" ||
            !form.to ||
            !form.amount
          }
          className="w-full"
        >
          {txState.status === "pending" ? "전송 중..." : "BNB 전송"}
        </Button>
        {txState.error && (
          <p className="text-red-500 text-sm">{txState.error}</p>
        )}
        <TxHashLink hash={txState.hash} />
      </CardContent>
    </Card>
  );
}