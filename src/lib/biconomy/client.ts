import { TransactionService } from "./services/TransactionService";
import { BiconomyServiceFactory } from "./factories/BiconomyServiceFactory";

// Legacy client wrapper for backward compatibility
// Delegates to the new service-based architecture
export class BiconomyClient extends TransactionService {
  static create(): BiconomyClient {
    return BiconomyServiceFactory.createTransactionService() as BiconomyClient;
  }
}