"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send } from "lucide-react";
import { useState } from "react";
import type { Address } from "viem";

import { MAINNET_TOKENS } from "@/lib/biconomy/config";
import TransactionStatusBadge, { type TransactionState } from "./TransactionStatusBadge";
import TxHashLink from "./TxHashLink";

interface TokenTransferProps {
  onTransfer: (tokenAddress: Address, to: Address, amount: string) => Promise<void>;
  disabled?: boolean;
}

export default function TokenTransfer({ onTransfer, disabled = false }: TokenTransferProps) {
  const [txState, setTxState] = useState<TransactionState>({ status: "idle" });
  const [form, setForm] = useState({
    tokenAddress: MAINNET_TOKENS.USDT.address,
    to: "" as Address | "",
    amount: "",
  });

  const handleTransfer = async () => {
    if (!form.to || !form.amount) return;
    
    setTxState({ status: "pending" });
    
    try {
      await onTransfer(form.tokenAddress, form.to as Address, form.amount);
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
          BEP-20 토큰 전송
          <TransactionStatusBadge tx={txState} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="token-select">토큰 선택</Label>
          <select
            id="token-select"
            value={form.tokenAddress}
            onChange={(e) => setForm({ ...form, tokenAddress: e.target.value as Address })}
            className="w-full p-2 border border-gray-300 rounded-md"
            disabled={disabled || txState.status === "pending"}
          >
            {Object.entries(MAINNET_TOKENS).map(([key, token]) => (
              <option key={key} value={token.address}>
                {token.symbol} - {token.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="token-to">받는 주소</Label>
          <Input
            id="token-to"
            placeholder="0x..."
            value={form.to}
            onChange={(e) => setForm({ ...form, to: e.target.value as Address })}
            disabled={disabled || txState.status === "pending"}
          />
        </div>
        <div>
          <Label htmlFor="token-amount">전송량</Label>
          <Input
            id="token-amount"
            type="number"
            step="0.1"
            placeholder="1.0"
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
          {txState.status === "pending" ? "전송 중..." : "토큰 전송"}
        </Button>
        {txState.error && (
          <p className="text-red-500 text-sm">{txState.error}</p>
        )}
        <TxHashLink hash={txState.hash} />
      </CardContent>
    </Card>
  );
}