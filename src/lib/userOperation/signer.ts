// UserOperation 서명 서비스 (poc-simple.js의 signUserOperation 기반)

import {
  type PublicClient,
  getContract,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import { type UserOperation } from '../aa/types';
import { ISignatureService } from '../aa/interfaces';
import { EntryPointV08ABI } from '../aa/abi/EntryPointV08';

export class UserOperationSigner implements ISignatureService {
  constructor(
    private publicClient: PublicClient,
    private entryPointAddress: `0x${string}`
  ) {}

  /**
   * UserOperation 서명 (poc-simple.js의 signUserOperation 기반)
   */
  async signUserOperation(
    userOp: UserOperation,
    privateKey: `0x${string}`
  ): Promise<`0x${string}`> {
    console.log('✍️  Signing UserOperation...');

    const userAccount = privateKeyToAccount(privateKey);

    // Get UserOpHash from EntryPoint
    const userOpHash = await this.getUserOpHash(userOp);
    console.log('📝 UserOpHash:', userOpHash);

    // Sign the UserOpHash using EIP-191 message signing
    const signature = await userAccount.signMessage({
      message: { raw: userOpHash }
    });

    console.log('✅ UserOperation signed');
    return signature;
  }

  /**
   * EntryPoint에서 UserOpHash 가져오기
   */
  async getUserOpHash(userOp: UserOperation): Promise<`0x${string}`> {
    const entryPoint = getContract({
      address: this.entryPointAddress,
      abi: EntryPointV08ABI,
      client: this.publicClient
    });

    return await entryPoint.read.getUserOpHash([userOp]);
  }

  /**
   * UserOperation에 서명 추가하여 완성된 UserOp 반환
   */
  async signAndCompleteUserOperation(
    userOp: UserOperation,
    privateKey: `0x${string}`
  ): Promise<UserOperation> {
    const signature = await this.signUserOperation(userOp, privateKey);

    return {
      ...userOp,
      signature
    };
  }

  /**
   * 서명 검증 (디버깅용)
   */
  async verifySignature(
    userOp: UserOperation,
    signature: `0x${string}`,
    expectedSigner: `0x${string}`
  ): Promise<boolean> {
    try {
      const userAccount = privateKeyToAccount('0x' + '0'.repeat(64) as `0x${string}`); // 임시
      const userOpHash = await this.getUserOpHash(userOp);

      // TODO: 실제 서명 검증 로직 구현
      // 현재는 기본적인 체크만 수행
      return signature.length === 132 && signature.startsWith('0x');
    } catch (error) {
      console.warn('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * 배치 UserOperation 서명
   */
  async signBatchUserOperations(
    userOps: UserOperation[],
    privateKeys: `0x${string}`[]
  ): Promise<UserOperation[]> {
    if (userOps.length !== privateKeys.length) {
      throw new Error('UserOperations and private keys arrays must have the same length');
    }

    const signedUserOps: UserOperation[] = [];

    for (let i = 0; i < userOps.length; i++) {
      const signedUserOp = await this.signAndCompleteUserOperation(userOps[i], privateKeys[i]);
      signedUserOps.push(signedUserOp);
    }

    return signedUserOps;
  }

  /**
   * 메시지 서명을 위한 헬퍼 메서드
   */
  static signMessage(message: string, privateKey: `0x${string}`): Promise<`0x${string}`> {
    const account = privateKeyToAccount(privateKey);
    return account.signMessage({ message });
  }

  /**
   * 메시지 해시 서명을 위한 헬퍼 메서드
   */
  static signMessageHash(messageHash: `0x${string}`, privateKey: `0x${string}`): Promise<`0x${string}`> {
    const account = privateKeyToAccount(privateKey);
    return account.signMessage({ message: { raw: messageHash } });
  }
}