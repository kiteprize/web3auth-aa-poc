import { TransactionService } from "../services/TransactionService";
import { TransactionNotificationService } from "../services/NotificationService";
import type { ITransactionService } from "../interfaces/IBiconomyService";
import type { ITransactionNotificationService } from "../interfaces/INotificationService";

export class BiconomyServiceFactory {
  private static transactionService: ITransactionService | null = null;
  private static notificationService: ITransactionNotificationService | null = null;

  static createTransactionService(): ITransactionService {
    if (!this.transactionService) {
      this.transactionService = new TransactionService();
    }
    return this.transactionService;
  }

  static createNotificationService(): ITransactionNotificationService {
    if (!this.notificationService) {
      this.notificationService = new TransactionNotificationService();
    }
    return this.notificationService;
  }

  static reset(): void {
    this.transactionService = null;
    this.notificationService = null;
  }
}