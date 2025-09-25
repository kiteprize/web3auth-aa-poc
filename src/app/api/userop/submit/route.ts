// Redis 기반 UserOperation 제출 API

import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, getContract, http } from "viem";
import { UserOpQueue, type QueuedUserOp } from "@/lib/redis/queue";
import { TransactionExecutor } from "@/lib/userOperation";
import { getNetworkConfig, getContractAddresses, getApiBaseUrl } from "@/config/environment";
import { EntryPointV08ABI } from "@/lib/aa/abi/EntryPointV08";

// Runtime 설정
export const runtime = "nodejs";
export const maxDuration = 120;

// 환경 설정 가져오기
const networkConfig = getNetworkConfig();
const contractAddresses = getContractAddresses();

// viem client 설정
const publicClient = createPublicClient({
  chain: networkConfig.chain,
  transport: http(networkConfig.rpcUrl),
});

// EntryPoint ABI - simulateValidation, getUserOpHash 함수만 (최소 ABI 사용)

// 문자열로 받은 BigInt 필드들을 BigInt로 변환
function deserializeUserOperation(op: any): any {
  return {
    ...op,
    nonce: typeof op.nonce === "string" ? BigInt(op.nonce) : op.nonce,
    preVerificationGas:
      typeof op.preVerificationGas === "string"
        ? BigInt(op.preVerificationGas)
        : op.preVerificationGas,
  };
}

// 기본 UserOperation 검증
function validateUserOpShape(op: any): void {
  const requiredFields = [
    "sender",
    "nonce",
    "initCode",
    "callData",
    "accountGasLimits",
    "preVerificationGas",
    "gasFees",
    "paymasterAndData",
    "signature",
  ];

  for (const field of requiredFields) {
    if (!(field in op)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  if (typeof op.sender !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(op.sender)) {
    throw new Error("Invalid sender address");
  }

  if (
    typeof op.signature !== "string" ||
    op.signature === "0x" ||
    !op.signature
  ) {
    throw new Error("Signature is required");
  }
}

export async function POST(req: NextRequest) {
  const transactionExecutor = new TransactionExecutor(getApiBaseUrl());
  try {
    // 요청 파싱 및 역직렬화
    const {
      userOp: rawUserOp,
      waitForExecution = true,
      skipValidation = false,
    } = await req.json();
    validateUserOpShape(rawUserOp);

    // 문자열로 받은 BigInt 값들을 다시 BigInt로 변환
    const userOp = deserializeUserOperation(rawUserOp);
    const sender = userOp.sender as string;

    // 레이트 리미팅 체크 (Redis 기반)
    const rateLimit = await UserOpQueue.checkRateLimit(sender);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "RATE_LIMIT",
          message: "하루 10건 제한을 초과했습니다.",
          remaining: rateLimit.remaining,
          reset: rateLimit.reset,
        },
        { status: 429 }
      );
    }

    // 사전 검증: simulateValidation (선택적)
    if (!skipValidation) {
      try {
        await publicClient.simulateContract({
          address: contractAddresses.entryPointAddress,
          abi: EntryPointV08ABI,
          functionName: "simulateValidation",
          args: [userOp],
        });
      } catch (e: any) {
        console.warn("❌ Validation failed:", e?.shortMessage || e?.message);
        return NextResponse.json(
          {
            error: "VALIDATION_FAILED",
            message:
              e?.shortMessage ||
              e?.message ||
              "UserOperation validation failed",
            rateLimit: {
              remaining: rateLimit.remaining,
              reset: rateLimit.reset,
            },
          },
          { status: 400 }
        );
      }
    } else {
      console.log("⚠️  Skipping simulateValidation as requested");
    }

    // UserOpHash 계산
    const entryPointRead = getContract({
      address: contractAddresses.entryPointAddress,
      abi: EntryPointV08ABI,
      client: publicClient,
    });
    const userOpHash = await entryPointRead.read.getUserOpHash([userOp]);

    // Redis 큐에 추가
    const requestId = crypto.randomUUID();
    const queuedUserOp: QueuedUserOp = {
      requestId,
      userOp,
      userOpHash,
      sender,
      submittedAt: Date.now(),
      retryCount: 0,
    };

    await UserOpQueue.enqueue(queuedUserOp);

    console.log(`📝 UserOp queued: ${userOpHash.slice(0, 10)}...`);

    transactionExecutor.triggerWorker();

    // 즉시 반환 모드 (비동기 처리)
    if (!waitForExecution) {
      return NextResponse.json({
        requestId,
        userOpHash,
        status: "queued",
        message: "UserOperation queued for processing",
        rateLimit: { remaining: rateLimit.remaining, reset: rateLimit.reset },
        queueSize: await UserOpQueue.getQueueSize(),
      });
    }

    // 동기 대기 모드 (기존 호환성)
    const maxWaitTime = 90000; // 90초
    const pollInterval = 1000; // 1초
    const startTime = Date.now();

    console.log(`⏳ Waiting for UserOp processing: ${requestId}`);

    while (Date.now() - startTime < maxWaitTime) {
      const result = await UserOpQueue.getResult(requestId);

      if (result) {
        // 결과를 찾았으면 삭제하고 반환
        await UserOpQueue.deleteResult(requestId);

        return NextResponse.json({
          ...result,
          userOpHash,
          rateLimit: { remaining: rateLimit.remaining, reset: rateLimit.reset },
        });
      }

      // 1초 대기
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    // 타임아웃 (큐에서는 여전히 처리될 예정)
    return NextResponse.json(
      {
        error: "TIMEOUT",
        message: "처리 시간이 초과되었습니다. Worker를 통해 계속 처리됩니다.",
        requestId,
        userOpHash,
        rateLimit: { remaining: rateLimit.remaining, reset: rateLimit.reset },
        queueSize: await UserOpQueue.getQueueSize(),
      },
      { status: 504 }
    );
  } catch (error: any) {
    console.error("❌ Submit error:", error);
    return NextResponse.json(
      {
        error: "SUBMIT_ERROR",
        message: error?.message || "Failed to submit UserOperation",
      },
      { status: 500 }
    );
  }
}

// GET: 큐 상태 조회
export async function GET(_req: NextRequest) {
  try {
    const queueStatus = await UserOpQueue.getQueueStatus();

    return NextResponse.json({
      ...queueStatus,
      message: "UserOperation submission endpoint",
    });
  } catch (error: any) {
    console.error("❌ Queue status error:", error);
    return NextResponse.json(
      {
        error: "QUEUE_STATUS_ERROR",
        message: error?.message || "Failed to get queue status",
      },
      { status: 500 }
    );
  }
}
