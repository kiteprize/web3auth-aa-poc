// AA 시스템 오케스트레이터 (SOLID 원칙의 Dependency Inversion 구현)

import {
  type PublicClient,
  createPublicClient,
  http
} from 'viem';

import {
  type UserOperation,
  type Action,
  type TransactionResult,
  type SmartAccountInfo,
  type NetworkConfig
} from '../aa/types';

import {
  IAASystemOrchestrator,
  IUserOperationBuilder,
  ISignatureService,
  ISmartAccountService,
  ITransactionService,
  IValidationService
} from '../aa/interfaces';

import { UserOperationCreator } from './creator';
import { UserOperationSigner } from './signer';
import { SmartAccountManager } from './smartAccount';
import { TransactionExecutor } from './transaction';
import { ValidationService } from './validator';
import { getNetworkConfig, getContractAddresses } from '@/config/environment';

/**
 * AA 시스템의 메인 오케스트레이터
 * 모든 서비스들을 조합하여 가스리스 트랜잭션 실행을 담당
 */
export class AASystemOrchestrator implements IAASystemOrchestrator {
  public readonly userOpBuilder: IUserOperationBuilder;
  public readonly signatureService: ISignatureService;
  public readonly smartAccountService: ISmartAccountService;
  public readonly transactionService: ITransactionService;
  public readonly validationService: IValidationService;

  private publicClient: PublicClient;
  private config: NetworkConfig;

  constructor(config?: NetworkConfig) {
    // 환경 설정 사용
    const networkConfig = getNetworkConfig();
    const contractAddresses = getContractAddresses();

    // config가 전달된 경우 우선 사용, 없으면 환경 설정 사용
    this.config = config || {
      chainId: networkConfig.chainId,
      rpcUrl: networkConfig.rpcUrl,
      entryPointAddress: contractAddresses.entryPointAddress,
      factoryAddress: contractAddresses.factoryAddress
    };

    // PublicClient 생성 (환경 설정의 체인 사용)
    this.publicClient = createPublicClient({
      chain: networkConfig.chain,
      transport: http(this.config.rpcUrl)
    });

    // 의존성 주입으로 서비스들 초기화
    this.userOpBuilder = new UserOperationCreator(
      this.publicClient,
      this.config.factoryAddress,
      this.config.entryPointAddress
    );

    this.signatureService = new UserOperationSigner(
      this.publicClient,
      this.config.entryPointAddress
    );

    this.smartAccountService = new SmartAccountManager(
      this.publicClient,
      this.config.factoryAddress,
      this.config.entryPointAddress
    );

    this.transactionService = new TransactionExecutor();

    this.validationService = new ValidationService(
      this.publicClient,
      this.config.entryPointAddress
    );
  }

  /**
   * 완전한 가스리스 트랜잭션 실행 (메인 엔트리 포인트)
   */
  async executeGaslessTransaction(
    action: Action,
    ownerAddress: `0x${string}`,
    privateKey: `0x${string}`
  ): Promise<TransactionResult> {
    try {
      console.log('🎯 Starting gasless transaction execution...');
      console.log('Action:', { to: action.to, value: action.value.toString(), dataLength: action.data.length });

      // 1. SmartAccount 정보 가져오기
      const smartAccountInfo = await this.smartAccountService.getSmartAccountInfo(ownerAddress);

      // 2. UserOperation 생성
      const userOp = await this.userOpBuilder.buildUserOperation(
        action,
        smartAccountInfo,
        !smartAccountInfo.isDeployed
      );

      // 3. UserOperation 서명
      const signedUserOp = await this.signatureService.signAndCompleteUserOperation(
        userOp,
        privateKey
      );

      // 4. 검증 (선택사항)
      const validationResult = await this.validationService.validateUserOperation(signedUserOp);
      if (!validationResult.valid) {
        throw new Error(`UserOperation validation failed: ${validationResult.error}`);
      }

      // 5. 트랜잭션 실행 (simulateValidation 스킵 - poc-simple.js와 동일)
      const result = await this.transactionService.executeSimpleTransfer(
        signedUserOp,
        true, // 확인 대기
        true  // skipValidation - poc-simple.js처럼 검증 스킵
      );

      console.log(result.success ? '✅ Gasless transaction completed successfully!' : '❌ Gasless transaction failed');
      return result;

    } catch (error) {
      console.error('❌ Gasless transaction execution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        userOpHash: '0x' as `0x${string}`
      };
    }
  }

  /**
   * 배치 가스리스 트랜잭션 실행
   */
  async executeBatchGaslessTransaction(
    actions: Action[],
    ownerAddress: `0x${string}`,
    privateKey: `0x${string}`
  ): Promise<TransactionResult> {
    try {
      console.log(`🎯 Starting batch gasless transaction execution for ${actions.length} actions...`);

      // 1. SmartAccount 정보 가져오기
      const smartAccountInfo = await this.smartAccountService.getSmartAccountInfo(ownerAddress);

      // 2. 배치 UserOperation 생성
      const userOp = await (this.userOpBuilder as UserOperationCreator).buildBatchUserOperation(
        actions,
        smartAccountInfo,
        !smartAccountInfo.isDeployed
      );

      // 3. UserOperation 서명
      const signedUserOp = await this.signatureService.signAndCompleteUserOperation(
        userOp,
        privateKey
      );

      // 4. 검증
      const validationResult = await this.validationService.validateUserOperation(signedUserOp);
      if (!validationResult.valid) {
        throw new Error(`Batch UserOperation validation failed: ${validationResult.error}`);
      }

      // 5. 트랜잭션 실행
      const result = await this.transactionService.executeSimpleTransfer(
        signedUserOp,
        true
      );

      console.log(result.success ? '✅ Batch gasless transaction completed!' : '❌ Batch gasless transaction failed');
      return result;

    } catch (error) {
      console.error('❌ Batch gasless transaction execution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        userOpHash: '0x' as `0x${string}`
      };
    }
  }

  /**
   * 네이티브 토큰 전송
   */
  async sendNativeToken(
    to: `0x${string}`,
    amount: bigint,
    ownerAddress: `0x${string}`,
    privateKey: `0x${string}`
  ): Promise<TransactionResult> {
    const action: Action = {
      to,
      value: amount,
      data: '0x' // 네이티브 전송은 data가 비어있음
    };

    return this.executeGaslessTransaction(action, ownerAddress, privateKey);
  }

  /**
   * ERC-20 토큰 전송
   */
  async sendERC20Token(
    tokenAddress: `0x${string}`,
    to: `0x${string}`,
    amount: bigint,
    ownerAddress: `0x${string}`,
    privateKey: `0x${string}`
  ): Promise<TransactionResult> {
    // ERC-20 transfer 함수 호출 데이터 생성
    const transferCalldata = this.encodeERC20Transfer(to, amount);

    const action: Action = {
      to: tokenAddress,
      value: BigInt(0), // ERC-20 전송은 네이티브 토큰 없음
      data: transferCalldata
    };

    return this.executeGaslessTransaction(action, ownerAddress, privateKey);
  }

  /**
   * 계정 정보 조회 (헬퍼 메서드)
   */
  async getAccountInfo(ownerAddress: `0x${string}`) {
    return this.smartAccountService.getAccountSummary(ownerAddress);
  }

  /**
   * 설정 업데이트
   */
  updateConfig(newConfig: Partial<NetworkConfig>) {
    this.config = { ...this.config, ...newConfig };
    // TODO: 필요시 서비스들도 재초기화
  }

  /**
   * ERC-20 transfer 함수 호출 데이터 인코딩 헬퍼
   */
  private encodeERC20Transfer(to: `0x${string}`, amount: bigint): `0x${string}` {
    // transfer(address,uint256) function selector: 0xa9059cbb
    const selector = '0xa9059cbb';
    const addressPadded = to.slice(2).padStart(64, '0');
    const amountHex = amount.toString(16).padStart(64, '0');

    return `${selector}${addressPadded}${amountHex}` as `0x${string}`;
  }

  /**
   * 현재 설정 반환
   */
  getConfig(): NetworkConfig {
    return { ...this.config };
  }
}