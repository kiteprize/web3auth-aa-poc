// SmartAccount 정보 관리 서비스 (poc-simple.js의 스마트 계정 관련 로직 기반)

import {
  type PublicClient,
  getContract,
} from 'viem';

import { type SmartAccountInfo } from '../aa/types';
import { ISmartAccountService } from '../aa/interfaces';
import { MyAccountFactoryABI } from '../aa/abi/SimpleAccountFactory';
import { SaltManager } from '../aa/utils/SaltManager';
import { DeploymentValidator } from '../aa/services/DeploymentValidator';

export class SmartAccountManager implements ISmartAccountService {
  private deploymentValidator: DeploymentValidator;

  constructor(
    private publicClient: PublicClient,
    private factoryAddress: `0x${string}`,
    private entryPointAddress: `0x${string}`
  ) {
    this.deploymentValidator = new DeploymentValidator(publicClient);
  }

  /**
   * SmartAccount 정보 가져오기 (poc-simple.js의 로직 기반)
   */
  async getSmartAccountInfo(
    ownerAddress: `0x${string}`,
    salt: bigint = SaltManager.getDefaultSalt()
  ): Promise<SmartAccountInfo> {
    console.log('🔮 Getting smart account info for owner:', ownerAddress);

    // Predict smart account address using factory
    const smartAccountAddress = await this.predictSmartAccountAddress(ownerAddress, salt);
    console.log('Smart account address:', smartAccountAddress);

    // Check if account is already deployed
    const isDeployed = await this.isAccountDeployed(smartAccountAddress);
    console.log(`📋 Smart account ${isDeployed ? 'already exists' : 'will be created on first UserOperation'}`);

    // Get account nonce
    const nonce = await this.getAccountNonce(smartAccountAddress);

    return {
      address: smartAccountAddress,
      isDeployed,
      nonce,
      owner: ownerAddress
    };
  }

  /**
   * SmartAccount 주소 예측 (poc-simple.js의 factory.read.getAddress 기반)
   */
  async predictSmartAccountAddress(
    ownerAddress: `0x${string}`,
    salt: bigint = SaltManager.getDefaultSalt()
  ): Promise<`0x${string}`> {
    const factory = getContract({
      address: this.factoryAddress,
      abi: MyAccountFactoryABI,
      client: this.publicClient
    });

    return await factory.read.getAddress([ownerAddress, salt]);
  }

  /**
   * SmartAccount 배포 상태 확인 (poc-simple.js의 코드 체크 로직 기반)
   */
  async isAccountDeployed(accountAddress: `0x${string}`): Promise<boolean> {
    return this.deploymentValidator.isAccountDeployed(accountAddress);
  }

  /**
   * SmartAccount nonce 가져오기
   */
  async getAccountNonce(accountAddress: `0x${string}`): Promise<bigint> {
    try {
      // EntryPoint에서 nonce 조회
      const nonce = await this.publicClient.readContract({
        address: this.entryPointAddress,
        abi: [
          {
            type: 'function',
            name: 'getNonce',
            inputs: [
              { name: 'sender', type: 'address' },
              { name: 'key', type: 'uint192' }
            ],
            outputs: [{ name: 'nonce', type: 'uint256' }]
          }
        ],
        functionName: 'getNonce',
        args: [accountAddress, BigInt(0)]
      });

      return nonce as bigint;
    } catch (error) {
      console.warn('Failed to get account nonce, returning 0:', error);
      return BigInt(0);
    }
  }

  /**
   * 특정 owner의 모든 가능한 SmartAccount 주소 생성 (여러 salt 값으로)
   */
  async generateAccountAddresses(
    ownerAddress: `0x${string}`,
    saltRange: { from: bigint; to: bigint }
  ): Promise<Map<bigint, `0x${string}`>> {
    const addresses = new Map<bigint, `0x${string}`>();

    for (let salt = saltRange.from; salt <= saltRange.to; salt++) {
      try {
        const address = await this.predictSmartAccountAddress(ownerAddress, salt);
        addresses.set(salt, address);
      } catch (error) {
        console.warn(`Failed to predict address for salt ${salt}:`, error);
      }
    }

    return addresses;
  }

  /**
   * SmartAccount 소유자 확인
   */
  async verifyAccountOwner(
    accountAddress: `0x${string}`,
    expectedOwner: `0x${string}`
  ): Promise<boolean> {
    try {
      if (!await this.isAccountDeployed(accountAddress)) {
        // 배포되지 않은 계정은 factory로 예측된 주소와 비교
        const predictedAddress = await this.predictSmartAccountAddress(expectedOwner);
        return predictedAddress.toLowerCase() === accountAddress.toLowerCase();
      }

      // 배포된 계정은 실제 owner를 조회
      const actualOwner = await this.publicClient.readContract({
        address: accountAddress,
        abi: [
          {
            type: 'function',
            name: 'owner',
            inputs: [],
            outputs: [{ name: '', type: 'address' }]
          }
        ],
        functionName: 'owner'
      });

      return (actualOwner as string).toLowerCase() === expectedOwner.toLowerCase();
    } catch (error) {
      console.warn('Failed to verify account owner:', error);
      return false;
    }
  }

  /**
   * 배치로 여러 계정의 배포 상태 확인
   */
  async batchCheckDeployment(accountAddresses: `0x${string}`[]): Promise<Map<`0x${string}`, boolean>> {
    return this.deploymentValidator.batchCheckDeployment(accountAddresses);
  }

  /**
   * SmartAccount의 기본 정보 요약
   */
  async getAccountSummary(ownerAddress: `0x${string}`): Promise<{
    owner: `0x${string}`;
    predictedAddress: `0x${string}`;
    isDeployed: boolean;
    nonce: bigint;
    balance: bigint;
  }> {
    const predictedAddress = await this.predictSmartAccountAddress(ownerAddress);
    const isDeployed = await this.isAccountDeployed(predictedAddress);
    const nonce = await this.getAccountNonce(predictedAddress);

    // 계정 잔액 조회
    const balance = await this.publicClient.getBalance({
      address: predictedAddress
    });

    return {
      owner: ownerAddress,
      predictedAddress,
      isDeployed,
      nonce,
      balance
    };
  }
}