import type { Hash } from "viem";

export interface INotificationService {
  showLoading(message: string): void;
  showSuccess(message: string): void;
  showError(message: string): void;
  showPromise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ): Promise<T>;
}

export interface ITransactionNotificationService extends INotificationService {
  notifyNativeTokenTransfer(amount: string): <T>(promise: Promise<T>) => Promise<T>;
  notifyBEP20TokenTransfer(amount: string): <T>(promise: Promise<T>) => Promise<T>;
  notifySimpleTransaction(): <T>(promise: Promise<T>) => Promise<T>;
  notifyBatchTransaction(count: number): <T>(promise: Promise<T>) => Promise<T>;
}