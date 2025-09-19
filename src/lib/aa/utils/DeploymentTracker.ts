// Utility for tracking smart account deployment status and history

export interface DeploymentRecord {
  accountAddress: `0x${string}`;
  ownerAddress: `0x${string}`;
  salt: bigint;
  deployedAt: Date;
  transactionHash: `0x${string}`;
  blockNumber: number;
}

export interface PendingDeployment {
  accountAddress: `0x${string}`;
  ownerAddress: `0x${string}`;
  salt: bigint;
  submittedAt: Date;
  userOpHash: `0x${string}`;
}

export class DeploymentTracker {
  private deployedAccounts = new Map<`0x${string}`, DeploymentRecord>();
  private pendingDeployments = new Map<`0x${string}`, PendingDeployment>();

  /**
   * Add a pending deployment
   * @param deployment - Pending deployment info
   */
  addPendingDeployment(deployment: PendingDeployment): void {
    this.pendingDeployments.set(deployment.accountAddress, deployment);
  }

  /**
   * Mark a deployment as completed
   * @param accountAddress - Smart account address
   * @param transactionHash - Transaction hash
   * @param blockNumber - Block number
   */
  markDeploymentCompleted(
    accountAddress: `0x${string}`,
    transactionHash: `0x${string}`,
    blockNumber: number
  ): void {
    const pending = this.pendingDeployments.get(accountAddress);
    if (pending) {
      const deploymentRecord: DeploymentRecord = {
        accountAddress,
        ownerAddress: pending.ownerAddress,
        salt: pending.salt,
        deployedAt: new Date(),
        transactionHash,
        blockNumber,
      };

      this.deployedAccounts.set(accountAddress, deploymentRecord);
      this.pendingDeployments.delete(accountAddress);
    }
  }

  /**
   * Check if an account is pending deployment
   * @param accountAddress - Smart account address
   * @returns True if pending
   */
  isPendingDeployment(accountAddress: `0x${string}`): boolean {
    return this.pendingDeployments.has(accountAddress);
  }

  /**
   * Check if an account deployment is tracked as completed
   * @param accountAddress - Smart account address
   * @returns True if completed
   */
  isDeploymentCompleted(accountAddress: `0x${string}`): boolean {
    return this.deployedAccounts.has(accountAddress);
  }

  /**
   * Get deployment record for an account
   * @param accountAddress - Smart account address
   * @returns Deployment record or undefined
   */
  getDeploymentRecord(accountAddress: `0x${string}`): DeploymentRecord | undefined {
    return this.deployedAccounts.get(accountAddress);
  }

  /**
   * Get pending deployment info
   * @param accountAddress - Smart account address
   * @returns Pending deployment info or undefined
   */
  getPendingDeployment(accountAddress: `0x${string}`): PendingDeployment | undefined {
    return this.pendingDeployments.get(accountAddress);
  }

  /**
   * Get all deployed accounts for an owner
   * @param ownerAddress - Owner address
   * @returns Array of deployment records
   */
  getDeploymentsByOwner(ownerAddress: `0x${string}`): DeploymentRecord[] {
    return Array.from(this.deployedAccounts.values())
      .filter(record => record.ownerAddress.toLowerCase() === ownerAddress.toLowerCase());
  }

  /**
   * Get all pending deployments for an owner
   * @param ownerAddress - Owner address
   * @returns Array of pending deployments
   */
  getPendingDeploymentsByOwner(ownerAddress: `0x${string}`): PendingDeployment[] {
    return Array.from(this.pendingDeployments.values())
      .filter(pending => pending.ownerAddress.toLowerCase() === ownerAddress.toLowerCase());
  }

  /**
   * Clear old pending deployments (older than specified minutes)
   * @param maxAgeMinutes - Maximum age in minutes
   */
  clearOldPendingDeployments(maxAgeMinutes: number = 30): void {
    const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);

    for (const [address, pending] of this.pendingDeployments.entries()) {
      if (pending.submittedAt < cutoff) {
        this.pendingDeployments.delete(address);
      }
    }
  }

  /**
   * Get deployment statistics
   * @returns Deployment statistics
   */
  getStatistics() {
    return {
      totalDeployed: this.deployedAccounts.size,
      totalPending: this.pendingDeployments.size,
      uniqueOwners: new Set([
        ...Array.from(this.deployedAccounts.values()).map(r => r.ownerAddress),
        ...Array.from(this.pendingDeployments.values()).map(p => p.ownerAddress)
      ]).size
    };
  }
}