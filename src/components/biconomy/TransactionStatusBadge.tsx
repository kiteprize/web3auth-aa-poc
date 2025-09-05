"use client";

import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";

interface TransactionState {
  hash?: string;
  status: "idle" | "pending" | "success" | "error";
  error?: string;
}

interface TransactionStatusBadgeProps {
  tx: TransactionState;
}

export default function TransactionStatusBadge({ tx }: TransactionStatusBadgeProps) {
  switch (tx.status) {
    case "pending":
      return (
        <Badge variant="outline" className="text-yellow-600">
          <AlertCircle className="w-3 h-3 mr-1" />
          진행중
        </Badge>
      );
    case "success":
      return (
        <Badge variant="outline" className="text-green-600">
          <CheckCircle className="w-3 h-3 mr-1" />
          성공
        </Badge>
      );
    case "error":
      return (
        <Badge variant="outline" className="text-red-600">
          <XCircle className="w-3 h-3 mr-1" />
          실패
        </Badge>
      );
    default:
      return null;
  }
}

export type { TransactionState };