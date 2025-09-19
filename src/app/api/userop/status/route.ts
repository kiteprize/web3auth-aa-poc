// UserOperation 상태 조회 API

import { NextRequest, NextResponse } from "next/server";
import { UserOpQueue } from "@/lib/redis/queue";

// Runtime 설정
export const runtime = "nodejs";
export const maxDuration = 30;

// GET: 처리 상태 조회
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json(
        {
          error: "MISSING_REQUEST_ID",
          message: "requestId parameter is required"
        },
        { status: 400 }
      );
    }

    // Redis에서 결과 조회
    const result = await UserOpQueue.getResult(requestId);

    if (!result) {
      return NextResponse.json({
        requestId,
        status: 'pending',
        message: 'UserOperation is being processed or not found'
      });
    }

    // 결과가 있으면 반환
    return NextResponse.json({
      requestId,
      status: result.status,
      ok: result.ok,
      txHash: result.txHash,
      userOpHash: result.userOpHash,
      blockNumber: result.blockNumber,
      gasUsed: result.gasUsed,
      error: result.error,
      processedAt: result.processedAt,
      batchSize: result.batchSize,
      index: result.index
    });

  } catch (error: any) {
    console.error('❌ Status query error:', error);
    return NextResponse.json(
      {
        error: "STATUS_QUERY_ERROR",
        message: error?.message || "Failed to query status"
      },
      { status: 500 }
    );
  }
}

// POST: 여러 requestId 동시 조회 (배치 조회)
export async function POST(req: NextRequest) {
  try {
    const { requestIds } = await req.json();

    if (!Array.isArray(requestIds) || requestIds.length === 0) {
      return NextResponse.json(
        {
          error: "INVALID_REQUEST_IDS",
          message: "requestIds must be a non-empty array"
        },
        { status: 400 }
      );
    }

    if (requestIds.length > 50) {
      return NextResponse.json(
        {
          error: "TOO_MANY_REQUEST_IDS",
          message: "Maximum 50 requestIds allowed per batch query"
        },
        { status: 400 }
      );
    }

    // 모든 requestId에 대해 병렬로 결과 조회
    const results = await Promise.all(
      requestIds.map(async (requestId: string) => {
        try {
          const result = await UserOpQueue.getResult(requestId);

          if (!result) {
            return {
              requestId,
              status: 'pending',
              message: 'UserOperation is being processed or not found'
            };
          }

          return {
            requestId,
            status: result.status,
            ok: result.ok,
            txHash: result.txHash,
            userOpHash: result.userOpHash,
            blockNumber: result.blockNumber,
            gasUsed: result.gasUsed,
            error: result.error,
            processedAt: result.processedAt,
            batchSize: result.batchSize,
            index: result.index
          };
        } catch (error) {
          return {
            requestId,
            status: 'error',
            error: error instanceof Error ? error.message : String(error)
          };
        }
      })
    );

    // 상태별 카운트
    const statusCounts = results.reduce((acc, result) => {
      acc[result.status] = (acc[result.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      total: results.length,
      statusCounts,
      results
    });

  } catch (error: any) {
    console.error('❌ Batch status query error:', error);
    return NextResponse.json(
      {
        error: "BATCH_STATUS_QUERY_ERROR",
        message: error?.message || "Failed to query batch status"
      },
      { status: 500 }
    );
  }
}

// DELETE: 처리 결과 삭제 (정리용)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json(
        {
          error: "MISSING_REQUEST_ID",
          message: "requestId parameter is required"
        },
        { status: 400 }
      );
    }

    await UserOpQueue.deleteResult(requestId);

    return NextResponse.json({
      message: `Result for ${requestId} deleted successfully`
    });

  } catch (error: any) {
    console.error('❌ Result deletion error:', error);
    return NextResponse.json(
      {
        error: "RESULT_DELETION_ERROR",
        message: error?.message || "Failed to delete result"
      },
      { status: 500 }
    );
  }
}