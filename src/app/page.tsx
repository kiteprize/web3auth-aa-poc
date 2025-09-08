import LoginForm from "@/components/login-form";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* 다크모드 헤더 */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 py-4">
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-white">
                Web3Auth POC
              </h1>
              <p className="text-sm text-gray-300 mt-1">
                Web3Auth 로그인 데모 애플리케이션
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
            Web3Auth 로그인 데모
          </h2>
          <p className="text-lg text-gray-300 mb-8">
            다양한 방식으로 Web3Auth 로그인을 테스트해보세요.
          </p>
          <div className="bg-gray-800 rounded-lg p-6 text-left max-w-4xl mx-auto">
            <h3 className="text-lg font-semibold text-white mb-3">지원 기능:</h3>
            <div className="text-gray-300">
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
          </div>
        </div>

        {/* Web3Auth 로그인 후 대시보드 */}
        <div className="bg-gray-800 rounded-lg p-6 max-w-4xl mx-auto">
          <h3 className="text-lg font-semibold text-white mb-3">로그인 상태</h3>
          <p className="text-gray-300">
            로그인 후 여기에 사용자 정보가 표시됩니다.
          </p>
        </div>
      </main>
    </div>
  );
}
