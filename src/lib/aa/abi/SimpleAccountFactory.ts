// MyAccountFactory ABI (실제 artifacts에서 추출)

export const MyAccountFactoryABI = [
  {
    type: 'function',
    name: 'createAccount',
    inputs: [
      { name: 'owner', type: 'address', internalType: 'address' },
      { name: 'salt', type: 'uint256', internalType: 'uint256' }
    ],
    outputs: [{ name: 'ret', type: 'address', internalType: 'contract MyAccount' }],
    stateMutability: 'nonpayable'
  },
  {
    type: 'function',
    name: 'getAddress',
    inputs: [
      { name: 'owner', type: 'address', internalType: 'address' },
      { name: 'salt', type: 'uint256', internalType: 'uint256' }
    ],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
    stateMutability: 'view'
  }
] as const;

export default MyAccountFactoryABI;