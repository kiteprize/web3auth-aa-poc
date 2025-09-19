// Redis 기반 UserOperation 큐 시스템

import redisClient from "./client";

// 큐 키 상수
const QUEUE_KEYS = {
  PENDING: "userop:pending",
  PROCESSING: "userop:processing",
  RESULTS: "userop:results:",
  RATE_LIMIT: "userop:ratelimit:",
} as const;

// 큐에 저장되는 UserOp 데이터 구조
export interface QueuedUserOp {
  requestId: string;
  userOp: any;
  userOpHash: string;
  sender: string;
  submittedAt: number;
  retryCount: number;
}

// 처리 결과 구조
export interface UserOpResult {
  requestId: string;
  ok: boolean;
  status: "success" | "failed" | "timeout";
  txHash?: string;
  userOpHash: string;
  blockNumber?: string;
  gasUsed?: string;
  error?: string;
  processedAt: number;
  batchSize?: number;
  index?: number;
}

// 레이트 리미트 정보
export interface RateLimitInfo {
  count: number;
  resetTime: number;
  allowed: boolean;
  remaining: number;
  reset: number;
}

export class UserOpQueue {
  /**
   * BigInt 값을 문자열로 직렬화하는 replacer 함수
   */
  private static bigIntReplacer(key: string, value: any): any {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  }

  /**
   * 문자열로 된 BigInt 값을 다시 BigInt로 변환하는 reviver 함수
   */
  private static bigIntReviver(key: string, value: any): any {
    // nonce와 preVerificationGas 필드는 BigInt로 복원
    if (
      (key === "nonce" || key === "preVerificationGas") &&
      typeof value === "string" &&
      /^\d+$/.test(value)
    ) {
      return BigInt(value);
    }
    return value;
  }

  /**
   * UserOp을 대기 큐에 추가
   */
  static async enqueue(queuedUserOp: QueuedUserOp): Promise<void> {
    await redisClient.lpush(
      QUEUE_KEYS.PENDING,
      JSON.stringify(queuedUserOp, this.bigIntReplacer)
    );
    console.log(`📝 UserOp queued: ${queuedUserOp.userOpHash.slice(0, 10)}...`);
  }

  /**
   * 대기 큐에서 배치(최대 5개) 가져오기
   */
  static async dequeueBatch(maxSize: number = 5): Promise<QueuedUserOp[]> {
    const items: QueuedUserOp[] = [];

    for (let i = 0; i < maxSize; i++) {
      const item = await redisClient.rpop(QUEUE_KEYS.PENDING);
      if (!item) break;

      try {
        items.push(item);
      } catch (error) {
        console.error("Failed to parse queued UserOp:", error);
      }
    }

    // 처리 중 큐로 이동 (실패 시 복구를 위해)
    if (items.length > 0) {
      const processingData = {
        items,
        timestamp: Date.now(),
      };

      await redisClient.set(
        `${QUEUE_KEYS.PROCESSING}:${Date.now()}`,
        JSON.stringify(processingData, this.bigIntReplacer),
        { ex: 300 } // 5분 후 만료
      );
    }

    return items;
  }

  /**
   * 큐 크기 조회
   */
  static async getQueueSize(): Promise<number> {
    return await redisClient.llen(QUEUE_KEYS.PENDING);
  }

  /**
   * 처리 결과 저장
   */
  static async saveResult(result: UserOpResult): Promise<void> {
    const key = `${QUEUE_KEYS.RESULTS}${result.requestId}`;
    await redisClient.set(
      key,
      JSON.stringify(result, this.bigIntReplacer),
      { ex: 300 } // 5분 후 자동 삭제
    );
    console.log(`💾 Result saved for: ${result.requestId}`);
  }

  /**
   * 처리 결과 조회
   */
  static async getResult(requestId: string): Promise<UserOpResult | null> {
    const key = `${QUEUE_KEYS.RESULTS}${requestId}`;
    const result = await redisClient.get(key);

    if (!result) return null;

    try {
      return result;
    } catch (error) {
      console.error("Failed to parse result:", error);
      return null;
    }
  }

  /**
   * 처리 결과 삭제
   */
  static async deleteResult(requestId: string): Promise<void> {
    const key = `${QUEUE_KEYS.RESULTS}${requestId}`;
    await redisClient.del(key);
  }

  /**
   * 레이트 리미팅 확인 (하루 10건 제한)
   */
  static async checkRateLimit(sender: string): Promise<RateLimitInfo> {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const key = `${QUEUE_KEYS.RATE_LIMIT}${sender.toLowerCase()}`;

    const data = await redisClient.get(key);
    let limit: { count: number; resetTime: number };

    if (!data || typeof data !== "string") {
      limit = { count: 0, resetTime: now + oneDayMs };
    } else {
      try {
        limit = JSON.parse(data);

        // 리셋 시간이 지났으면 초기화
        if (now > limit.resetTime) {
          limit = { count: 0, resetTime: now + oneDayMs };
        }
      } catch {
        limit = { count: 0, resetTime: now + oneDayMs };
      }
    }

    // 카운트 증가
    limit.count++;

    // Redis에 저장 (TTL 설정)
    const ttlSeconds = Math.ceil((limit.resetTime - now) / 1000);
    await redisClient.set(key, JSON.stringify(limit), { ex: ttlSeconds });

    const remaining = Math.max(0, 10 - limit.count);
    const allowed = limit.count <= 10;
    const reset = Math.ceil((limit.resetTime - now) / 1000);

    return {
      count: limit.count,
      resetTime: limit.resetTime,
      allowed,
      remaining,
      reset,
    };
  }

  /**
   * 큐 상태 조회 (모니터링용)
   */
  static async getQueueStatus() {
    const pendingCount = await redisClient.llen(QUEUE_KEYS.PENDING);

    return {
      pending: pendingCount,
      timestamp: Date.now(),
    };
  }

  /**
   * 실패한 UserOp 재시도를 위해 다시 큐에 추가
   */
  static async retryUserOp(queuedUserOp: QueuedUserOp): Promise<void> {
    if (queuedUserOp.retryCount >= 3) {
      console.warn(`❌ Max retry exceeded for ${queuedUserOp.userOpHash}`);

      // 실패 결과 저장
      await this.saveResult({
        requestId: queuedUserOp.requestId,
        ok: false,
        status: "failed",
        error: "Maximum retry attempts exceeded",
        userOpHash: queuedUserOp.userOpHash,
        processedAt: Date.now(),
      });
      return;
    }

    queuedUserOp.retryCount++;
    await this.enqueue(queuedUserOp);
  }

  /**
   * 개발/테스트용: 큐 전체 클리어
   */
  static async clearAll(): Promise<void> {
    console.warn("⚠️  Clearing all queue data...");

    await redisClient.del(QUEUE_KEYS.PENDING);

    // 모든 결과와 레이트 리미트 데이터도 클리어 (프로덕션에서는 주의)
    // 실제로는 패턴 매칭으로 삭제해야 하지만, 개발용으로는 이렇게 처리
  }
}

export default UserOpQueue;
