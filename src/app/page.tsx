import LoginForm from "@/components/login-form";
import BiconomyDashboardRefactored from "@/components/BiconomyDashboardRefactored";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* 다크모드 헤더 */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 py-4">
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-white">
                Web3Auth + Biconomy POC
              </h1>
              <p className="text-sm text-gray-300 mt-1">
                Web3Auth 로그인 및 Biconomy 수수료 대납 데모 애플리케이션
              </p>
            </div>
            <div className="flex-shrink-0">
              <LoginForm />
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-8 mb-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            수수료 대납 기능 데모
          </h2>
          <p className="text-lg text-gray-300 mb-8">
            먼저 상단의 로그인 버튼으로 Web3Auth에 로그인한 후, 아래 기능들을 테스트해보세요.
          </p>
          <div className="bg-gray-800 rounded-lg p-6 text-left max-w-4xl mx-auto">
            <h3 className="text-lg font-semibold text-white mb-3">제공하는 기능:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
              <div>
                <h4 className="font-medium text-white mb-2">로그인 방식</h4>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Google 소셜 로그인
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Apple 소셜 로그인
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    SMS 인증 로그인
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    이메일 인증 로그인
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-white mb-2">Biconomy 기능</h4>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    네이티브 토큰 전송 (BNB)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    BEP-20 토큰 전송 (USDT, USDC)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    간단한 트랜잭션 실행
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    배치 트랜잭션 실행
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Biconomy 대시보드 */}
        <BiconomyDashboardRefactored />
      </main>
    </div>
  );
}
