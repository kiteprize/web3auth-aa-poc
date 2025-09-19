// Web3Auth + AA 통합 React Hook

"use client";

import { useState, useCallback, useMemo } from "react";
import { useWeb3Auth, useWeb3AuthUser } from "@web3auth/modal/react";

import { Web3AuthAAService } from "../services/Web3AuthAAService";
import type { TransactionResult, Action } from "../../userOperation";

interface UseWeb3AuthAAProps {
  // 추가 설정이 필요한 경우를 위한 옵션
  autoInitialize?: boolean;
}

interface TransactionState {
  isLoading: boolean;
  error: string | null;
  txHash: string | null;
  userOpHash: string | null;
}

export function useWeb3AuthAA(props: UseWeb3AuthAAProps = {}) {
  const { autoInitialize = true } = props;

  // Web3Auth hooks
  const { provider } = useWeb3Auth();
  const { userInfo } = useWeb3AuthUser();

  // AA Service 인스턴스
  const aaService = useMemo(() => {
    if (!autoInitialize) return null;
    return new Web3AuthAAService();
  }, [autoInitialize]);

  // 트랜잭션 상태 관리
  const [transactionState, setTransactionState] = useState<TransactionState>({
    isLoading: false,
    error: null,
    txHash: null,
    userOpHash: null,
  });

  // 계정 정보 상태
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [smartAccountAddress, setSmartAccountAddress] = useState<string | null>(
    null
  );

  // 서비스 초기화 확인
  const isReady = useMemo(() => {
    return Boolean(provider && userInfo && aaService);
  }, [provider, userInfo, aaService]);

  // 에러 핸들러
  const handleTransactionError = useCallback((error: any, context: string) => {
    console.error(`${context} failed:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    setTransactionState((prev) => ({
      ...prev,
      isLoading: false,
      error: errorMessage,
    }));
    return {
      success: false,
      error: errorMessage,
      userOpHash: "0x" as `0x${string}`,
    };
  }, []);

  // 트랜잭션 결과 처리
  const handleTransactionResult = useCallback((result: TransactionResult) => {
    setTransactionState({
      isLoading: false,
      error: result.success ? null : result.error || "Transaction failed",
      txHash: result.txHash || null,
      userOpHash: result.userOpHash,
    });
    return result;
  }, []);

  // 네이티브 토큰 가스리스 전송
  const sendNativeTokenGasless = useCallback(
    async (to: `0x${string}`, amount: string): Promise<TransactionResult> => {
      if (!isReady) {
        return handleTransactionError(
          new Error("Service not ready"),
          "Native token transfer"
        );
      }

      setTransactionState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      try {
        const result = await aaService!.sendNativeTokenGasless(
          provider!,
          to,
          amount
        );
        return handleTransactionResult(result);
      } catch (error) {
        return handleTransactionError(error, "Native token transfer");
      }
    },
    [
      isReady,
      provider,
      aaService,
      handleTransactionError,
      handleTransactionResult,
    ]
  );

  // ERC-20 토큰 가스리스 전송
  const sendERC20TokenGasless = useCallback(
    async (
      tokenAddress: `0x${string}`,
      to: `0x${string}`,
      amount: string
    ): Promise<TransactionResult> => {
      if (!isReady) {
        return handleTransactionError(
          new Error("Service not ready"),
          "ERC-20 token transfer"
        );
      }

      setTransactionState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      try {
        const result = await aaService!.sendERC20TokenGasless(
          provider!,
          tokenAddress,
          to,
          amount
        );
        return handleTransactionResult(result);
      } catch (error) {
        return handleTransactionError(error, "ERC-20 token transfer");
      }
    },
    [
      isReady,
      provider,
      aaService,
      handleTransactionError,
      handleTransactionResult,
    ]
  );

  // 테스트 토큰 가스리스 전송
  const sendTestTokenGasless = useCallback(
    async (to: `0x${string}`, amount: string): Promise<TransactionResult> => {
      if (!isReady) {
        return handleTransactionError(
          new Error("Service not ready"),
          "Test token transfer"
        );
      }

      setTransactionState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      try {
        const result = await aaService!.sendTestTokenGasless(
          provider!,
          to,
          amount
        );
        return handleTransactionResult(result);
      } catch (error) {
        return handleTransactionError(error, "Test token transfer");
      }
    },
    [
      isReady,
      provider,
      aaService,
      handleTransactionError,
      handleTransactionResult,
    ]
  );

  // 컨트랙트 함수 가스리스 호출
  const executeContractCallGasless = useCallback(
    async (
      contractAddress: `0x${string}`,
      functionName: string,
      args: any[],
      abi: any[],
      value: bigint = BigInt(0)
    ): Promise<TransactionResult> => {
      if (!isReady) {
        return handleTransactionError(
          new Error("Service not ready"),
          "Contract call"
        );
      }

      setTransactionState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      try {
        const result = await aaService!.executeContractCallGasless(
          provider!,
          contractAddress,
          functionName,
          args,
          abi,
          value
        );
        return handleTransactionResult(result);
      } catch (error) {
        return handleTransactionError(error, "Contract call");
      }
    },
    [
      isReady,
      provider,
      aaService,
      handleTransactionError,
      handleTransactionResult,
    ]
  );

  // 배치 트랜잭션 실행
  const executeBatchTransactionGasless = useCallback(
    async (actions: Action[]): Promise<TransactionResult> => {
      if (!isReady) {
        return handleTransactionError(
          new Error("Service not ready"),
          "Batch transaction"
        );
      }

      setTransactionState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      try {
        const result = await aaService!.executeBatchTransactionGasless(
          provider!,
          actions
        );
        return handleTransactionResult(result);
      } catch (error) {
        return handleTransactionError(error, "Batch transaction");
      }
    },
    [
      isReady,
      provider,
      aaService,
      handleTransactionError,
      handleTransactionResult,
    ]
  );

  // 계정 정보 가져오기
  const fetchAccountInfo = useCallback(async () => {
    if (!isReady) {
      console.warn("Service not ready for account info fetch");
      return null;
    }

    try {
      const info = await aaService!.getAccountInfo(provider!);
      setAccountInfo(info);
      return info;
    } catch (error) {
      console.error("Failed to fetch account info:", error);
      return null;
    }
  }, [isReady, provider, aaService]);

  // 스마트 계정 주소 가져오기
  const fetchSmartAccountAddress = useCallback(async () => {
    if (!isReady) {
      console.warn("Service not ready for smart account address fetch");
      return null;
    }

    try {
      const address = await aaService!.getSmartAccountAddress(provider!);
      setSmartAccountAddress(address);
      return address;
    } catch (error) {
      console.error("Failed to fetch smart account address:", error);
      return null;
    }
  }, [isReady, provider, aaService]);

  // 상태 초기화
  const resetTransactionState = useCallback(() => {
    setTransactionState({
      isLoading: false,
      error: null,
      txHash: null,
      userOpHash: null,
    });
  }, []);

  return {
    // 서비스 상태
    isReady,
    isConnected: Boolean(provider && userInfo),
    userInfo,
    provider,

    // 계정 정보
    accountInfo,
    smartAccountAddress,
    fetchAccountInfo,
    fetchSmartAccountAddress,

    // 트랜잭션 상태
    ...transactionState,
    resetTransactionState,

    // 트랜잭션 함수들
    sendNativeTokenGasless,
    sendERC20TokenGasless,
    sendTestTokenGasless,
    executeContractCallGasless,
    executeBatchTransactionGasless,

    // 원본 서비스 (고급 사용자용)
    aaService,
  };
}
