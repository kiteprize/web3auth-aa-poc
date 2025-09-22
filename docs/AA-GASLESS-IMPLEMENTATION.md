# Web3Auth + ERC-4337 AA 가스리스 구현 구조

## 📋 개요

이 프로젝트는 Web3Auth와 ERC-4337 Account Abstraction을 통합하여 가스리스 트랜잭션을 구현한 POC(Proof of Concept)입니다.

## 🏗️ 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                      │
├─────────────────────────────────────────────────────────────────┤
│  Web3Auth Login  │  AA Test Dashboard  │  Transaction UI        │
├─────────────────────────────────────────────────────────────────┤
│                    Web3Auth AA Hook                             │
├─────────────────────────────────────────────────────────────────┤
│                  Web3Auth AA Service                            │
├─────────────────────────────────────────────────────────────────┤
│                  AA System Orchestrator                         │
├─────────────────────────────────────────────────────────────────┤
│  UserOp Creator  │  Signer  │  SmartAccount  │  Transaction     │
│                  │          │  Manager       │  Executor        │
├─────────────────────────────────────────────────────────────────┤
│                         API Routes                              │
├─────────────────────────────────────────────────────────────────┤
│              Backend Bundler (ERC-4337 v0.8)                   │
├─────────────────────────────────────────────────────────────────┤
│                      BSC Testnet                               │
│  EntryPoint Contract  │  Account Factory  │  Smart Account     │
└─────────────────────────────────────────────────────────────────┘
```

## 🔧 핵심 컴포넌트

### 1. Frontend Layer

#### 1.1 Web3Auth 통합
- **파일**: `src/contexts/web3authContext.tsx`
- **기능**: Web3Auth 설정 및 초기화
- **로그인 방식**: Google, Apple, SMS, Email

#### 1.2 AA Test Dashboard
- **파일**: `src/components/AATestDashboard.tsx`
- **기능**:
  - 스마트 계정 정보 표시
  - 가스리스 전송 테스트 UI
  - 트랜잭션 상태 모니터링

#### 1.3 Transaction UI
- **파일**: `src/components/AATransactionButton.tsx`
- **기능**:
  - 네이티브 토큰 (BNB) 전송
  - 테스트 토큰 전송
  - 실시간 상태 표시

### 2. Service Layer (SOLID 원칙 적용)

#### 2.1 Web3Auth AA Hook
- **파일**: `src/lib/aa/hooks/useWeb3AuthAA.ts`
- **역할**: React 컴포넌트와 AA 서비스 연결
- **기능**:
  - 상태 관리
  - 에러 핸들링
  - 트랜잭션 진행 상태

#### 2.2 Web3Auth AA Service
- **파일**: `src/lib/aa/services/Web3AuthAAService.ts`
- **역할**: Web3Auth Provider와 AA System 연결
- **기능**:
  - Private Key 추출
  - 가스리스 전송 실행
  - 계정 정보 조회

#### 2.3 AA System Orchestrator
- **파일**: `src/lib/userOperation/orchestrator.ts`
- **역할**: 모든 AA 서비스 조합 및 관리
- **의존성**: UserOp Builder, Signer, Account Manager, Transaction Executor

### 3. Core Services (Single Responsibility)

#### 3.1 UserOperation Creator
- **파일**: `src/lib/userOperation/creator.ts`
- **책임**: UserOperation 생성
- **기능**:
  - initCode 생성 (계정 배포용)
  - callData 생성 (함수 호출용)
  - Gas limits 설정

#### 3.2 UserOperation Signer
- **파일**: `src/lib/userOperation/signer.ts`
- **책임**: UserOperation 서명
- **기능**:
  - UserOpHash 계산
  - EIP-191 메시지 서명
  - 서명 검증

#### 3.3 Smart Account Manager
- **파일**: `src/lib/userOperation/smartAccount.ts`
- **책임**: 스마트 계정 정보 관리
- **기능**:
  - 계정 주소 예측
  - 배포 상태 확인
  - Nonce 조회

#### 3.4 Transaction Executor
- **파일**: `src/lib/userOperation/transaction.ts`
- **책임**: 트랜잭션 실행 및 모니터링
- **기능**:
  - API 호출
  - 상태 폴링
  - 결과 처리

### 4. API Layer

#### 4.1 Submit API
- **경로**: `/api/userop/submit`
- **파일**: `src/app/api/userop/submit/route.ts`
- **기능**:
  - UserOperation 검증
  - 레이트 리미팅 (하루 10건)
  - 큐잉 및 배치 처리
  - 동기 응답 (90초 대기)

#### 4.2 Status API
- **경로**: `/api/userop/status/[requestId]`
- **파일**: `src/app/api/userop/status/[requestId]/route.ts`
- **기능**: 트랜잭션 상태 조회

### 5. Blockchain Layer

#### 5.1 BSC Testnet 설정
- **Chain ID**: 97
- **RPC URL**: https://bsc-testnet.public.blastapi.io
- **Explorer**: https://testnet.bscscan.com

#### 5.2 스마트 컨트랙트
- **EntryPoint**: `0x4337084d9e255ff0702461cf8895ce9e3b5ff108` (ERC-4337 v0.8)
- **Account Factory**: `0x46572ad2eea905860c8bc08816b8cb1e5c13c684`
- **Test Token**: `0x420049e251e5f0a350d7f11d127e1da446f3d447`

## 🔄 트랜잭션 플로우

### 1. 사용자 로그인
```
사용자 → Web3Auth 로그인 → Private Key 생성/관리
```

### 2. 가스리스 전송 실행
```
1. 사용자가 수신자 주소/금액 입력
2. useWeb3AuthAA Hook이 Web3AuthAAService 호출
3. Web3AuthAAService가 AASystemOrchestrator 호출
4. Orchestrator가 다음 순서로 실행:
   a. SmartAccountManager → 계정 정보 조회
   b. UserOperationCreator → UserOp 생성
   c. UserOperationSigner → UserOp 서명
   d. ValidationService → 검증
   e. TransactionExecutor → API 호출
5. API에서 배치 처리 후 EntryPoint 실행
6. 결과를 UI에 표시
```

### 3. 배치 처리 과정
```
1. UserOp가 큐에 적재
2. 1초마다 또는 5개씩 배치 처리
3. EntryPoint.handleOps() 호출
4. 트랜잭션 확인 후 결과 저장
5. 클라이언트에 결과 반환
```

## 📁 폴더 구조

```
src/
├── app/
│   ├── api/userop/          # API Routes
│   │   ├── submit/
│   │   └── status/[requestId]/
│   └── page.tsx             # 메인 페이지
├── components/
│   ├── AATestDashboard.tsx  # AA 테스트 대시보드
│   ├── AATransactionButton.tsx  # 트랜잭션 버튼
│   └── login-form.tsx       # Web3Auth 로그인
├── lib/
│   ├── aa/                  # AA 핵심 라이브러리
│   │   ├── interfaces/      # 인터페이스 정의
│   │   ├── types/           # 타입 정의
│   │   ├── abi/             # 컨트랙트 ABI
│   │   ├── services/        # Web3Auth 통합
│   │   ├── hooks/           # React Hooks
│   │   └── utils/           # 유틸리티
│   └── userOperation/       # UserOperation 서비스
│       ├── creator.ts       # UserOp 생성
│       ├── signer.ts        # UserOp 서명
│       ├── smartAccount.ts  # 계정 관리
│       ├── transaction.ts   # 트랜잭션 실행
│       ├── validator.ts     # 검증
│       └── orchestrator.ts  # 오케스트레이터
└── contexts/
    └── web3authContext.tsx  # Web3Auth 설정
```

## 🎯 SOLID 원칙 적용

### Single Responsibility Principle (SRP)
- **UserOperationCreator**: UserOp 생성만 담당
- **UserOperationSigner**: 서명만 담당
- **SmartAccountManager**: 계정 정보 관리만 담당
- **TransactionExecutor**: 트랜잭션 실행만 담당

### Open/Closed Principle (OCP)
- 인터페이스 기반 설계로 기능 확장 가능
- 새로운 서명 방식이나 검증 방식 추가 용이

### Liskov Substitution Principle (LSP)
- 모든 서비스가 인터페이스를 구현
- 구현체 교체 가능

### Interface Segregation Principle (ISP)
- 클라이언트별 필요한 인터페이스만 노출
- `IAATransactionManager`, `IBatchProcessor` 등 분리

### Dependency Inversion Principle (DIP)
- `AASystemOrchestrator`가 상위 수준 정책 정의
- 구체 클래스가 아닌 인터페이스에 의존

## 🔧 설정 및 환경변수

### 필수 환경변수 (.env.local)
```bash
# Web3Auth
NEXT_PUBLIC_WEB3AUTH_CLIENT_ID=your_client_id

# Bundler (가스리스 트랜잭션 실행용)
BUNDLER_PRIVATE_KEY=0x...

# Network
BSC_TESTNET_RPC_URL=https://bsc-testnet.public.blastapi.io
NETWORK=bscTestnet
```

### 스마트 컨트랙트 주소 (deployment.json)
```json
{
  "network": "bscTestnet",
  "chainId": 97,
  "contracts": {
    "TestToken": "0x420049e251e5f0a350d7f11d127e1da446f3d447",
    "MyAccountFactory": "0x46572ad2eea905860c8bc08816b8cb1e5c13c684",
    "EntryPoint": "0x4337084d9e255ff0702461cf8895ce9e3b5ff108"
  }
}
```

## 🚀 사용법

### 1. 프로젝트 실행
```bash
npm install
npm run dev
```

### 2. 웹사이트 접속 및 로그인
- http://localhost:3001 접속
- 우측 상단 "로그인" 버튼 클릭
- Google, Apple, SMS, Email 중 선택

### 3. 가스리스 전송 테스트
1. 로그인 후 AA 테스트 대시보드 자동 표시
2. "가스리스 전송" 탭 선택
3. 수신자 주소 입력 (0x...)
4. 전송할 금액 입력
5. "가스리스 전송 실행" 버튼 클릭
6. 실시간 상태 모니터링

### 4. 결과 확인
- 성공 시 트랜잭션 해시 표시
- BSC Testnet Explorer에서 확인 가능
- 스마트 계정 정보 업데이트

## 🔍 주요 특징

### ✅ 완전한 가스리스
- 사용자가 가스비 지불 불필요
- 백엔드 번들러가 모든 가스비 대납

### ✅ 자동 스마트 계정 배포
- 최초 트랜잭션 시 자동으로 스마트 계정 배포
- 사용자는 배포 과정을 인지할 필요 없음

### ✅ 실시간 모니터링
- 트랜잭션 진행 상태 실시간 표시
- 에러 발생 시 상세 에러 메시지 제공

### ✅ 안전한 키 관리
- Web3Auth를 통한 소셜 로그인
- Private Key 자동 생성 및 관리
- 사용자가 직접 Private Key 관리 불필요

### ✅ 확장 가능한 구조
- SOLID 원칙 기반 설계
- 새로운 기능 추가 용이
- 테스트 가능한 코드 구조

## 🎉 결론

이 구현체는 Web3Auth의 편의성과 ERC-4337의 가스리스 기능을 결합하여, 기존 Web2 사용자도 쉽게 사용할 수 있는 Web3 경험을 제공합니다. SOLID 원칙을 적용한 확장 가능한 아키텍처로 설계되어 프로덕션 환경에서도 활용 가능합니다.