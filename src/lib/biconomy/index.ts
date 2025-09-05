// Main exports for clean imports
export { BiconomyClient } from "./client";
export { BiconomyServiceFactory } from "./factories/BiconomyServiceFactory";
export { WalletAdapter } from "./utils/walletAdapter";

// Types
export type { BiconomyContextType, TransactionRequest, TokenInfo, BiconomyConfig } from "./types";
export type { IBiconomyService, ITransactionService, IQuoteService } from "./interfaces/IBiconomyService";
export type { INotificationService, ITransactionNotificationService } from "./interfaces/INotificationService";

// Config
export { BICONOMY_CONFIG, MAINNET_TOKENS, SPONSORSHIP_OPTIONS, ERC20_ABI } from "./config";

// Services
export { BiconomyService } from "./services/BiconomyService";
export { QuoteService } from "./services/QuoteService";
export { TransactionService } from "./services/TransactionService";
export { NotificationService, TransactionNotificationService } from "./services/NotificationService";