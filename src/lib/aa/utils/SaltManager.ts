// Salt management utility for deterministic smart account addresses

export class SaltManager {
  private static readonly DEFAULT_SALT = BigInt(0);

  /**
   * Generate deterministic salt for smart account deployment
   * @param ownerAddress - Owner address
   * @param identifier - Additional identifier (optional)
   * @returns Deterministic salt
   */
  static generateSalt(ownerAddress: `0x${string}`, identifier?: string): bigint {
    if (!identifier) {
      return this.DEFAULT_SALT;
    }

    // Create deterministic salt from owner address and identifier
    const combined = ownerAddress + identifier;
    const hash = this.simpleHash(combined);
    return BigInt('0x' + hash.slice(2, 18)); // Use first 16 bytes
  }

  /**
   * Get default salt (0)
   * @returns Default salt value
   */
  static getDefaultSalt(): bigint {
    return this.DEFAULT_SALT;
  }

  /**
   * Simple hash function for deterministic salt generation
   * @param input - Input string to hash
   * @returns Hash string
   */
  private static simpleHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return '0x' + Math.abs(hash).toString(16).padStart(16, '0');
  }

  /**
   * Validate salt value
   * @param salt - Salt to validate
   * @returns True if valid
   */
  static validateSalt(salt: bigint): boolean {
    return salt >= BigInt(0) && salt <= BigInt('0xffffffffffffffffffffffffffffffff');
  }
}