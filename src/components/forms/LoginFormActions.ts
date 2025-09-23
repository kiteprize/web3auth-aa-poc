import type { IAuthService, IPhoneNumberValidator } from "../../lib/auth/interfaces/IAuthService";

export class LoginFormActions {
  constructor(
    private authService: IAuthService,
    private phoneService: IPhoneNumberValidator,
    private onSuccess?: () => void
  ) {}

  async handleSmsLogin(countryData: any, phoneNumber: string): Promise<void> {
    console.log(`🔍 SMS 로그인 시도: 국가=${countryData.code}, 입력번호=${phoneNumber}`);

    if (!this.phoneService.validate(countryData.code, phoneNumber)) {
      console.error(`❌ 전화번호 검증 실패: ${phoneNumber}`);
      throw new Error("Invalid phone number");
    }

    const formattedNumber = this.phoneService.formatForWeb3Auth(countryData, phoneNumber);

    console.log(`🚀 Web3Auth SMS 로그인 호출: loginHint=${formattedNumber}`);

    try {
      await this.authService.connectTo("auth", {
        authConnection: "sms_passwordless",
        loginHint: formattedNumber,
      });

      console.log(`✅ SMS 로그인 성공`);
      this.onSuccess?.();
    } catch (error) {
      console.error(`❌ SMS 로그인 실패:`, error);
      throw error;
    }
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