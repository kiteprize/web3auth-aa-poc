// Web3Auth와 AA 시스템 통합 서비스

import { parseEther, encodeFunctionData } from 'viem';
import {
  AASystemOrchestrator,
  type Action,
  type TransactionResult,
  type NetworkConfig
} from '../../userOperation';

/**
 * Web3Auth Provider 타입 정의
 */
interface Web3AuthProvider {
  request(args: { method: string; params?: any[] }): Promise<any>;
}

/**
 * Web3Auth 사용자 정보 타입
 */
interface Web3AuthUserInfo {
  userId: string;
  name?: string;
  email?: string;
  address?: string;
}

/**
 * Web3Auth와 AA 시스템을 통합하는 메인 서비스
 */
export class Web3AuthAAService {
  private orchestrator: AASystemOrchestrator;

  constructor() {
    // BSC Testnet 설정 (deployment.json에서 가져온 값들 사용)
    const networkConfig: NetworkConfig = {
      chainId: 97,
      rpcUrl: 'https://bsc-testnet-rpc.publicnode.com',
      entryPointAddress: '0x4337084d9e255ff0702461cf8895ce9e3b5ff108',
      factoryAddress: '0x46572ad2eea905860c8bc08816b8cb1e5c13c684' // deployment.json의 MyAccountFactory
    };

    this.orchestrator = new AASystemOrchestrator(networkConfig);
  }

  /**
   * Web3Auth에서 private key 추출
   */
  private async getPrivateKeyFromWeb3Auth(provider: Web3AuthProvider): Promise<`0x${string}`> {
    try {
      const privateKey = await provider.request({
        method: 'private_key'
      }) as string;

      if (!privateKey) {
        throw new Error('Private key not found from Web3Auth provider');
      }

      // Ensure proper format
      const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;

      if (formattedKey.length !== 66) {
        throw new Error('Invalid private key format');
      }

      return formattedKey as `0x${string}`;

    } catch (error) {
      console.error('Failed to get private key from Web3Auth:', error);
      throw new Error('Unable to retrieve private key from Web3Auth');
    }
  }

  /**
   * Web3Auth에서 사용자 주소 가져오기
   */
  private async getAddressFromWeb3Auth(provider: Web3AuthProvider): Promise<`0x${string}`> {
    try {
      const accounts = await provider.request({
        method: 'eth_accounts'
      }) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found from Web3Auth provider');
      }

      return accounts[0] as `0x${string}`;

    } catch (error) {
      console.error('Failed to get address from Web3Auth:', error);
      throw new Error('Unable to retrieve address from Web3Auth');
    }
  }

  /**
   * 네이티브 토큰 가스리스 전송 (메인 기능)
   */
  async sendNativeTokenGasless(
    provider: Web3AuthProvider,
    to: `0x${string}`,
    amount: string // ETH 단위 (예: "0.01")
  ): Promise<TransactionResult> {
    try {
      console.log('🚀 Starting gasless native token transfer...');
      console.log(`Sending ${amount} BNB to ${to}`);

      // 1. Web3Auth에서 인증 정보 가져오기
      const privateKey = await this.getPrivateKeyFromWeb3Auth(provider);
      const ownerAddress = await this.getAddressFromWeb3Auth(provider);

      console.log('👤 Owner address:', ownerAddress);

      // 2. 금액을 Wei로 변환
      const amountInWei = parseEther(amount);

      // 3. AA 시스템을 통한 가스리스 전송 실행
      const result = await this.orchestrator.sendNativeToken(
        to,
        amountInWei,
        ownerAddress,
        privateKey
      );

      console.log(result.success ? '✅ Gasless transfer completed!' : '❌ Gasless transfer failed');
      return result;

    } catch (error) {
      console.error('❌ Gasless native token transfer failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        userOpHash: '0x' as `0x${string}`
      };
    }
  }

  /**
   * ERC-20 토큰 가스리스 전송
   */
  async sendERC20TokenGasless(
    provider: Web3AuthProvider,
    tokenAddress: `0x${string}`,
    to: `0x${string}`,
    amount: string // 토큰 단위
  ): Promise<TransactionResult> {
    try {
      console.log('🚀 Starting gasless ERC-20 token transfer...');
      console.log(`Sending ${amount} tokens from ${tokenAddress} to ${to}`);

      // 1. 인증 정보 가져오기
      const privateKey = await this.getPrivateKeyFromWeb3Auth(provider);
      const ownerAddress = await this.getAddressFromWeb3Auth(provider);

      // 2. 금액을 Wei로 변환 (18 decimals 가정)
      const amountInWei = parseEther(amount);

      // 3. AA 시스템을 통한 ERC-20 전송
      const result = await this.orchestrator.sendERC20Token(
        tokenAddress,
        to,
        amountInWei,
        ownerAddress,
        privateKey
      );

      return result;

    } catch (error) {
      console.error('❌ Gasless ERC-20 token transfer failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        userOpHash: '0x' as `0x${string}`
      };
    }
  }

  /**
   * 커스텀 컨트랙트 함수 가스리스 호출
   */
  async executeContractCallGasless(
    provider: Web3AuthProvider,
    contractAddress: `0x${string}`,
    functionName: string,
    args: any[],
    abi: any[],
    value: bigint = BigInt(0)
  ): Promise<TransactionResult> {
    try {
      console.log('🚀 Starting gasless contract call...');
      console.log(`Calling ${functionName} on ${contractAddress}`);

      // 1. 인증 정보 가져오기
      const privateKey = await this.getPrivateKeyFromWeb3Auth(provider);
      const ownerAddress = await this.getAddressFromWeb3Auth(provider);

      // 2. 함수 호출 데이터 생성
      const callData = encodeFunctionData({
        abi,
        functionName,
        args
      });

      // 3. Action 생성
      const action: Action = {
        to: contractAddress,
        value,
        data: callData
      };

      // 4. AA 시스템을 통한 실행
      const result = await this.orchestrator.executeGaslessTransaction(
        action,
        ownerAddress,
        privateKey
      );

      return result;

    } catch (error) {
      console.error('❌ Gasless contract call failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        userOpHash: '0x' as `0x${string}`
      };
    }
  }

  /**
   * 계정 정보 조회
   */
  async getAccountInfo(provider: Web3AuthProvider) {
    try {
      const ownerAddress = await this.getAddressFromWeb3Auth(provider);
      return await this.orchestrator.getAccountInfo(ownerAddress);
    } catch (error) {
      console.error('Failed to get account info:', error);
      throw error;
    }
  }

  /**
   * 스마트 계정 주소 조회
   */
  async getSmartAccountAddress(provider: Web3AuthProvider): Promise<`0x${string}`> {
    try {
      const ownerAddress = await this.getAddressFromWeb3Auth(provider);
      const accountInfo = await this.orchestrator.smartAccountService.getSmartAccountInfo(ownerAddress);
      return accountInfo.address;
    } catch (error) {
      console.error('Failed to get smart account address:', error);
      throw error;
    }
  }

  /**
   * 배치 트랜잭션 실행
   */
  async executeBatchTransactionGasless(
    provider: Web3AuthProvider,
    actions: Action[]
  ): Promise<TransactionResult> {
    try {
      console.log(`🚀 Starting batch gasless transaction with ${actions.length} actions...`);

      // 1. 인증 정보 가져오기
      const privateKey = await this.getPrivateKeyFromWeb3Auth(provider);
      const ownerAddress = await this.getAddressFromWeb3Auth(provider);

      // 2. 배치 실행
      const result = await this.orchestrator.executeBatchGaslessTransaction(
        actions,
        ownerAddress,
        privateKey
      );

      return result;

    } catch (error) {
      console.error('❌ Batch gasless transaction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        userOpHash: '0x' as `0x${string}`
      };
    }
  }

  /**
   * 서비스 설정 업데이트
   */
  updateNetworkConfig(config: Partial<NetworkConfig>) {
    this.orchestrator.updateConfig(config);
  }

  /**
   * 현재 설정 조회
   */
  getNetworkConfig() {
    return this.orchestrator.getConfig();
  }

  /**
   * 헬퍼: TestToken 전송 (테스트용)
   */
  async sendTestTokenGasless(
    provider: Web3AuthProvider,
    to: `0x${string}`,
    amount: string
  ): Promise<TransactionResult> {
    // deployment.json의 TestToken 주소 사용
    const TEST_TOKEN_ADDRESS = '0x420049e251e5f0a350d7f11d127e1da446f3d447' as `0x${string}`;

    return this.sendERC20TokenGasless(provider, TEST_TOKEN_ADDRESS, to, amount);
  }
}