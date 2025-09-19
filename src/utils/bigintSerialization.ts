// BigInt serialization utilities for UserOperation

export function serializeBigInt(value: bigint): string {
  return value.toString();
}

export function deserializeBigInt(value: string): bigint {
  return BigInt(value);
}

export function packGasLimits(verificationGasLimit: bigint, callGasLimit: bigint): `0x${string}` {
  return `0x${verificationGasLimit.toString(16).padStart(32, '0')}${callGasLimit.toString(16).padStart(32, '0')}` as `0x${string}`;
}

export function packGasFees(maxPriorityFeePerGas: bigint, maxFeePerGas: bigint): `0x${string}` {
  return `0x${maxPriorityFeePerGas.toString(16).padStart(32, '0')}${maxFeePerGas.toString(16).padStart(32, '0')}` as `0x${string}`;
}

export function unpackGasLimits(packed: `0x${string}`): { verificationGasLimit: bigint, callGasLimit: bigint } {
  const hex = packed.slice(2);
  const verificationGasLimit = BigInt('0x' + hex.slice(0, 32));
  const callGasLimit = BigInt('0x' + hex.slice(32, 64));
  return { verificationGasLimit, callGasLimit };
}

export function unpackGasFees(packed: `0x${string}`): { maxPriorityFeePerGas: bigint, maxFeePerGas: bigint } {
  const hex = packed.slice(2);
  const maxPriorityFeePerGas = BigInt('0x' + hex.slice(0, 32));
  const maxFeePerGas = BigInt('0x' + hex.slice(32, 64));
  return { maxPriorityFeePerGas, maxFeePerGas };
}