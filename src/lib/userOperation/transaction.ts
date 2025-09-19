// Redis 기반 트랜잭션 실행 서비스

import {
  type UserOperation,
  type TransactionResult,
  type TransactionProgress
} from '../aa/types';
import { ITransactionService } from '../aa/interfaces';

// 제출된 UserOp 추적을 위한 인터페이스
interface SubmittedUserOp {
  requestId: string;
  userOpHash: `0x${string}`;
  submittedAt: number;
}

export class TransactionExecutor implements ITransactionService {
  private submittedOps = new Map<string, SubmittedUserOp>();

  constructor(
    private apiBaseUrl: string = '/api/userop'
  ) {}

  /**
   * UserOperation을 API 전송용으로 직렬화
   * BigInt 값들을 string으로 변환
   */
  private serializeUserOperation(userOp: UserOperation): any {
    return {
      ...userOp,
      nonce: userOp.nonce.toString(),
      preVerificationGas: userOp.preVerificationGas.toString(),
    };
  }

  /**
   * Redis 큐 기반 UserOperation 제출
   */
  async submitUserOperation(
    userOp: UserOperation,
    waitForExecution: boolean = true,
    skipValidation: boolean = false
  ): Promise<TransactionResult> {
    try {
      console.log('🚀 Submitting UserOperation to Redis queue...');

      const serializedUserOp = this.serializeUserOperation(userOp);

      const response = await fetch(`${this.apiBaseUrl}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userOp: serializedUserOp,
          waitForExecution,
          skipValidation
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // 비동기 모드인 경우 requestId를 추적
      if (!waitForExecution && result.requestId) {
        this.submittedOps.set(result.userOpHash, {
          requestId: result.requestId,
          userOpHash: result.userOpHash,
          submittedAt: Date.now()
        });

        console.log(`📝 UserOperation queued: ${result.userOpHash}`);
        console.log(`🎫 Request ID: ${result.requestId}`);

        return {
          success: true,
          userOpHash: result.userOpHash,
          requestId: result.requestId,
          status: 'queued'
        };
      }

      // 동기 모드인 경우 (기존 동작)
      console.log('✅ UserOperation processed');

      return {
        success: result.ok || result.success || false,
        txHash: result.txHash,
        userOpHash: result.userOpHash,
        gasUsed: result.gasUsed ? BigInt(result.gasUsed) : undefined,
        blockNumber: result.blockNumber,
        requestId: result.requestId,
        error: result.error
      };

    } catch (error) {
      console.error('❌ Failed to submit UserOperation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        userOpHash: '0x' as `0x${string}`
      };
    }
  }

  /**
   * Worker를 수동으로 트리거하여 큐 처리
   */
  async triggerWorker(batchSize: number = 5): Promise<any> {
    try {
      console.log(`🔧 Triggering worker (batch size: ${batchSize})...`);

      const response = await fetch(`${this.apiBaseUrl}/worker`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ batchSize })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      console.log(`✅ Worker processed ${result.processed} UserOperations`);
      console.log(`📊 Success: ${result.success}, Failed: ${result.failed}`);

      return result;

    } catch (error) {
      console.error('❌ Failed to trigger worker:', error);
      throw error;
    }
  }

  /**
   * RequestId를 사용하여 트랜잭션 상태 조회
   */
  async getTransactionStatusByRequestId(requestId: string): Promise<TransactionProgress> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/status?requestId=${requestId}`);

      if (!response.ok) {
        throw new Error(`Status API responded with ${response.status}`);
      }

      const result = await response.json();

      const status: 'pending' | 'confirmed' | 'failed' =
        result.status === 'success' ? 'confirmed' :
        result.status === 'failed' ? 'failed' : 'pending';

      return {
        status,
        message: result.message || `Transaction ${status}`,
        userOpHash: result.userOpHash,
        txHash: result.txHash,
        gasUsed: result.gasUsed ? BigInt(result.gasUsed) : undefined,
        error: result.error,
        blockNumber: result.blockNumber
      };

    } catch (error) {
      console.warn('Failed to get transaction status:', error);
      return {
        status: 'failed',
        message: 'Failed to get transaction status',
        error: error instanceof Error ? error.message : String(error),
        userOpHash: '0x' as `0x${string}`
      };
    }
  }

  /**
   * UserOpHash를 사용한 트랜잭션 상태 조회 (호환성)
   */
  async getTransactionStatus(userOpHash: `0x${string}`): Promise<TransactionProgress> {
    // 추적하고 있는 UserOp인지 확인
    const submittedOp = this.submittedOps.get(userOpHash);

    if (submittedOp) {
      return this.getTransactionStatusByRequestId(submittedOp.requestId);
    }

    // 추적하지 않는 경우 기본 응답
    return {
      status: 'pending',
      message: 'UserOperation status unknown',
      userOpHash
    };
  }

  /**
   * 트랜잭션 완료까지 대기 (폴링)
   */
  async waitForTransaction(userOpHash: `0x${string}`): Promise<TransactionResult> {
    const maxWaitTime = 90000; // 90초
    const pollInterval = 2000; // 2초
    const startTime = Date.now();

    console.log('⏳ Waiting for transaction confirmation...');

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const progress = await this.getTransactionStatus(userOpHash);

        if (progress.status === 'confirmed') {
          console.log('✅ Transaction confirmed!');

          // 추적 정보 정리
          this.submittedOps.delete(userOpHash);

          return {
            success: true,
            txHash: progress.txHash,
            userOpHash,
            gasUsed: progress.gasUsed,
            blockNumber: progress.blockNumber?.toString()
          };
        }

        if (progress.status === 'failed') {
          console.log('❌ Transaction failed');

          // 추적 정보 정리
          this.submittedOps.delete(userOpHash);

          return {
            success: false,
            error: progress.error || 'Transaction failed',
            userOpHash
          };
        }

        // 아직 진행 중이면 계속 대기
        await new Promise(resolve => setTimeout(resolve, pollInterval));

      } catch (error) {
        console.warn('Status check failed, retrying...', error);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    // 타임아웃
    console.log('⏰ Transaction wait timeout');
    return {
      success: false,
      error: 'Transaction confirmation timeout',
      userOpHash
    };
  }

  /**
   * 비동기 트랜잭션 실행 (큐에 추가만)
   */
  async submitUserOperationAsync(userOp: UserOperation, skipValidation: boolean = false): Promise<TransactionResult> {
    return this.submitUserOperation(userOp, false, skipValidation);
  }

  /**
   * 동기 트랜잭션 실행 (결과까지 대기)
   */
  async submitUserOperationSync(userOp: UserOperation, skipValidation: boolean = false): Promise<TransactionResult> {
    return this.submitUserOperation(userOp, true, skipValidation);
  }

  /**
   * 여러 UserOperation 배치 제출 (비동기)
   */
  async submitBatchUserOperations(userOps: UserOperation[]): Promise<TransactionResult[]> {
    console.log(`🚀 Submitting batch of ${userOps.length} UserOperations to queue...`);

    const results: TransactionResult[] = [];

    // 모든 UserOp를 비동기로 큐에 추가
    for (const [index, userOp] of userOps.entries()) {
      console.log(`Queuing UserOp ${index + 1}/${userOps.length}...`);
      const result = await this.submitUserOperationAsync(userOp);
      results.push(result);

      if (!result.success) {
        console.warn(`UserOp ${index + 1} failed to queue`);
      }
    }

    return results;
  }

  /**
   * 배치 트랜잭션 결과 대기
   */
  async waitForBatchTransactions(userOpHashes: `0x${string}`[]): Promise<TransactionResult[]> {
    console.log(`⏳ Waiting for ${userOpHashes.length} transactions...`);

    // 모든 트랜잭션을 병렬로 대기
    const promises = userOpHashes.map(hash => this.waitForTransaction(hash));
    return Promise.all(promises);
  }

  /**
   * 간단한 전송 트랜잭션 실행
   */
  async executeSimpleTransfer(
    userOp: UserOperation,
    waitForConfirmation: boolean = true,
    skipValidation: boolean = false
  ): Promise<TransactionResult> {
    const submitResult = await this.submitUserOperation(userOp, waitForConfirmation, skipValidation);

    if (!submitResult.success || !waitForConfirmation) {
      return submitResult;
    }

    if (submitResult.userOpHash && submitResult.status === 'queued') {
      // 큐에 추가된 경우 Worker를 트리거하고 결과 대기
      await this.triggerWorker();
      return this.waitForTransaction(submitResult.userOpHash);
    }

    return submitResult;
  }

  /**
   * 큐 상태 조회
   */
  async getQueueStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/submit`);

      if (!response.ok) {
        throw new Error(`Queue status API responded with ${response.status}`);
      }

      return response.json();

    } catch (error) {
      console.error('Failed to get queue status:', error);
      return { pending: 0, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * 트랜잭션 상태 실시간 모니터링 (폴링 기반)
   */
  async *watchTransaction(userOpHash: `0x${string}`): AsyncIterableIterator<TransactionProgress> {
    const maxTime = 90000;
    const interval = 3000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxTime) {
      const status = await this.getTransactionStatus(userOpHash);
      yield status;

      if (status.status === 'confirmed' || status.status === 'failed') {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  /**
   * 추적 중인 UserOp 정리 (메모리 관리)
   */
  cleanupExpiredOps(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    const expired: string[] = [];

    for (const [userOpHash, op] of this.submittedOps.entries()) {
      if (now - op.submittedAt > maxAge) {
        expired.push(userOpHash);
      }
    }

    expired.forEach(hash => this.submittedOps.delete(hash));

    if (expired.length > 0) {
      console.log(`🧹 Cleaned up ${expired.length} expired UserOp tracking records`);
    }
  }
}