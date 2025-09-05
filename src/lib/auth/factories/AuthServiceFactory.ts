import { AuthService } from "../services/AuthService";
import { PhoneNumberService } from "../services/PhoneNumberService";
import type { IAuthService, IPhoneNumberValidator } from "../interfaces/IAuthService";

export class AuthServiceFactory {
  private static phoneNumberService: IPhoneNumberValidator | null = null;

  static createAuthService(
    connectTo: any,
    disconnect: any,
    userInfo: any
  ): IAuthService {
    return new AuthService(connectTo, disconnect, userInfo);
  }

  static createPhoneNumberService(): IPhoneNumberValidator {
    if (!this.phoneNumberService) {
      this.phoneNumberService = new PhoneNumberService();
    }
    return this.phoneNumberService;
  }

  static reset(): void {
    this.phoneNumberService = null;
  }
}