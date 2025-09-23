// 환경변수 검증 및 기본값 설정

export interface EnvironmentVariables {
  NODE_ENV: "development" | "staging" | "production";
  NETWORK_MODE: "testnet" | "mainnet";
  CHAIN_ID: number;
  RPC_URL: string;
  PRIVATE_KEY?: `0x${string}`;
  ENTRY_POINT_ADDRESS: `0x${string}`;
  FACTORY_ADDRESS: `0x${string}`;
  TEST_TOKEN_ADDRESS?: `0x${string}`;
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
  NEXT_PUBLIC_WEB3AUTH_CLIENT_ID?: string;
}

/**
 * 환경변수 검증 및 파싱
 */
export function validateEnvironmentVariables(): EnvironmentVariables {
  const nodeEnv = process.env.NODE_ENV;
  if (!nodeEnv || !["development", "staging", "production"].includes(nodeEnv)) {
    throw new Error(
      "NODE_ENV must be one of: development, staging, production"
    );
  }

  const networkMode = process.env.NEXT_PUBLIC_NETWORK_MODE || process.env.NETWORK_MODE;
  if (!networkMode || !["testnet", "mainnet"].includes(networkMode)) {
    throw new Error("NEXT_PUBLIC_NETWORK_MODE must be one of: testnet, mainnet");
  }

  const chainId = process.env.NEXT_PUBLIC_CHAIN_ID || process.env.CHAIN_ID;
  if (!chainId || isNaN(Number(chainId))) {
    throw new Error("NEXT_PUBLIC_CHAIN_ID must be a valid number");
  }

  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || process.env.RPC_URL;
  if (!rpcUrl || !isValidUrl(rpcUrl)) {
    throw new Error("NEXT_PUBLIC_RPC_URL must be a valid URL");
  }

  // PRIVATE_KEY is server-only, skip validation on client side
  const privateKey = process.env.PRIVATE_KEY;
  if (typeof window === 'undefined' && (!privateKey || !isValidPrivateKey(privateKey))) {
    throw new Error(
      "PRIVATE_KEY must be a valid hex private key starting with 0x"
    );
  }

  const entryPointAddress = process.env.NEXT_PUBLIC_ENTRY_POINT_ADDRESS || process.env.ENTRY_POINT_ADDRESS;
  if (!entryPointAddress || !isValidAddress(entryPointAddress)) {
    throw new Error("NEXT_PUBLIC_ENTRY_POINT_ADDRESS must be a valid Ethereum address");
  }

  const factoryAddress = process.env.NEXT_PUBLIC_FACTORY_ADDRESS || process.env.FACTORY_ADDRESS;
  if (!factoryAddress || !isValidAddress(factoryAddress)) {
    throw new Error("NEXT_PUBLIC_FACTORY_ADDRESS must be a valid Ethereum address");
  }

  const testTokenAddress = process.env.NEXT_PUBLIC_TEST_TOKEN_ADDRESS || process.env.TEST_TOKEN_ADDRESS;
  if (testTokenAddress && !isValidAddress(testTokenAddress)) {
    throw new Error("TEST_TOKEN_ADDRESS must be a valid Ethereum address");
  }

  return {
    NODE_ENV: nodeEnv as "development" | "staging" | "production",
    NETWORK_MODE: networkMode as "testnet" | "mainnet",
    CHAIN_ID: Number(chainId),
    RPC_URL: rpcUrl,
    PRIVATE_KEY: privateKey as `0x${string}` | undefined,
    ENTRY_POINT_ADDRESS: entryPointAddress as `0x${string}`,
    FACTORY_ADDRESS: factoryAddress as `0x${string}`,
    TEST_TOKEN_ADDRESS: testTokenAddress as `0x${string}` | undefined,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    NEXT_PUBLIC_WEB3AUTH_CLIENT_ID: process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID,
  };
}

/**
 * URL 유효성 검사
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 이더리움 주소 유효성 검사
 */
function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * 프라이빗 키 유효성 검사
 */
function isValidPrivateKey(privateKey: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(privateKey);
}

/**
 * 개발 환경에서만 실행되는 환경변수 검증 (빌드 타임에 검증)
 */
export function validateEnvironmentOnBuild() {
  try {
    validateEnvironmentVariables();
    console.log("✅ Environment variables validated successfully");
  } catch (error) {
    console.error(
      "❌ Environment validation failed:",
      (error as Error).message
    );
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }
}
