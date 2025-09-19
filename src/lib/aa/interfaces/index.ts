// SOLID 원칙을 따르는 AA 시스템 인터페이스 정의

import {
  UserOperation,
  Action,
  SmartAccountInfo,
  TransactionResult,
  TransactionProgress,
  ValidationResult,
  NetworkConfig,
  SmartAccountConfig,
  GasEstimate
} from '../types';

// Single Responsibility: UserOperation 생성만 담당
export interface IUserOperationBuilder {
  buildUserOperation(
    action: Action,
    smartAccountInfo: SmartAccountInfo,
    needsDeployment: boolean
  ): Promise<UserOperation>;

  estimateGas(userOp: UserOperation): Promise<GasEstimate>;
}

// Single Responsibility: 서명만 담당
export interface ISignatureService {
  signUserOperation(
    userOp: UserOperation,
    privateKey: `0x${string}`
  ): Promise<`0x${string}`>;

  getUserOpHash(userOp: UserOperation): Promise<`0x${string}`>;

  signAndCompleteUserOperation(
    userOp: UserOperation,
    privateKey: `0x${string}`
  ): Promise<UserOperation>;
}

// Single Responsibility: SmartAccount 정보 관리
export interface ISmartAccountService {
  getSmartAccountInfo(
    ownerAddress: `0x${string}`,
    salt?: bigint
  ): Promise<SmartAccountInfo>;

  predictSmartAccountAddress(
    ownerAddress: `0x${string}`,
    salt?: bigint
  ): Promise<`0x${string}`>;

  isAccountDeployed(accountAddress: `0x${string}`): Promise<boolean>;

  getAccountNonce(accountAddress: `0x${string}`): Promise<bigint>;

  getAccountSummary(ownerAddress: `0x${string}`): Promise<{
    owner: `0x${string}`;
    predictedAddress: `0x${string}`;
    isDeployed: boolean;
    nonce: bigint;
    balance: bigint;
  }>;
}

// Single Responsibility: 트랜잭션 실행
export interface ITransactionService {
  submitUserOperation(userOp: UserOperation): Promise<TransactionResult>;

  waitForTransaction(userOpHash: `0x${string}`): Promise<TransactionResult>;

  getTransactionStatus(userOpHash: `0x${string}`): Promise<TransactionProgress>;

  executeSimpleTransfer(userOp: UserOperation, waitForConfirmation?: boolean, skipValidation?: boolean): Promise<TransactionResult>;
}

// Single Responsibility: 검증
export interface IValidationService {
  validateUserOperation(userOp: UserOperation): Promise<ValidationResult>;

  simulateValidation(userOp: UserOperation): Promise<ValidationResult>;
}

// Interface Segregation: 클라이언트별로 필요한 기능만 노출
export interface IAATransactionManager {
  executeTransaction(
    action: Action,
    userAddress: `0x${string}`,
    privateKey: `0x${string}`
  ): Promise<TransactionResult>;
}

// Interface Segregation: 배치 처리 전용
export interface IBatchProcessor {
  processBatch(userOps: UserOperation[]): Promise<TransactionResult[]>;
}

// Interface Segregation: 설정 관리 전용
export interface IConfigurationManager {
  getNetworkConfig(): NetworkConfig;
  getSmartAccountConfig(): SmartAccountConfig;
  updateConfiguration(config: Partial<NetworkConfig>): void;
}

// Interface Segregation: 상태 모니터링 전용
export interface ITransactionMonitor {
  watchTransaction(userOpHash: `0x${string}`): AsyncIterableIterator<TransactionProgress>;

  getProgress(userOpHash: `0x${string}`): Promise<TransactionProgress>;
}

// Dependency Inversion: 상위 수준 정책 정의
export interface IAASystemOrchestrator {
  readonly userOpBuilder: IUserOperationBuilder;
  readonly signatureService: ISignatureService;
  readonly smartAccountService: ISmartAccountService;
  readonly transactionService: ITransactionService;
  readonly validationService: IValidationService;

  executeGaslessTransaction(
    action: Action,
    ownerAddress: `0x${string}`,
    privateKey: `0x${string}`
  ): Promise<TransactionResult>;
}