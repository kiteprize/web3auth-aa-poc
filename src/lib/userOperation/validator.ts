// UserOperation 검증 서비스

import {
  type PublicClient,
  getContract
} from 'viem';

import {
  type UserOperation,
  type ValidationResult
} from '../aa/types';
import { IValidationService } from '../aa/interfaces';
import { EntryPointV08ABI } from '../aa/abi/EntryPointV08';

export class ValidationService implements IValidationService {
  constructor(
    private publicClient: PublicClient,
    private entryPointAddress: `0x${string}`
  ) {}

  /**
   * UserOperation 기본 검증
   */
  async validateUserOperation(userOp: UserOperation): Promise<ValidationResult> {
    try {
      // 1. 기본 필드 검증
      const basicValidation = this.validateBasicFields(userOp);
      if (!basicValidation.valid) {
        return basicValidation;
      }

      // 2. 서명 존재 확인
      if (!userOp.signature || userOp.signature === '0x') {
        return {
          valid: false,
          error: 'UserOperation signature is required'
        };
      }

      // 3. 추가 검증은 simulateValidation에서 수행
      return {
        valid: true
      };

    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * EntryPoint를 통한 시뮬레이션 검증 (optimize.md의 simulateValidation 기반)
   */
  async simulateValidation(userOp: UserOperation): Promise<ValidationResult> {
    try {
      console.log('🔍 Simulating UserOperation validation...');

      await this.publicClient.simulateContract({
        address: this.entryPointAddress,
        abi: EntryPointV08ABI,
        functionName: 'simulateValidation',
        args: [userOp as any]
      });

      console.log('✅ UserOperation validation simulation passed');
      return {
        valid: true
      };

    } catch (error: any) {
      console.warn('❌ UserOperation validation simulation failed:', error);
      return {
        valid: false,
        error: error.shortMessage || error.message || String(error)
      };
    }
  }

  /**
   * 기본 필드 검증
   */
  private validateBasicFields(userOp: UserOperation): ValidationResult {
    const requiredFields = [
      'sender',
      'nonce',
      'initCode',
      'callData',
      'accountGasLimits',
      'preVerificationGas',
      'gasFees',
      'paymasterAndData'
    ];

    for (const field of requiredFields) {
      if (!(field in userOp)) {
        return {
          valid: false,
          error: `Missing required field: ${field}`
        };
      }
    }

    // 주소 형식 검증
    if (!this.isValidAddress(userOp.sender)) {
      return {
        valid: false,
        error: 'Invalid sender address format'
      };
    }

    // nonce 검증
    if (typeof userOp.nonce !== 'bigint' || userOp.nonce < BigInt(0)) {
      return {
        valid: false,
        error: 'Invalid nonce: must be a non-negative bigint'
      };
    }

    // preVerificationGas 검증
    if (typeof userOp.preVerificationGas !== 'bigint' || userOp.preVerificationGas < BigInt(0)) {
      return {
        valid: false,
        error: 'Invalid preVerificationGas: must be a non-negative bigint'
      };
    }

    return {
      valid: true
    };
  }

  /**
   * 주소 형식 검증
   */
  private isValidAddress(address: string): address is `0x${string}` {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * hex 데이터 형식 검증
   */
  private isValidHexData(data: string): data is `0x${string}` {
    return /^0x[a-fA-F0-9]*$/.test(data);
  }

  /**
   * 가스 한도 검증
   */
  validateGasLimits(accountGasLimits: `0x${string}`): ValidationResult {
    if (!this.isValidHexData(accountGasLimits)) {
      return {
        valid: false,
        error: 'Invalid accountGasLimits format'
      };
    }

    // 64자리 hex (32바이트) + '0x' 프리픽스 = 66자리
    if (accountGasLimits.length !== 66) {
      return {
        valid: false,
        error: 'accountGasLimits must be exactly 32 bytes (64 hex characters)'
      };
    }

    return {
      valid: true
    };
  }

  /**
   * 가스 수수료 검증
   */
  validateGasFees(gasFees: `0x${string}`): ValidationResult {
    if (!this.isValidHexData(gasFees)) {
      return {
        valid: false,
        error: 'Invalid gasFees format'
      };
    }

    if (gasFees.length !== 66) {
      return {
        valid: false,
        error: 'gasFees must be exactly 32 bytes (64 hex characters)'
      };
    }

    return {
      valid: true
    };
  }

  /**
   * UserOperation 배열 검증 (배치 처리용)
   */
  async validateUserOperationBatch(userOps: UserOperation[]): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const [index, userOp] of userOps.entries()) {
      console.log(`Validating UserOp ${index + 1}/${userOps.length}...`);
      const result = await this.validateUserOperation(userOp);
      results.push(result);

      // 하나라도 실패하면 로그 출력 (하지만 계속 진행)
      if (!result.valid) {
        console.warn(`UserOp ${index + 1} validation failed:`, result.error);
      }
    }

    return results;
  }

  /**
   * UserOperation 크기 검증
   */
  validateUserOperationSize(userOp: UserOperation): ValidationResult {
    const userOpString = JSON.stringify(userOp);
    const sizeInBytes = new Blob([userOpString]).size;

    // 일반적인 UserOperation 크기 제한 (예: 64KB)
    const maxSizeBytes = 64 * 1024;

    if (sizeInBytes > maxSizeBytes) {
      return {
        valid: false,
        error: `UserOperation size (${sizeInBytes} bytes) exceeds maximum allowed size (${maxSizeBytes} bytes)`
      };
    }

    return {
      valid: true
    };
  }
}