// UserOperation 생성 핵심 로직 (poc-simple.js 기반)

import {
  type PublicClient,
  encodeFunctionData,
  getContract,
} from 'viem';

import {
  type UserOperation,
  type Action,
  type SmartAccountInfo,
  type GasEstimate,
} from '../aa/types';

import { packGasLimits, packGasFees } from '@/utils/bigintSerialization';
import { SaltManager } from '../aa/utils/SaltManager';
import { DeploymentValidator } from '../aa/services/DeploymentValidator';
import { MyAccountFactoryABI } from '../aa/abi/SimpleAccountFactory';
import { DeploymentTracker } from '../aa/utils/DeploymentTracker';
import { MyAccountABI } from '../aa/abi/SimpleAccount';
import { EntryPointV08ABI } from '../aa/abi/EntryPointV08';
import { IUserOperationBuilder } from '../aa/interfaces';

export class UserOperationCreator implements IUserOperationBuilder {
  private deploymentValidator: DeploymentValidator;
  private deploymentTracker: DeploymentTracker;

  constructor(
    private publicClient: PublicClient,
    private factoryAddress: `0x${string}`,
    private entryPointAddress: `0x${string}`
  ) {
    this.deploymentValidator = new DeploymentValidator(publicClient);
    this.deploymentTracker = new DeploymentTracker();
  }

  /**
   * UserOperation 생성 (poc-simple.js의 createUserOperation 기반)
   */
  async buildUserOperation(
    action: Action,
    smartAccountInfo: SmartAccountInfo,
    needsDeployment: boolean
  ): Promise<UserOperation> {
    console.log('🔨 Creating UserOperation...');

    // Get nonce from EntryPoint
    const nonce = await this.publicClient.readContract({
      address: this.entryPointAddress,
      abi: EntryPointV08ABI,
      functionName: 'getNonce',
      args: [smartAccountInfo.address, BigInt(0)]
    });

    // Create initCode if account needs deployment
    let initCode: `0x${string}` = '0x';
    if (needsDeployment) {
      const createAccountCalldata = encodeFunctionData({
        abi: MyAccountFactoryABI,
        functionName: 'createAccount',
        args: [smartAccountInfo.owner, SaltManager.getDefaultSalt()]
      });
      initCode = `${this.factoryAddress}${createAccountCalldata.slice(2)}` as `0x${string}`;
      console.log('📋 Account will be deployed with initCode');
    }

    // Create execute calldata for the action
    const executeCalldata = encodeFunctionData({
      abi: MyAccountABI,
      functionName: 'execute',
      args: [action.to, action.value, action.data]
    });

    // Gas limits (packed into bytes32) - increase for deployment
    const verificationGasLimit = needsDeployment ? BigInt(1000000) : BigInt(100000);
    const callGasLimit = BigInt(100000);
    const accountGasLimits = packGasLimits(verificationGasLimit, callGasLimit);

    // Gas fees (packed into bytes32) - set to 0 for gasless transaction
    const gasFees = packGasFees(BigInt(0), BigInt(0));

    const userOp: UserOperation = {
      sender: smartAccountInfo.address,
      nonce: nonce as bigint,
      initCode,
      callData: executeCalldata,
      accountGasLimits,
      preVerificationGas: needsDeployment ? BigInt(100000) : BigInt(50000),
      gasFees,
      paymasterAndData: '0x',
      signature: '0x'
    };

    console.log('📋 UserOperation created');
    console.log('   Sender:', userOp.sender);
    console.log('   Nonce:', nonce);
    console.log('   InitCode length:', initCode.length);

    return userOp;
  }

  /**
   * 가스 추정 (기본값 반환, 실제로는 더 정교한 추정 필요)
   */
  async estimateGas(userOp: UserOperation): Promise<GasEstimate> {
    try {
      // TODO: 실제 가스 추정 로직 구현
      // simulateValidation을 통한 정확한 가스 추정

      return {
        verificationGasLimit: BigInt(100000),
        callGasLimit: BigInt(100000),
        preVerificationGas: BigInt(50000),
        maxFeePerGas: BigInt(0), // gasless
        maxPriorityFeePerGas: BigInt(0) // gasless
      };
    } catch (error) {
      console.warn('Gas estimation failed, using defaults:', error);
      return {
        verificationGasLimit: BigInt(200000),
        callGasLimit: BigInt(150000),
        preVerificationGas: BigInt(100000),
        maxFeePerGas: BigInt(0),
        maxPriorityFeePerGas: BigInt(0)
      };
    }
  }

  /**
   * initCode 생성을 위한 헬퍼 메서드
   */
  private async createInitCode(
    ownerAddress: `0x${string}`,
    salt: bigint = SaltManager.getDefaultSalt()
  ): Promise<`0x${string}`> {
    const createAccountCalldata = encodeFunctionData({
      abi: MyAccountFactoryABI,
      functionName: 'createAccount',
      args: [ownerAddress, salt]
    });

    return `${this.factoryAddress}${createAccountCalldata.slice(2)}` as `0x${string}`;
  }

  /**
   * 배치 트랜잭션용 UserOperation 생성
   */
  async buildBatchUserOperation(
    actions: Action[],
    smartAccountInfo: SmartAccountInfo,
    needsDeployment: boolean
  ): Promise<UserOperation> {
    console.log(`🔨 Creating Batch UserOperation for ${actions.length} actions...`);

    // Get nonce
    const nonce = await this.publicClient.readContract({
      address: this.entryPointAddress,
      abi: EntryPointV08ABI,
      functionName: 'getNonce',
      args: [smartAccountInfo.address, BigInt(0)]
    });

    // Create initCode if needed
    let initCode: `0x${string}` = '0x';
    if (needsDeployment) {
      initCode = await this.createInitCode(smartAccountInfo.owner);
    }

    // Create executeBatch calldata
    const calls = actions.map(action => ({
      target: action.to,
      value: action.value,
      data: action.data
    }));

    const executeBatchCalldata = encodeFunctionData({
      abi: MyAccountABI,
      functionName: 'executeBatch',
      args: [calls]
    });

    // Adjust gas limits for batch operations
    const verificationGasLimit = needsDeployment ? BigInt(1000000) : BigInt(150000);
    const callGasLimit = BigInt(100000) + (BigInt(50000) * BigInt(actions.length)); // Scale with number of actions
    const accountGasLimits = packGasLimits(verificationGasLimit, callGasLimit);

    const gasFees = packGasFees(BigInt(0), BigInt(0));

    const userOp: UserOperation = {
      sender: smartAccountInfo.address,
      nonce: nonce as bigint,
      initCode,
      callData: executeBatchCalldata,
      accountGasLimits,
      preVerificationGas: needsDeployment ? BigInt(120000) : BigInt(70000),
      gasFees,
      paymasterAndData: '0x',
      signature: '0x'
    };

    console.log(`📋 Batch UserOperation created for ${actions.length} actions`);
    return userOp;
  }
}