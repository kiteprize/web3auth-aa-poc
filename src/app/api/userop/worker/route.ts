// UserOperation 배치 처리 Worker API

import { NextRequest, NextResponse } from "next/server";
import {
  createPublicClient,
  createWalletClient,
  http,
  getContract,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { UserOpQueue, type QueuedUserOp, type UserOpResult } from "@/lib/redis/queue";
import { getAppConfig, getNetworkConfig, getContractAddresses } from "@/config/environment";

// Runtime 설정
export const runtime = "nodejs";
export const maxDuration = 120;

// 환경 설정 가져오기
const appConfig = getAppConfig();
const networkConfig = getNetworkConfig();
const contractAddresses = getContractAddresses();

// EntryPoint ABI (필요한 함수만)
const ENTRY_POINT_ABI = [
  {
    type: 'function',
    name: 'handleOps',
    inputs: [
      {
        name: 'ops',
        type: 'tuple[]',
        components: [
          { name: 'sender', type: 'address' },
          { name: 'nonce', type: 'uint256' },
          { name: 'initCode', type: 'bytes' },
          { name: 'callData', type: 'bytes' },
          { name: 'accountGasLimits', type: 'bytes32' },
          { name: 'preVerificationGas', type: 'uint256' },
          { name: 'gasFees', type: 'bytes32' },
          { name: 'paymasterAndData', type: 'bytes' },
          { name: 'signature', type: 'bytes' }
        ]
      },
      { name: 'beneficiary', type: 'address' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  }
] as const;

// viem clients 설정
const publicClient = createPublicClient({
  chain: networkConfig.chain,
  transport: http(networkConfig.rpcUrl),
});

let walletClient: any = null;
let bundlerAccount: any = null;

// 번들러 계정 초기화
if (appConfig.privateKey) {
  bundlerAccount = privateKeyToAccount(appConfig.privateKey);
  walletClient = createWalletClient({
    chain: networkConfig.chain,
    transport: http(networkConfig.rpcUrl),
    account: bundlerAccount,
  });
}

// 문자열로 받은 BigInt 필드들을 BigInt로 변환
function deserializeUserOperation(op: any): any {
  return {
    ...op,
    nonce: typeof op.nonce === 'string' ? BigInt(op.nonce) : op.nonce,
    preVerificationGas: typeof op.preVerificationGas === 'string' ? BigInt(op.preVerificationGas) : op.preVerificationGas,
  };
}

// 배치 처리 함수
async function processBatch(batch: QueuedUserOp[]): Promise<UserOpResult[]> {
  if (!walletClient || !bundlerAccount) {
    throw new Error('Bundler not configured');
  }

  console.log(`🚀 Processing batch of ${batch.length} UserOperations...`);

  const results: UserOpResult[] = [];

  try {
    // UserOperation들을 역직렬화
    const userOps = batch.map(item => deserializeUserOperation(item.userOp));

    // EntryPoint 컨트랙트로 handleOps 호출
    const txHash = await walletClient.writeContract({
      address: contractAddresses.entryPointAddress,
      abi: ENTRY_POINT_ABI,
      functionName: 'handleOps',
      args: [userOps, bundlerAccount.address]
    });

    console.log(`📤 Transaction submitted: ${txHash}`);

    // 트랜잭션 확인 대기
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      timeout: 60000 // 60초 타임아웃
    });

    console.log(`✅ Batch processed: ${receipt.status}, txHash: ${txHash}`);

    // 각 UserOp에 대한 성공 결과 저장
    batch.forEach((item, index) => {
      const result: UserOpResult = {
        requestId: item.requestId,
        ok: receipt.status === 'success',
        status: receipt.status === 'success' ? 'success' : 'failed',
        txHash: txHash,
        userOpHash: item.userOpHash,
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
        processedAt: Date.now(),
        batchSize: batch.length,
        index
      };

      results.push(result);
    });

  } catch (error) {
    console.error('❌ Batch processing failed:', error);

    // 실패한 경우 각 UserOp에 대한 실패 결과 저장
    batch.forEach((item, index) => {
      const result: UserOpResult = {
        requestId: item.requestId,
        ok: false,
        status: 'failed',
        userOpHash: item.userOpHash,
        error: error instanceof Error ? error.message : String(error),
        processedAt: Date.now(),
        batchSize: batch.length,
        index
      };

      results.push(result);
    });
  }

  // 모든 결과를 Redis에 저장
  for (const result of results) {
    await UserOpQueue.saveResult(result);
  }

  return results;
}

// POST: 배치 처리 실행
export async function POST(req: NextRequest) {
  try {
    if (!appConfig.privateKey) {
      return NextResponse.json(
        { error: "BUNDLER_NOT_CONFIGURED", message: "Bundler private key not configured" },
        { status: 500 }
      );
    }

    // 요청 파라미터 (배치 크기 설정 가능)
    const { batchSize = 5 } = await req.json().catch(() => ({}));

    // 큐에서 배치 가져오기
    const batch = await UserOpQueue.dequeueBatch(batchSize);

    if (batch.length === 0) {
      return NextResponse.json({
        message: "No UserOperations in queue",
        processed: 0,
        queueSize: await UserOpQueue.getQueueSize()
      });
    }

    // 배치 처리
    const results = await processBatch(batch);

    const successCount = results.filter(r => r.ok).length;
    const failedCount = results.filter(r => !r.ok).length;

    return NextResponse.json({
      message: `Processed batch of ${results.length} UserOperations`,
      processed: results.length,
      success: successCount,
      failed: failedCount,
      queueSize: await UserOpQueue.getQueueSize(),
      results: results.map(r => ({
        requestId: r.requestId,
        userOpHash: r.userOpHash,
        status: r.status,
        txHash: r.txHash,
        error: r.error
      }))
    });

  } catch (error: any) {
    console.error('❌ Worker error:', error);
    return NextResponse.json(
      {
        error: "WORKER_ERROR",
        message: error?.message || "Failed to process batch"
      },
      { status: 500 }
    );
  }
}

// GET: 큐 상태 조회
export async function GET(req: NextRequest) {
  try {
    const queueStatus = await UserOpQueue.getQueueStatus();

    return NextResponse.json({
      ...queueStatus,
      bundlerConfigured: Boolean(appConfig.privateKey),
      bundlerAddress: bundlerAccount?.address || null
    });

  } catch (error: any) {
    console.error('❌ Queue status error:', error);
    return NextResponse.json(
      {
        error: "QUEUE_STATUS_ERROR",
        message: error?.message || "Failed to get queue status"
      },
      { status: 500 }
    );
  }
}