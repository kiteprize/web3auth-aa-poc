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
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-16">
          <h2 className="text-3xl font-bold text-white mb-4">
            Web3Auth 로그인 데모
          </h2>
          <p className="text-lg text-gray-300 mb-8">
            우측 상단의 로그인 버튼을 클릭하여 다양한 방법으로 로그인해보세요.
          </p>
          <div className="bg-gray-800 rounded-lg p-6 text-left max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-white mb-3">지원하는 로그인 방식:</h3>
            <ul className="space-y-2 text-gray-300">
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
      </main>
    </div>
  );
}
