import type { Hash } from "viem";
import type { TransactionStep } from "../../../components/TransactionProgress";

export class TransactionTracker {
  private steps: TransactionStep[] = [];
  private onUpdate?: (steps: TransactionStep[]) => void;
  private currentHash?: Hash;

  constructor(onUpdate?: (steps: TransactionStep[]) => void) {
    this.onUpdate = onUpdate;
  }

  setSteps(steps: TransactionStep[]): void {
    this.steps = steps;
    this.notifyUpdate();
  }

  updateStep(id: string, updates: Partial<TransactionStep>): void {
    this.steps = this.steps.map(step => 
      step.id === id 
        ? { ...step, ...updates, timestamp: updates.timestamp || new Date() }
        : step
    );
    this.notifyUpdate();
  }

  setStepStatus(id: string, status: TransactionStep['status'], details?: string): void {
    this.updateStep(id, { status, details, timestamp: new Date() });
  }

  setStepError(id: string, error: string): void {
    this.setStepStatus(id, "error", error);
  }

  setStepCompleted(id: string, details?: string): void {
    this.setStepStatus(id, "completed", details);
  }

  setStepInProgress(id: string): void {
    this.setStepStatus(id, "in_progress");
  }

  setTransactionHash(hash: Hash): void {
    this.currentHash = hash;
    this.notifyUpdate();
  }

  getSteps(): TransactionStep[] {
    return [...this.steps];
  }

  getTransactionHash(): Hash | undefined {
    return this.currentHash;
  }

  reset(): void {
    this.steps = [];
    this.currentHash = undefined;
    this.notifyUpdate();
  }

  private notifyUpdate(): void {
    this.onUpdate?.(this.getSteps());
  }

  // 기본 추적 시나리오
  async trackTransaction<T>(
    transactionPromise: Promise<T>,
    steps: TransactionStep[]
  ): Promise<T> {
    this.setSteps(steps);
    
    try {
      // 준비 단계
      this.setStepInProgress("prepare");
      await new Promise(resolve => setTimeout(resolve, 500));
      this.setStepCompleted("prepare");

      // 서명 단계
      this.setStepInProgress("sign");
      await new Promise(resolve => setTimeout(resolve, 300));
      this.setStepCompleted("sign");

      // Paymaster 승인
      this.setStepInProgress("paymaster");
      await new Promise(resolve => setTimeout(resolve, 800));
      this.setStepCompleted("paymaster", "가스비 스폰서십 승인됨");

      // 트랜잭션 제출
      this.setStepInProgress("submit");
      const result = await transactionPromise;
      
      if (typeof result === 'string' && result.startsWith('0x')) {
        this.setTransactionHash(result as Hash);
      }
      
      this.setStepCompleted("submit", "UserOperation 제출됨");

      // 실행 단계
      this.setStepInProgress("execute");
      await new Promise(resolve => setTimeout(resolve, 2000));
      this.setStepCompleted("execute");

      // 완료 확인
      this.setStepInProgress("confirm");
      await new Promise(resolve => setTimeout(resolve, 500));
      this.setStepCompleted("confirm", "트랜잭션 완료");

      return result;
    } catch (error) {
      // 현재 진행 중인 단계에 오류 설정
      const currentStep = this.steps.find(s => s.status === "in_progress");
      if (currentStep) {
        this.setStepError(currentStep.id, error instanceof Error ? error.message : "알 수 없는 오류");
      }
      throw error;
    }
  }
}