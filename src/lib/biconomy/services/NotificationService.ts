import toast from "react-hot-toast";
import type { INotificationService, ITransactionNotificationService } from "../interfaces/INotificationService";

export class NotificationService implements INotificationService {
  showLoading(message: string): void {
    toast.loading(message);
  }

  showSuccess(message: string): void {
    toast.success(message);
  }

  showError(message: string): void {
    toast.error(message);
  }

  showPromise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ): Promise<T> {
    return toast.promise(promise, messages);
  }
}

export class TransactionNotificationService extends NotificationService implements ITransactionNotificationService {
  notifyNativeTokenTransfer(amount: string) {
    return <T>(promise: Promise<T>) =>
      this.showPromise(promise, {
        loading: `${amount} BNB 전송 중...`,
        success: "네이티브 토큰 전송 완료!",
        error: "네이티브 토큰 전송 실패",
      });
  }

  notifyBEP20TokenTransfer(amount: string) {
    return <T>(promise: Promise<T>) =>
      this.showPromise(promise, {
        loading: `${amount} 토큰 전송 중...`,
        success: "BEP-20 토큰 전송 완료!",
        error: "BEP-20 토큰 전송 실패",
      });
  }

  notifySimpleTransaction() {
    return <T>(promise: Promise<T>) =>
      this.showPromise(promise, {
        loading: "트랜잭션 실행 중...",
        success: "트랜잭션 실행 완료!",
        error: "트랜잭션 실행 실패",
      });
  }

  notifyBatchTransaction(count: number) {
    return <T>(promise: Promise<T>) =>
      this.showPromise(promise, {
        loading: `${count}개 트랜잭션 배치 실행 중...`,
        success: "배치 트랜잭션 실행 완료!",
        error: "배치 트랜잭션 실행 실패",
      });
  }
}