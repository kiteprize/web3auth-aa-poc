// 체인 설정 매핑 (testnet/mainnet만 지원)

import { bsc, bscTestnet } from 'viem/chains';
import type { Chain } from 'viem';

export type SupportedNetwork = 'testnet' | 'mainnet';

/**
 * 네트워크 모드에 따른 체인 설정 반환
 */
export function getChainConfig(networkMode: SupportedNetwork): Chain {
  switch (networkMode) {
    case 'mainnet':
      return bsc;
    case 'testnet':
    default:
      return bscTestnet;
  }
}

/**
 * 체인별 기본 설정값
 */
export const CHAIN_DEFAULTS = {
  testnet: {
    chain: bscTestnet,
    chainId: 97,
    name: 'BSC Testnet',
    currency: 'tBNB',
    explorerUrl: 'https://testnet.bscscan.com',
    defaultRpcUrls: [
      'https://bsc-testnet-dataseed.bnbchain.org',
      'https://bsc-testnet.public.blastapi.io',
      'https://bsc-testnet-rpc.publicnode.com'
    ]
  },
  mainnet: {
    chain: bsc,
    chainId: 56,
    name: 'BSC Mainnet',
    currency: 'BNB',
    explorerUrl: 'https://bscscan.com',
    defaultRpcUrls: [
      'https://bsc-dataseed.binance.org',
      'https://bsc-dataseed1.binance.org',
      'https://bsc-dataseed2.binance.org'
    ]
  }
} as const;

/**
 * 네트워크 모드에 따른 기본값 반환
 */
export function getChainDefaults(networkMode: SupportedNetwork) {
  return CHAIN_DEFAULTS[networkMode];
}

/**
 * 체인 ID로 네트워크 모드 추정
 */
export function getNetworkModeByChainId(chainId: number): SupportedNetwork {
  switch (chainId) {
    case 56:
      return 'mainnet';
    case 97:
    default:
      return 'testnet';
  }
}

/**
 * 현재 네트워크가 테스트넷인지 확인
 */
export function isTestnet(networkMode: SupportedNetwork): boolean {
  return networkMode === 'testnet';
}

/**
 * 현재 네트워크가 메인넷인지 확인
 */
export function isMainnet(networkMode: SupportedNetwork): boolean {
  return networkMode === 'mainnet';
}