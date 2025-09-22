// 환경 설정 중앙 관리

import {
  validateEnvironmentVariables,
  type EnvironmentVariables,
} from "@/utils/env-validator";
import {
  getChainConfig,
  getChainDefaults,
  type SupportedNetwork,
} from "./chains";
import type { Chain } from "viem";

/**
 * 애플리케이션 환경 설정
 */
export interface AppConfig {
  // 환경 정보
  nodeEnv: "development" | "staging" | "production";
  networkMode: SupportedNetwork;
  isProduction: boolean;
  isTestnet: boolean;

  // 네트워크 설정
  chain: Chain;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;

  // 인증 정보
  privateKey: `0x${string}`;

  // 컨트랙트 주소들
  entryPointAddress: `0x${string}`;
  factoryAddress: `0x${string}`;
  testTokenAddress?: `0x${string}`;

  // 외부 서비스 설정
  redis?: {
    url: string;
    token: string;
  };
  web3Auth?: {
    clientId: string;
  };
}

let cachedConfig: AppConfig | null = null;

/**
 * 환경 설정 가져오기 (캐시된 설정 반환)
 */
export function getAppConfig(): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const env = validateEnvironmentVariables();
  cachedConfig = createAppConfig(env);
  return cachedConfig;
}

/**
 * 환경 설정 생성
 */
function createAppConfig(env: EnvironmentVariables): AppConfig {
  const networkMode = env.NETWORK_MODE;
  const chain = getChainConfig(networkMode);
  const chainDefaults = getChainDefaults(networkMode);

  const config: AppConfig = {
    // 환경 정보
    nodeEnv: env.NODE_ENV,
    networkMode,
    isProduction: env.NODE_ENV === "production",
    isTestnet: networkMode === "testnet",

    // 네트워크 설정
    chain,
    chainId: env.CHAIN_ID,
    rpcUrl: env.RPC_URL,
    explorerUrl: chainDefaults.explorerUrl,

    // 인증 정보
    privateKey: env.PRIVATE_KEY,

    // 컨트랙트 주소들
    entryPointAddress: env.ENTRY_POINT_ADDRESS,
    factoryAddress: env.FACTORY_ADDRESS,
    testTokenAddress: env.TEST_TOKEN_ADDRESS,
  };

  // Redis 설정 (선택사항)
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    config.redis = {
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    };
  }

  // Web3Auth 설정 (선택사항)
  if (env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID) {
    config.web3Auth = {
      clientId: env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID,
    };
  }

  return config;
}

/**
 * 환경 설정 강제 새로고침 (테스트용)
 */
export function refreshAppConfig(): AppConfig {
  cachedConfig = null;
  return getAppConfig();
}

/**
 * 환경 설정 검증 및 출력 (개발용)
 */
export function logAppConfig(): void {
  const config = getAppConfig();

  console.log("🔧 App Configuration:");
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(
    `   Network: ${config.networkMode} (Chain ID: ${config.chainId})`
  );
  console.log(`   RPC URL: ${config.rpcUrl}`);
  console.log(`   EntryPoint: ${config.entryPointAddress}`);
  console.log(`   Factory: ${config.factoryAddress}`);

  if (config.testTokenAddress) {
    console.log(`   Test Token: ${config.testTokenAddress}`);
  }

  console.log(
    `   Redis: ${config.redis ? "✅ Configured" : "❌ Not configured"}`
  );
  console.log(
    `   Web3Auth: ${config.web3Auth ? "✅ Configured" : "❌ Not configured"}`
  );
}

/**
 * 네트워크 특정 설정 반환
 */
export function getNetworkConfig() {
  const config = getAppConfig();
  return {
    chain: config.chain,
    chainId: config.chainId,
    rpcUrl: config.rpcUrl,
    explorerUrl: config.explorerUrl,
  };
}

/**
 * 컨트랙트 주소들 반환
 */
export function getContractAddresses() {
  const config = getAppConfig();
  return {
    entryPointAddress: config.entryPointAddress,
    factoryAddress: config.factoryAddress,
    testTokenAddress: config.testTokenAddress,
  };
}

/**
 * 개발 모드인지 확인
 */
export function isDevelopment(): boolean {
  return getAppConfig().nodeEnv === "development";
}

/**
 * 프로덕션 모드인지 확인
 */
export function isProduction(): boolean {
  return getAppConfig().isProduction;
}

/**
 * 테스트넷인지 확인
 */
export function isTestnet(): boolean {
  return getAppConfig().isTestnet;
}
