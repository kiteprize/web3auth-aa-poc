import type { IAuthService, IPhoneNumberValidator } from "../../lib/auth/interfaces/IAuthService";

export class LoginFormActions {
  constructor(
    private authService: IAuthService,
    private phoneService: IPhoneNumberValidator,
    private onSuccess?: () => void
  ) {}

  async handleSmsLogin(countryData: any, phoneNumber: string): Promise<void> {
    if (!this.phoneService.validate(countryData.code, phoneNumber)) {
      throw new Error("Invalid phone number");
    }

    const formattedNumber = this.phoneService.formatForWeb3Auth(countryData, phoneNumber);
    await this.authService.connectTo("auth", {
      authConnection: "sms_passwordless",
      loginHint: formattedNumber,
    });
    
    this.onSuccess?.();
  }

  async handleEmailLogin(email: string): Promise<void> {
    if (!email || !email.includes("@")) {
      throw new Error("Invalid email address");
    }

    await this.authService.connectTo("auth", {
      authConnection: "email_passwordless",
      loginHint: email,
    });
    
    this.onSuccess?.();
  }

  async handleGoogleLogin(): Promise<void> {
    await this.authService.connectTo("auth", {
      authConnection: "google",
    });
    
    this.onSuccess?.();
  }

  async handleAppleLogin(): Promise<void> {
    await this.authService.connectTo("auth", {
      authConnection: "apple",
    });
    
    this.onSuccess?.();
  }

  async handleLogout(): Promise<void> {
    await this.authService.disconnect();
    this.onSuccess?.();
  }
}