"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Wallet,
  Activity,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Copy,
  Settings,
} from "lucide-react";

import { useWeb3AuthUser } from "@web3auth/modal/react";
import { useWeb3AuthAA } from "@/lib/aa/hooks/useWeb3AuthAA";
import AATransactionButton from "./AATransactionButton";

export default function AATestDashboard() {
  const { userInfo } = useWeb3AuthUser();
  const {
    isReady,
    isConnected,
    accountInfo,
    smartAccountAddress,
    fetchAccountInfo,
    fetchSmartAccountAddress,
    aaService,
  } = useWeb3AuthAA();

  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [networkConfig, setNetworkConfig] = useState<any>(null);

  const loadAllInfo = useCallback(async () => {
    setIsLoadingInfo(true);
    try {
      await Promise.all([fetchAccountInfo(), fetchSmartAccountAddress()]);
    } catch (error) {
      console.error("Failed to load account info:", error);
    } finally {
      setIsLoadingInfo(false);
    }
  }, [fetchAccountInfo, fetchSmartAccountAddress]);

  // 초기 정보 로드
  useEffect(() => {
    if (isConnected && isReady) {
      loadAllInfo();
      if (aaService) {
        setNetworkConfig(aaService.getNetworkConfig());
      }
    }
  }, [isConnected, isReady, aaService, loadAllInfo]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // TODO: 토스트 알림 추가
  };

  const openInExplorer = (hash: string, type: "tx" | "address") => {
    const baseUrl = "https://testnet.bscscan.com";
    const url =
      type === "tx" ? `${baseUrl}/tx/${hash}` : `${baseUrl}/address/${hash}`;
    window.open(url, "_blank");
  };

  if (!isConnected) {
    return (
      <div className='p-6'>
        <Alert>
          <AlertCircle className='h-4 w-4' />
          <AlertDescription>
            Web3Auth로 로그인한 후 AA 대시보드를 사용할 수 있습니다.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* 헤더 */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold text-gray-900 dark:text-white'>
            Account Abstraction 테스트 대시보드
          </h2>
          <p className='text-gray-600 dark:text-gray-400 mt-1'>
            Web3Auth + ERC-4337을 활용한 가스리스 트랜잭션 테스트
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Badge variant={isReady ? "default" : "secondary"}>
            {isReady ? "준비됨" : "로딩 중"}
          </Badge>
          <Button
            onClick={loadAllInfo}
            disabled={isLoadingInfo}
            size='sm'
            variant='outline'
          >
            {isLoadingInfo ? (
              <RefreshCw className='w-4 h-4 animate-spin' />
            ) : (
              <RefreshCw className='w-4 h-4' />
            )}
          </Button>
        </div>
      </div>

      {/* 사용자 정보 카드 */}
      {userInfo && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Wallet className='w-5 h-5' />
              사용자 정보
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
              <div>
                <p className='text-gray-600 dark:text-gray-400'>사용자 ID</p>
                <p className='font-mono break-all'>{userInfo.userId}</p>
              </div>
              {userInfo.email && (
                <div>
                  <p className='text-gray-600 dark:text-gray-400'>이메일</p>
                  <p>{userInfo.email}</p>
                </div>
              )}
              {userInfo.name && (
                <div>
                  <p className='text-gray-600 dark:text-gray-400'>이름</p>
                  <p>{userInfo.name}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 스마트 계정 정보 */}
      {smartAccountAddress && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Activity className='w-5 h-5' />
              스마트 계정 정보
            </CardTitle>
            <CardDescription>ERC-4337 규격의 스마트 계정 상태</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {/* 스마트 계정 주소 */}
              <div>
                <p className='text-sm text-gray-600 dark:text-gray-400 mb-1'>
                  스마트 계정 주소
                </p>
                <div className='flex items-center gap-2'>
                  <code className='flex-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs break-all'>
                    {smartAccountAddress}
                  </code>
                  <Button
                    onClick={() => copyToClipboard(smartAccountAddress)}
                    size='sm'
                    variant='outline'
                  >
                    <Copy className='w-4 h-4' />
                  </Button>
                  <Button
                    onClick={() =>
                      openInExplorer(smartAccountAddress, "address")
                    }
                    size='sm'
                    variant='outline'
                  >
                    <ExternalLink className='w-4 h-4' />
                  </Button>
                </div>
              </div>

              {/* 계정 상태 */}
              {accountInfo && (
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                  <div className='p-3 bg-gray-50 dark:bg-gray-800 rounded'>
                    <p className='text-xs text-gray-600 dark:text-gray-400'>
                      배포 상태
                    </p>
                    <div className='flex items-center gap-2 mt-1'>
                      {accountInfo.isDeployed ? (
                        <CheckCircle className='w-4 h-4 text-green-500' />
                      ) : (
                        <AlertCircle className='w-4 h-4 text-yellow-500' />
                      )}
                      <span className='text-sm font-medium'>
                        {accountInfo.isDeployed ? "배포됨" : "미배포"}
                      </span>
                    </div>
                  </div>

                  <div className='p-3 bg-gray-50 dark:bg-gray-800 rounded'>
                    <p className='text-xs text-gray-600 dark:text-gray-400'>
                      BNB 잔액
                    </p>
                    <p className='text-sm font-medium mt-1'>
                      {(Number(accountInfo.balance) / 1e18).toFixed(4)} BNB
                    </p>
                  </div>

                  <div className='p-3 bg-gray-50 dark:bg-gray-800 rounded'>
                    <p className='text-xs text-gray-600 dark:text-gray-400'>
                      Nonce
                    </p>
                    <p className='text-sm font-medium mt-1'>
                      {accountInfo.nonce?.toString() || "0"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 네트워크 설정 정보 */}
      {networkConfig && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Settings className='w-5 h-5' />
              네트워크 설정
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
              <div>
                <p className='text-gray-600 dark:text-gray-400'>Chain ID</p>
                <p className='font-mono'>{networkConfig.chainId}</p>
              </div>
              <div>
                <p className='text-gray-600 dark:text-gray-400'>RPC URL</p>
                <p className='font-mono break-all'>{networkConfig.rpcUrl}</p>
              </div>
              <div>
                <p className='text-gray-600 dark:text-gray-400'>EntryPoint</p>
                <p className='font-mono break-all'>
                  {networkConfig.entryPointAddress}
                </p>
              </div>
              <div>
                <p className='text-gray-600 dark:text-gray-400'>
                  Account Factory
                </p>
                <p className='font-mono break-all'>
                  {networkConfig.factoryAddress}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 테스트 탭 */}
      <Tabs defaultValue='transfer' className='w-full'>
        <TabsList className='grid w-full grid-cols-3'>
          <TabsTrigger value='transfer'>가스리스 전송</TabsTrigger>
          <TabsTrigger value='batch'>배치 트랜잭션</TabsTrigger>
          <TabsTrigger value='contract'>컨트랙트 호출</TabsTrigger>
        </TabsList>

        <TabsContent value='transfer' className='mt-6'>
          <AATransactionButton />
        </TabsContent>

        <TabsContent value='batch' className='mt-6'>
          <Card>
            <CardHeader>
              <CardTitle>배치 트랜잭션 테스트</CardTitle>
              <CardDescription>
                여러 트랜잭션을 한 번에 실행할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className='h-4 w-4' />
                <AlertDescription>
                  배치 트랜잭션 기능은 구현 예정입니다.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='contract' className='mt-6'>
          <Card>
            <CardHeader>
              <CardTitle>컨트랙트 함수 호출</CardTitle>
              <CardDescription>
                임의의 컨트랙트 함수를 가스리스로 호출할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className='h-4 w-4' />
                <AlertDescription>
                  컨트랙트 호출 기능은 구현 예정입니다.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 도움말 */}
      <Card>
        <CardHeader>
          <CardTitle>사용 가이드</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-sm space-y-3'>
            <div>
              <h4 className='font-medium mb-2'>🚀 Account Abstraction이란?</h4>
              <p className='text-gray-600 dark:text-gray-400'>
                ERC-4337 표준을 사용하여 스마트 컨트랙트 계정으로 가스비 없이
                트랜잭션을 실행할 수 있는 기술입니다.
              </p>
            </div>
            <div>
              <h4 className='font-medium mb-2'>💡 주요 특징</h4>
              <ul className='list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400'>
                <li>가스비 없는 트랜잭션 (Gasless)</li>
                <li>스마트 컨트랙트 지갑 자동 배포</li>
                <li>Web3Auth 통합 인증</li>
                <li>BSC Testnet 지원</li>
              </ul>
            </div>
            <div>
              <h4 className='font-medium mb-2'>🔧 테스트 방법</h4>
              <ol className='list-decimal list-inside space-y-1 text-gray-600 dark:text-gray-400'>
                <li>Web3Auth로 로그인</li>
                <li>스마트 계정 정보 확인</li>
                <li>수신자 주소와 금액 입력</li>
                <li>가스리스 전송 실행</li>
                <li>BSC Testnet에서 결과 확인</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
