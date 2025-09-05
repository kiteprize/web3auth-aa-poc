"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import type { Address } from "viem";

interface ConnectionStatusProps {
  accountAddress: Address;
  chainId?: number;
}

export default function ConnectionStatus({ accountAddress, chainId = 56 }: ConnectionStatusProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          Biconomy MEE 연결됨
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">계정 주소:</span>
            <p className="font-mono text-xs break-all">{accountAddress}</p>
          </div>
          <div>
            <span className="text-gray-500">체인 ID:</span>
            <p>{chainId} (BNB Smart Chain)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}