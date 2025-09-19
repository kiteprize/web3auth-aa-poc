// Redis 기반 UserOperation 제출 API

import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, getContract, http } from "viem";
import { bscTestnet } from "viem/chains";
import { UserOpQueue, type QueuedUserOp } from "@/lib/redis/queue";
import { TransactionExecutor } from "@/lib/userOperation";

// Runtime 설정
export const runtime = "nodejs";
export const maxDuration = 120;

// 환경변수 설정
const RPC_URL =
  process.env.BSC_TESTNET_RPC_URL || "https://bsc-testnet-rpc.publicnode.com";
const ENTRY_POINT =
  "0x4337084d9e255ff0702461cf8895ce9e3b5ff108" as `0x${string}`;

// viem client 설정
const publicClient = createPublicClient({
  chain: bscTestnet,
  transport: http(RPC_URL),
});

// EntryPoint ABI (필요한 함수만)
const ENTRY_POINT_ABI = [
  {
    type: "function",
    name: "simulateValidation",
    inputs: [
      {
        name: "userOp",
        type: "tuple",
        components: [
          { name: "sender", type: "address" },
          { name: "nonce", type: "uint256" },
          { name: "initCode", type: "bytes" },
          { name: "callData", type: "bytes" },
          { name: "accountGasLimits", type: "bytes32" },
          { name: "preVerificationGas", type: "uint256" },
          { name: "gasFees", type: "bytes32" },
          { name: "paymasterAndData", type: "bytes" },
          { name: "signature", type: "bytes" },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getUserOpHash",
    inputs: [
      {
        name: "userOp",
        type: "tuple",
        components: [
          { name: "sender", type: "address" },
          { name: "nonce", type: "uint256" },
          { name: "initCode", type: "bytes" },
          { name: "callData", type: "bytes" },
          { name: "accountGasLimits", type: "bytes32" },
          { name: "preVerificationGas", type: "uint256" },
          { name: "gasFees", type: "bytes32" },
          { name: "paymasterAndData", type: "bytes" },
          { name: "signature", type: "bytes" },
        ],
      },
    ],
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
  },
] as const;

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
  const transactionExecutor = new TransactionExecutor(
    "http://localhost:3000/api/userop"
  );
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
          address: ENTRY_POINT,
          abi: ENTRY_POINT_ABI,
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
      address: ENTRY_POINT,
      abi: ENTRY_POINT_ABI,
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
