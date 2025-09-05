"use client";

import { ExternalLink } from "lucide-react";

interface TxHashLinkProps {
  hash?: string;
}

export default function TxHashLink({ hash }: TxHashLinkProps) {
  if (!hash) return null;
  
  const explorerUrl = `https://bscscan.com/tx/${hash}`;
  
  return (
    <a
      href={explorerUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-500 hover:text-blue-600 text-xs flex items-center gap-1"
    >
      <ExternalLink className="w-3 h-3" />
      BSCScan에서 보기
    </a>
  );
}