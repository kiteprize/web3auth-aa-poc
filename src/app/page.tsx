"use client";

import { useWeb3Auth, useWeb3AuthUser } from "@web3auth/modal/react";
import LoginForm from "@/components/login-form";
import AATestDashboard from "@/components/AATestDashboard";

export default function Home() {
  const { userInfo } = useWeb3AuthUser();
  const { isConnected } = useWeb3Auth();

  return (
    <div className='min-h-screen bg-gray-900'>
      {/* 다크모드 헤더 */}
      <header className='bg-gray-800 border-b border-gray-700 sticky top-0 z-50 shadow-lg'>
        <div className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 py-4'>
            <div className='flex-1'>
              <h1 className='text-xl font-semibold text-white'>
                Web3Auth + Account Abstraction POC
              </h1>
              <p className='text-sm text-gray-300 mt-1'>
                Web3Auth 로그인과 ERC-4337 가스리스 트랜잭션 데모
              </p>
            </div>
            <div className='flex-shrink-0'>
              <LoginForm />
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className='px-4 sm:px-6 lg:px-8 py-8'>
        {isConnected && userInfo ? (
          // 로그인된 경우 AA 대시보드 표시
          <div className='max-w-6xl mx-auto'>
            <AATestDashboard />
          </div>
        ) : (
          // 로그인되지 않은 경우 기본 설명 표시
          <>
            <div className='text-center py-8 mb-8'>
              <h2 className='text-3xl font-bold text-white mb-4'>
                Web3Auth + Account Abstraction 데모
              </h2>
              <p className='text-lg text-gray-300 mb-8'>
                Web3Auth로 로그인한 후 가스리스 트랜잭션을 경험해보세요.
              </p>
              <div className='bg-gray-800 rounded-lg p-6 text-left max-w-4xl mx-auto'>
                <h3 className='text-lg font-semibold text-white mb-3'>
                  주요 기능:
                </h3>
                <div className='text-gray-300 space-y-4'>
                  <div>
                    <h4 className='font-medium text-white mb-2'>
                      🔐 Web3Auth 로그인
                    </h4>
                    <ul className='space-y-1 text-sm ml-4'>
                      <li className='flex items-center gap-2'>
                        <span className='w-2 h-2 bg-blue-500 rounded-full'></span>
                        Google, Apple 소셜 로그인
                      </li>
                      <li className='flex items-center gap-2'>
                        <span className='w-2 h-2 bg-blue-500 rounded-full'></span>
                        SMS 및 이메일 인증 로그인
                      </li>
                      <li className='flex items-center gap-2'>
                        <span className='w-2 h-2 bg-blue-500 rounded-full'></span>
                        개인키 자동 관리
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className='font-medium text-white mb-2'>
                      ⚡ Account Abstraction (ERC-4337)
                    </h4>
                    <ul className='space-y-1 text-sm ml-4'>
                      <li className='flex items-center gap-2'>
                        <span className='w-2 h-2 bg-green-500 rounded-full'></span>
                        가스비 없는 트랜잭션 (Gasless)
                      </li>
                      <li className='flex items-center gap-2'>
                        <span className='w-2 h-2 bg-green-500 rounded-full'></span>
                        스마트 컨트랙트 지갑 자동 배포
                      </li>
                      <li className='flex items-center gap-2'>
                        <span className='w-2 h-2 bg-green-500 rounded-full'></span>
                        네이티브/ERC-20 토큰 전송
                      </li>
                      <li className='flex items-center gap-2'>
                        <span className='w-2 h-2 bg-green-500 rounded-full'></span>
                        BSC Testnet 지원
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className='font-medium text-white mb-2'>
                      🧪 테스트 환경
                    </h4>
                    <ul className='space-y-1 text-sm ml-4'>
                      <li className='flex items-center gap-2'>
                        <span className='w-2 h-2 bg-purple-500 rounded-full'></span>
                        BSC Testnet (Chain ID: 97)
                      </li>
                      <li className='flex items-center gap-2'>
                        <span className='w-2 h-2 bg-purple-500 rounded-full'></span>
                        ERC-4337 EntryPoint v0.8
                      </li>
                      <li className='flex items-center gap-2'>
                        <span className='w-2 h-2 bg-purple-500 rounded-full'></span>
                        실시간 트랜잭션 모니터링
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className='bg-gray-800 rounded-lg p-6 max-w-4xl mx-auto text-center'>
              <h3 className='text-lg font-semibold text-white mb-3'>
                시작하기
              </h3>
              <p className='text-gray-300 mb-4'>
                우측 상단의 로그인 버튼을 클릭하여 Web3Auth로 로그인한 후<br />
                Account Abstraction 기능을 체험해보세요!
              </p>
              <div className='inline-flex items-center gap-2 text-sm text-gray-400'>
                <span>💡</span>
                <span>
                  로그인 후 자동으로 스마트 계정이 생성되며, 가스비 없이
                  트랜잭션을 실행할 수 있습니다.
                </span>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
