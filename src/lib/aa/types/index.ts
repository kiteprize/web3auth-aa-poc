// AA 시스템에서 사용되는 핵심 타입 정의

export interface UserOperation {
  sender: `0x${string}`;
  nonce: bigint;
  initCode: `0x${string}`;
  callData: `0x${string}`;
  accountGasLimits: `0x${string}`;
  preVerificationGas: bigint;
  gasFees: `0x${string}`;
  paymasterAndData: `0x${string}`;
  signature: `0x${string}`;
}

export interface Action {
  to: `0x${string}`;
  value: bigint;
  data: `0x${string}`;
}

export interface SmartAccountConfig {
  factoryAddress: `0x${string}`;
  entryPointAddress: `0x${string}`;
  salt: bigint;
}

export interface NetworkConfig {
  chainId: number;
  rpcUrl: string;
  entryPointAddress: `0x${string}`;
  factoryAddress: `0x${string}`;
}

export interface TransactionRequest {
  action: Action;
  userAddress: `0x${string}`;
  privateKey: `0x${string}`;
}

export interface TransactionResult {
  success: boolean;
  txHash?: `0x${string}`;
  userOpHash: `0x${string}`;
  error?: string;
  gasUsed?: bigint;
  blockNumber?: string;
  requestId?: string;
  status?: 'queued' | 'pending' | 'confirmed' | 'failed';
}

export interface SmartAccountInfo {
  address: `0x${string}`;
  isDeployed: boolean;
  nonce: bigint;
  owner: `0x${string}`;
}

export interface BatchUserOperation {
  userOp: UserOperation;
  userOpHash: `0x${string}`;
  requestId: string;
  timestamp: number;
}

export type TransactionStatus = 'pending' | 'submitted' | 'confirmed' | 'failed';

export interface TransactionProgress {
  status: TransactionStatus;
  message: string;
  txHash?: `0x${string}`;
  userOpHash?: `0x${string}`;
  blockNumber?: number;
  gasUsed?: bigint;
  error?: string;
}

export interface GasEstimate {
  verificationGasLimit: bigint;
  callGasLimit: bigint;
  preVerificationGas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  gasEstimate?: GasEstimate;
}