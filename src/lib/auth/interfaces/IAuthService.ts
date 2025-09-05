export interface IAuthUser {
  userId?: string;
  email?: string;
  name?: string;
  profileImage?: string;
  verifier?: string;
}

export interface IAuthConnection {
  authConnection: string;
  loginHint?: string;
}

export interface IAuthService {
  connectTo(provider: string, connection?: IAuthConnection): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getUser(): IAuthUser | null;
}

export interface IPhoneNumberValidator {
  validate(countryCode: string, phoneNumber: string): boolean;
  format(countryCode: string, phoneNumber: string): string;
  formatForWeb3Auth(countryData: any, phoneNumber: string): string;
}