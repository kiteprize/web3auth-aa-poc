// Service for validating smart account deployment status

import { type PublicClient } from 'viem';

export class DeploymentValidator {
  constructor(private publicClient: PublicClient) {}

  /**
   * Check if a smart account is already deployed
   * @param accountAddress - Smart account address to check
   * @returns True if deployed, false otherwise
   */
  async isAccountDeployed(accountAddress: `0x${string}`): Promise<boolean> {
    try {
      const code = await this.publicClient.getCode({ address: accountAddress });
      return Boolean(code && code !== '0x');
    } catch (error) {
      console.warn('Failed to check account deployment status:', error);
      return false;
    }
  }

  /**
   * Validate that an account address is a valid Ethereum address
   * @param address - Address to validate
   * @returns True if valid
   */
  static isValidAddress(address: string): address is `0x${string}` {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Check if an address is the zero address
   * @param address - Address to check
   * @returns True if zero address
   */
  static isZeroAddress(address: `0x${string}`): boolean {
    return address === '0x0000000000000000000000000000000000000000';
  }

  /**
   * Batch check deployment status for multiple accounts
   * @param accountAddresses - Array of account addresses to check
   * @returns Map of address to deployment status
   */
  async batchCheckDeployment(
    accountAddresses: `0x${string}`[]
  ): Promise<Map<`0x${string}`, boolean>> {
    const results = new Map<`0x${string}`, boolean>();

    const promises = accountAddresses.map(async (address) => {
      const isDeployed = await this.isAccountDeployed(address);
      results.set(address, isDeployed);
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Estimate gas for smart account deployment
   * @param initCode - Deployment initCode
   * @param from - Deployer address
   * @returns Estimated gas
   */
  async estimateDeploymentGas(
    initCode: `0x${string}`,
    from: `0x${string}`
  ): Promise<bigint> {
    try {
      return await this.publicClient.estimateGas({
        data: initCode,
        account: from,
      });
    } catch (error) {
      // Fallback to a reasonable default for deployment
      console.warn('Failed to estimate deployment gas, using default:', error);
      return BigInt(1000000); // 1M gas as default
    }
  }
}