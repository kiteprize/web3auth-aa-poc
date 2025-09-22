// 테스트용 컨트랙트 주소들 (환경변수 기반)

import { getAppConfig, getContractAddresses, isTestnet } from '@/config/environment';

export interface TestContract {
  address: string;
  name: string;
  abi: any[];
  description: string;
}

export interface TestTokenContract extends TestContract {
  symbol: string;
  decimals: number;
  totalSupply: string;
}

// 공용 ERC-20 토큰 ABI
const ERC20_ABI = [
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
  'function totalSupply() external view returns (uint256)',
  'function balanceOf(address owner) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
];

/**
 * 현재 네트워크에 따른 테스트 컨트랙트 반환
 */
export function getCurrentTestContracts() {
  const config = getAppConfig();
  const contractAddresses = getContractAddresses();

  if (config.isTestnet) {
    return {
      // 테스트넷용 토큰들
      testTokens: [
        {
          address: contractAddresses.testTokenAddress || '0x420049e251e5f0a350d7f11d127e1da446f3d447',
          name: 'Test Token',
          symbol: 'TEST',
          decimals: 18,
          totalSupply: '1000000000000000000000000', // 1M tokens
          abi: ERC20_ABI,
          description: '테스트용 토큰 - 가스리스 전송 테스트에 사용'
        }
      ] as TestTokenContract[],

      // 테스트용 상호작용 컨트랙트들
      testContracts: [
        {
          address: '0x', // 필요시 환경변수로 추가 가능
          name: 'Counter Contract',
          abi: [
            'function count() external view returns (uint256)',
            'function increment() external',
            'function decrement() external',
            'function reset() external',
            'event CountChanged(uint256 newCount)'
          ],
          description: '간단한 카운터 컨트랙트 - 가스리스 상태 변경 테스트'
        }
      ] as TestContract[]
    };
  } else {
    // 메인넷용
    return {
      testTokens: [
        {
          address: '0x55d398326f99059ff775485246999027b3197955',
          name: 'Tether USD',
          symbol: 'USDT',
          decimals: 18,
          totalSupply: '0', // 실제 토큰이므로 공급량 조회 필요
          abi: ERC20_ABI,
          description: '실제 USDT 토큰 (소량 테스트만 권장)'
        }
      ] as TestTokenContract[],

      testContracts: [] as TestContract[]
    };
  }
}

// 특정 토큰 주소로 토큰 정보 찾기
export function findTestToken(address: string): TestTokenContract | undefined {
  const contracts = getCurrentTestContracts();
  return contracts.testTokens.find(token => 
    token.address.toLowerCase() === address.toLowerCase()
  );
}

// 특정 컨트랙트 주소로 컨트랙트 정보 찾기
export function findTestContract(address: string): TestContract | undefined {
  const contracts = getCurrentTestContracts();
  return contracts.testContracts.find(contract => 
    contract.address.toLowerCase() === address.toLowerCase()
  );
}

// 테스트 시나리오에서 사용할 미리 정의된 주소들
export const TEST_ADDRESSES = {
  // 테스트용 수신자 주소들 (실제 사용하지 않는 주소들)
  recipients: [
    '0x742da9C7e86a326c789F6b8C57D2d26e5c5B02B8' as const,
    '0x8ba1f109551bD432803012645Hac136c863d40B8' as const,
    '0x9C87BC5D6e8F7FE8F4B7c5b3F8F9e7E6D5C4B3A2' as const,
  ],
  
  // 잘 알려진 번 주소 (토큰 소각용)
  burnAddress: '0x000000000000000000000000000000000000dead' as const,
  
  // 제로 주소
  zeroAddress: '0x0000000000000000000000000000000000000000' as const,
} as const;

// 테스트 시나리오별 기본값들
export const TEST_DEFAULTS = {
  bnbAmount: '0.001', // 0.001 BNB
  tokenAmount: '1',   // 1 token
  largeTokenAmount: '100', // 100 tokens
  
  // 가스 한도 (추정값)
  gasLimits: {
    bnbTransfer: '21000',
    tokenTransfer: '65000',
    contractCall: '100000',
    multiCall: '200000',
  }
} as const;

export type TestScenarioType = 
  | 'bnb-transfer'
  | 'token-transfer' 
  | 'contract-call'
  | 'multi-call'
  | 'batch-transaction';

// 각 시나리오별 설명
export const SCENARIO_DESCRIPTIONS = {
  'bnb-transfer': 'BNB를 다른 주소로 전송하는 기본적인 가스리스 트랜잭션',
  'token-transfer': 'ERC-20/BEP-20 토큰을 전송하는 가스리스 트랜잭션',
  'contract-call': '스마트 컨트랙트의 함수를 호출하는 가스리스 트랜잭션',
  'multi-call': '여러 컨트랙트 함수를 한 번에 호출하는 배치 트랜잭션',
  'batch-transaction': '여러 개의 독립적인 트랜잭션을 순차적으로 실행'
} as const;