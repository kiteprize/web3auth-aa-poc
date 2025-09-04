"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  Circle, 
  Loader2, 
  AlertCircle, 
  ExternalLink,
  FileText,
  Shield,
  Zap,
  Clock
} from "lucide-react";

export interface TransactionStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "error";
  timestamp?: Date;
  details?: string;
}

interface TransactionProgressProps {
  steps: TransactionStep[];
  currentStep?: string;
  userOpHash?: string;
  txHash?: string;
  networkConfig?: {
    blockExplorer?: string;
  };
  onReset?: () => void;
}

export default function TransactionProgress({
  steps,
  currentStep,
  userOpHash,
  txHash,
  networkConfig,
  onReset
}: TransactionProgressProps) {
  const getStepIcon = (step: TransactionStep) => {
    switch (step.status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "in_progress":
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStepColor = (step: TransactionStep) => {
    switch (step.status) {
      case "completed":
        return "text-green-600";
      case "in_progress":
        return "text-blue-600";
      case "error":
        return "text-red-600";
      default:
        return "text-gray-400";
    }
  };

  const getOverallStatus = () => {
    if (steps.some(step => step.status === "error")) {
      return { status: "error", color: "border-red-300 bg-red-100/80" };
    }
    if (steps.some(step => step.status === "in_progress")) {
      return { status: "in_progress", color: "border-blue-300 bg-blue-100/80" };
    }
    if (steps.every(step => step.status === "completed")) {
      return { status: "completed", color: "border-green-300 bg-green-100/80" };
    }
    return { status: "pending", color: "border-gray-300 bg-gray-100/80" };
  };

  const overallStatus = getOverallStatus();

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 1
    });
  };

  return (
    <Card className={`${overallStatus.color.replace('bg-', 'bg-gray-800 border-').replace('border-', 'border-')} bg-gray-800 border-gray-700`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-400" />
            <CardTitle className="text-sm font-medium text-white">트랜잭션 진행 상태</CardTitle>
            <Badge 
              variant={overallStatus.status === "completed" ? "default" : "secondary"}
              className={
                overallStatus.status === "completed" ? "bg-green-600 text-green-100" :
                overallStatus.status === "error" ? "bg-red-600 text-red-100" :
                overallStatus.status === "in_progress" ? "bg-blue-600 text-blue-100" :
                "bg-gray-600 text-gray-100"
              }
            >
              {overallStatus.status === "completed" ? "완료" :
               overallStatus.status === "error" ? "오류" :
               overallStatus.status === "in_progress" ? "진행중" : "대기"}
            </Badge>
          </div>
          {onReset && overallStatus.status !== "in_progress" && (
            <Button variant="ghost" size="sm" onClick={onReset} className="h-7 px-2 text-gray-300 hover:text-white hover:bg-gray-700">
              초기화
            </Button>
          )}
        </div>
        <CardDescription className="text-xs text-gray-300">
          가스리스 트랜잭션 처리 과정을 실시간으로 확인하세요
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-900 border border-gray-600">
              <div className="flex-shrink-0 mt-0.5">
                {getStepIcon(step)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className={`text-sm font-medium ${getStepColor(step).replace('text-gray-400', 'text-gray-500')}`}>
                    {step.title}
                  </h4>
                  {step.timestamp && (
                    <span className="text-xs text-gray-400">
                      {formatTimestamp(step.timestamp)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-300 mb-1">
                  {step.description}
                </p>
                {step.details && step.status === "error" && (
                  <p className="text-xs text-red-300 bg-red-900 p-2 rounded border border-red-600">
                    {step.details}
                  </p>
                )}
                {step.details && step.status === "completed" && (
                  <p className="text-xs text-green-300 font-medium">
                    ✅ {step.details}
                  </p>
                )}
              </div>
              {index < steps.length - 1 && (
                <div className="absolute left-[1.4rem] mt-8 w-px h-4 bg-gray-600"></div>
              )}
            </div>
          ))}
        </div>

        {/* Transaction Hashes */}
        {(userOpHash || txHash) && (
          <div className="space-y-2 pt-2 border-t border-gray-600">
            {userOpHash && (
              <div className="p-2 bg-blue-900/80 rounded border border-blue-600">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-3 h-3 text-blue-300" />
                  <span className="text-xs font-medium text-blue-100">
                    UserOperation Hash
                  </span>
                </div>
                <p className="text-xs text-blue-200 break-all font-mono">
                  {userOpHash}
                </p>
              </div>
            )}

            {txHash && (
              <div className="p-2 bg-green-900/80 rounded border border-green-600">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-300" />
                    <span className="text-xs font-medium text-green-100">
                      Transaction Hash
                    </span>
                  </div>
                  {networkConfig?.blockExplorer && (
                    <a
                      href={`${networkConfig.blockExplorer}/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-300 hover:text-blue-100 text-xs"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Explorer
                    </a>
                  )}
                </div>
                <p className="text-xs text-green-200 break-all font-mono">
                  {txHash}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 기본 트랜잭션 단계 템플릿
export const createDefaultSteps = (): TransactionStep[] => [
  {
    id: "prepare",
    title: "트랜잭션 준비",
    description: "트랜잭션 데이터를 준비하고 검증합니다",
    status: "pending"
  },
  {
    id: "sign",
    title: "서명 생성",
    description: "사용자 키로 트랜잭션에 서명합니다",
    status: "pending"
  },
  {
    id: "paymaster",
    title: "Paymaster 승인",
    description: "가스비 스폰서십을 위한 Paymaster 승인을 받습니다",
    status: "pending"
  },
  {
    id: "submit",
    title: "트랜잭션 제출",
    description: "UserOperation을 Bundler에 제출합니다",
    status: "pending"
  },
  {
    id: "execute",
    title: "블록체인 실행",
    description: "트랜잭션이 블록체인에서 실행됩니다",
    status: "pending"
  },
  {
    id: "confirm",
    title: "완료 확인",
    description: "트랜잭션이 성공적으로 완료되었습니다",
    status: "pending"
  }
];