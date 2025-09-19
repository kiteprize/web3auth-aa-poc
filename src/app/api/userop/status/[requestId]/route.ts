// UserOperation 상태 조회 API

import { NextRequest, NextResponse } from "next/server";

// 간단한 상태 저장소 (실제로는 Redis 또는 데이터베이스 사용)
const statusStore = new Map<string, any>();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = await params;

    if (!requestId) {
      return NextResponse.json(
        { error: "MISSING_REQUEST_ID", message: "Request ID is required" },
        { status: 400 }
      );
    }

    // 상태 조회
    const status = statusStore.get(requestId);

    if (!status) {
      return NextResponse.json(
        {
          status: "not_found",
          message: "Request not found or expired"
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      requestId,
      ...status
    });

  } catch (error: any) {
    console.error('❌ Status query error:', error);
    return NextResponse.json(
      {
        error: "STATUS_ERROR",
        message: error?.message || "Failed to get status"
      },
      { status: 500 }
    );
  }
}

// 상태 업데이트 (내부 사용)
export function updateStatus(requestId: string, status: any) {
  statusStore.set(requestId, {
    ...status,
    updatedAt: Date.now()
  });

  // 10분 후 자동 삭제
  setTimeout(() => {
    statusStore.delete(requestId);
  }, 10 * 60 * 1000);
}