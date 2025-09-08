# ERC-4337 자체 인프라 연동을 위한 개발 환경 세팅 가이드

기존 Next.js + Web3Auth 환경 위에 Bundler 자체 운영을 포함한 완전한 ERC-4337 개발 환경을 구성합니다.

## 1. 필수 라이브러리 추가 설치

ERC-4337 기능 구현을 위해 `viem`과 `permissionless.js`를 추가합니다.

```bash
npm install viem permissionless
# 또는
yarn add viem permissionless
```

## 2. 오픈소스 Bundler 소프트웨어 준비

서비스의 핵심 인프라인 Bundler를 직접 운영하기 위해 검증된 오픈소스 구현체를 준비합니다. 가장 표준적인 Stackup의 Go 언어 기반 Bundler를 추천합니다.

1.  **다운로드:** [Stackup Bundler Releases](https://github.com/stackup-sh/stackup-bundler/releases) 페이지에서 자신의 운영체제에 맞는 최신 버전을 다운로드합니다.
2.  **설정 파일 생성:** Bundler 실행 경로에 `bundler.toml` 파일을 생성하고 아래 내용을 채웁니다.

    ```toml
    # bundler.toml
    [rpc]
    http_port = 3000 # 프론트엔드가 호출할 로컬 RPC 포트

    [p2p]
    # P2P UserOperation 멤풀을 사용하지 않으므로 비활성화
    bootstrap_nodes = []
    listen_addr = "/ip4/0.0.0.0/tcp/0"

    [mempool]
    # 다른 Bundler와 멤풀을 공유하지 않고, dApp의 UserOp만 직접 받음
    whitelist = ["0x...ENTRYPOINT_ADDRESS..."]

    [eth_client]
    # Bundler가 연결할 BSC 노드 RPC URL
    # 테스트넷 예시, 메인넷 운영 시에는 유료 Private RPC 사용 필수
    rpc_url = "[https://data-seed-prebsc-1-s1.binance.org:8545/](https://data-seed-prebsc-1-s1.binance.org:8545/)"

    [bundler]
    # Bundler가 EntryPoint에 트랜잭션을 보낼 때 사용할 지갑
    # !!!테스트용 개인키입니다. 프로덕션에서는 절대 이렇게 사용하면 안됩니다!!!
    private_key = "YOUR_BUNDLER_WALLET_PRIVATE_KEY"
    ```

## 3. 환경 변수 설정 (`.env.local`)

SaaS API 키 대신, 자체 운영 인프라에 필요한 환경 변수를 설정합니다.

```env
# BNB Chain ID
NEXT_PUBLIC_CHAIN_ID_MAINNET=56
NEXT_PUBLIC_CHAIN_ID_TESTNET=97

# 자체 운영 Bundler RPC 엔드포인트
NEXT_PUBLIC_BUNDLER_RPC_URL="[http://127.0.0.1:3000](http://127.0.0.1:3000)"

# 배포된 EntryPoint 주소 (v0.6)
NEXT_PUBLIC_ENTRYPOINT_ADDRESS="0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"

# 직접 배포할 Smart Account Factory 주소 (배포 후 채워넣기)
NEXT_PUBLIC_ACCOUNT_FACTORY_ADDRESS="YOUR_DEPLOYED_FACTORY_ADDRESS"
# 직접 배포할 Paymaster 주소 (배포 후 채워넣기)
NEXT_PUBLIC_PAYMASTER_ADDRESS="YOUR_DEPLOYED_PAYMASTER_ADDRESS"

# Paymaster 후원 서명을 생성할 백엔드 개인키 (!!!로컬 테스트용!!!)
PAYMASTER_SIGNER_PRIVATE_KEY="YOUR_BACKEND_WALLET_PRIVATE_KEY"
```

## 4. 스마트 컨트랙트 프로젝트 구성

프로젝트 루트에 `contracts` 디렉토리를 생성하고 Hardhat 또는 Foundry 프로젝트를 시작하여 `Smart Account Factory`와 `Paymaster`를 개발 및 배포할 준비를 합니다.
