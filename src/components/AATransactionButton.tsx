'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Send, CheckCircle, AlertCircle, Wallet } from 'lucide-react';

import { useWeb3AuthAA } from '@/lib/aa/hooks/useWeb3AuthAA';
import type { TransactionResult } from '@/lib/userOperation';

interface AATransactionButtonProps {
  className?: string;
}

export default function AATransactionButton({ className }: AATransactionButtonProps) {
  // AA Hook 사용
  const {
    isReady,
    isConnected,
    isLoading,
    error,
    txHash,
    userOpHash,
    sendNativeTokenGasless,
    sendTestTokenGasless,
    resetTransactionState,
    smartAccountAddress,
    fetchSmartAccountAddress,
    accountInfo,
    fetchAccountInfo
  } = useWeb3AuthAA();

  // 폼 상태
  const [recipient, setRecipient] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [transactionType, setTransactionType] = useState<'native' | 'test-token'>('native');

  // 계정 정보 로딩 상태
  const [isLoadingAccountInfo, setIsLoadingAccountInfo] = useState(false);

  // 폼 유효성 검사
  const isValidForm = recipient.trim() !== '' &&
                     amount.trim() !== '' &&
                     /^0x[a-fA-F0-9]{40}$/.test(recipient.trim()) &&
                     parseFloat(amount) > 0;

  // 가스리스 전송 실행
  const handleGaslessTransfer = async () => {
    if (!isReady || !isValidForm) {
      return;
    }

    resetTransactionState();

    try {
      let result: TransactionResult;

      if (transactionType === 'native') {
        result = await sendNativeTokenGasless(
          recipient.trim() as `0x${string}`,
          amount.trim()
        );
      } else {
        result = await sendTestTokenGasless(
          recipient.trim() as `0x${string}`,
          amount.trim()
        );
      }

      if (result.success) {
        // 성공 시 폼 초기화 (선택사항)
        // setRecipient('');
        // setAmount('');
      }
    } catch (error) {
      console.error('Transaction failed:', error);
    }
  };

  // 스마트 계정 정보 로드
  const loadAccountInfo = async () => {
    if (!isReady) return;

    setIsLoadingAccountInfo(true);
    try {
      await Promise.all([
        fetchSmartAccountAddress(),
        fetchAccountInfo()
      ]);
    } catch (error) {
      console.error('Failed to load account info:', error);
    } finally {
      setIsLoadingAccountInfo(false);
    }
  };

  // 연결되지 않은 상태
  if (!isConnected) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            AA 가스리스 전송 테스트
          </CardTitle>
          <CardDescription>
            Web3Auth로 로그인한 후 가스리스 전송을 테스트할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              먼저 Web3Auth로 로그인해주세요.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          AA 가스리스 전송 테스트
        </CardTitle>
        <CardDescription>
          스마트 계정을 통해 가스비 없이 토큰을 전송해보세요
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 스마트 계정 정보 */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              스마트 계정 정보
            </h4>
            <Button
              onClick={loadAccountInfo}
              size="sm"
              variant="outline"
              disabled={isLoadingAccountInfo}
            >
              {isLoadingAccountInfo ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                '새로고침'
              )}
            </Button>
          </div>

          {smartAccountAddress ? (
            <div className="space-y-1 text-xs">
              <p className="text-gray-600 dark:text-gray-400">
                <span className="font-medium">주소:</span> {smartAccountAddress}
              </p>
              {accountInfo && (
                <>
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">배포됨:</span> {accountInfo.isDeployed ? '예' : '아니오'}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">잔액:</span> {(Number(accountInfo.balance) / 1e18).toFixed(4)} BNB
                  </p>
                </>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-500">정보를 불러오려면 새로고침을 클릭하세요</p>
          )}
        </div>

        {/* 전송 타입 선택 */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">전송 타입</Label>
          <div className="flex gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                value="native"
                checked={transactionType === 'native'}
                onChange={(e) => setTransactionType(e.target.value as 'native')}
                className="text-blue-600"
              />
              <span className="text-sm">네이티브 토큰 (BNB)</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                value="test-token"
                checked={transactionType === 'test-token'}
                onChange={(e) => setTransactionType(e.target.value as 'test-token')}
                className="text-blue-600"
              />
              <span className="text-sm">테스트 토큰</span>
            </label>
          </div>
        </div>

        {/* 수신자 주소 입력 */}
        <div className="space-y-2">
          <Label htmlFor="recipient" className="text-sm font-medium">
            수신자 주소
          </Label>
          <Input
            id="recipient"
            placeholder="0x..."
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="font-mono text-sm"
          />
          {recipient && !/^0x[a-fA-F0-9]{40}$/.test(recipient.trim()) && (
            <p className="text-xs text-red-500">유효한 Ethereum 주소를 입력해주세요</p>
          )}
        </div>

        {/* 금액 입력 */}
        <div className="space-y-2">
          <Label htmlFor="amount" className="text-sm font-medium">
            전송 금액 {transactionType === 'native' ? '(BNB)' : '(토큰)'}
          </Label>
          <Input
            id="amount"
            type="number"
            step="0.001"
            min="0"
            placeholder={transactionType === 'native' ? '0.001' : '1.0'}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {amount && parseFloat(amount) <= 0 && (
            <p className="text-xs text-red-500">0보다 큰 값을 입력해주세요</p>
          )}
        </div>

        {/* 전송 버튼 */}
        <Button
          onClick={handleGaslessTransfer}
          disabled={!isReady || !isValidForm || isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              가스리스 전송 처리 중...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              가스리스 전송 실행
            </>
          )}
        </Button>

        {/* 결과 표시 */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {txHash && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">✅ 가스리스 전송 성공!</p>
                {userOpHash && (
                  <p className="text-xs break-all">
                    <span className="font-medium">UserOp Hash:</span> {userOpHash}
                  </p>
                )}
                {txHash && (
                  <p className="text-xs break-all">
                    <span className="font-medium">Transaction Hash:</span> {txHash}
                  </p>
                )}
                <p className="text-xs text-gray-600">
                  BSC Testnet에서 확인할 수 있습니다.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* 도움말 */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>💡 <strong>팁:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>가스비 없이 전송이 가능합니다</li>
            <li>최초 전송 시 스마트 계정이 자동으로 배포됩니다</li>
            <li>BSC Testnet을 사용합니다</li>
            <li>테스트 토큰은 미리 민팅된 토큰을 사용합니다</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}