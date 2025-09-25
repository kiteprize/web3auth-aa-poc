// ERC-4337 v0.8 EntryPoint ABI - 안정적인 직접 정의 방식

export const EntryPointV08ABI = [
  {
    type: 'function' as const,
    name: 'handleOps' as const,
    inputs: [
      {
        name: 'ops' as const,
        type: 'tuple[]' as const,
        components: [
          { name: 'sender' as const, type: 'address' as const },
          { name: 'nonce' as const, type: 'uint256' as const },
          { name: 'initCode' as const, type: 'bytes' as const },
          { name: 'callData' as const, type: 'bytes' as const },
          { name: 'accountGasLimits' as const, type: 'bytes32' as const },
          { name: 'preVerificationGas' as const, type: 'uint256' as const },
          { name: 'gasFees' as const, type: 'bytes32' as const },
          { name: 'paymasterAndData' as const, type: 'bytes' as const },
          { name: 'signature' as const, type: 'bytes' as const }
        ] as const
      },
      { name: 'beneficiary' as const, type: 'address' as const }
    ] as const,
    outputs: [] as const,
    stateMutability: 'nonpayable' as const
  },
  {
    type: 'function' as const,
    name: 'getUserOpHash' as const,
    inputs: [
      {
        name: 'userOp' as const,
        type: 'tuple' as const,
        components: [
          { name: 'sender' as const, type: 'address' as const },
          { name: 'nonce' as const, type: 'uint256' as const },
          { name: 'initCode' as const, type: 'bytes' as const },
          { name: 'callData' as const, type: 'bytes' as const },
          { name: 'accountGasLimits' as const, type: 'bytes32' as const },
          { name: 'preVerificationGas' as const, type: 'uint256' as const },
          { name: 'gasFees' as const, type: 'bytes32' as const },
          { name: 'paymasterAndData' as const, type: 'bytes' as const },
          { name: 'signature' as const, type: 'bytes' as const }
        ] as const
      }
    ] as const,
    outputs: [{ name: '' as const, type: 'bytes32' as const }] as const,
    stateMutability: 'view' as const
  },
  {
    type: 'function' as const,
    name: 'getNonce' as const,
    inputs: [
      { name: 'sender' as const, type: 'address' as const },
      { name: 'key' as const, type: 'uint192' as const }
    ] as const,
    outputs: [{ name: 'nonce' as const, type: 'uint256' as const }] as const,
    stateMutability: 'view' as const
  },
  {
    type: 'function' as const,
    name: 'simulateValidation' as const,
    inputs: [
      {
        name: 'userOp' as const,
        type: 'tuple' as const,
        components: [
          { name: 'sender' as const, type: 'address' as const },
          { name: 'nonce' as const, type: 'uint256' as const },
          { name: 'initCode' as const, type: 'bytes' as const },
          { name: 'callData' as const, type: 'bytes' as const },
          { name: 'accountGasLimits' as const, type: 'bytes32' as const },
          { name: 'preVerificationGas' as const, type: 'uint256' as const },
          { name: 'gasFees' as const, type: 'bytes32' as const },
          { name: 'paymasterAndData' as const, type: 'bytes' as const },
          { name: 'signature' as const, type: 'bytes' as const }
        ] as const
      }
    ] as const,
    outputs: [] as const,
    stateMutability: 'nonpayable' as const
  }
] as const;

export default EntryPointV08ABI;