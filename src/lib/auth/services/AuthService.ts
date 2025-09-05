import { useWeb3AuthConnect, useWeb3AuthDisconnect, useWeb3AuthUser } from "@web3auth/modal/react";
import type { IAuthService, IAuthUser, IAuthConnection } from "../interfaces/IAuthService";

export class AuthService implements IAuthService {
  private connectToHook: ReturnType<typeof useWeb3AuthConnect>['connectTo'];
  private disconnectHook: ReturnType<typeof useWeb3AuthDisconnect>['disconnect'];
  private userInfo: IAuthUser | null;

  constructor(
    connectTo: ReturnType<typeof useWeb3AuthConnect>['connectTo'],
    disconnect: ReturnType<typeof useWeb3AuthDisconnect>['disconnect'],
    userInfo: IAuthUser | null
  ) {
    this.connectToHook = connectTo;
    this.disconnectHook = disconnect;
    this.userInfo = userInfo;
  }

  async connectTo(provider: string, connection?: IAuthConnection): Promise<void> {
    await this.connectToHook(provider as any, connection);
  }

  async disconnect(): Promise<void> {
    await this.disconnectHook();
  }

  isConnected(): boolean {
    return this.userInfo !== null;
  }

  getUser(): IAuthUser | null {
    return this.userInfo;
  }
}