// Auth services exports
export { AuthService } from "./services/AuthService";
export { PhoneNumberService } from "./services/PhoneNumberService";
export { AuthServiceFactory } from "./factories/AuthServiceFactory";
export { UserFormatter } from "./utils/userFormatter";

// Types
export type { IAuthService, IAuthUser, IAuthConnection, IPhoneNumberValidator } from "./interfaces/IAuthService";