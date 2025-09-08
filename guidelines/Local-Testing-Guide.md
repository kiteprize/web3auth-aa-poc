# 자체 인프라 로컬 테스트 가이드라인

로컬 개발 환경에서 자체 운영 Bundler와 Paymaster를 포함한 완전한 ERC-4337 스택을 테스트합니다.

## 필수 실행 컴포넌트

테스트를 진행하기 위해 아래 세 가지 컴포넌트가 모두 실행 중이어야 합니다.

1.  **로컬 블록체인 노드 (선택사항, 권장):** Hardhat Mainnet Fork
2.  **자체 운영 Bundler:** `stackup-bundler`
3.  **Next.js 개발 서버:** `npm run dev`

## 테스트 절차

1.  **(터미널 1) 로컬 블록체인 노드 실행 (메인넷 포크)**
    `contracts` 디렉토리로 이동하여 Hardhat 로컬 노드를 실행합니다. 이는 실제 메인넷 환경을 그대로 시뮬레이션합니다.

    ```bash
    cd contracts
    npx hardhat node
    ```

2.  **(터미널 2) 컨트랙트 배포**
    새 터미널을 열고 `contracts` 디렉토리에서 로컬 노드에 `Factory`와 `Paymaster`를 배포합니다.

    ```bash
    cd contracts
    npx hardhat run scripts/deploy.js --network localhost
    ```

    - 배포가 완료되면 출력되는 `Factory`와 `Paymaster` 주소를 복사하여 `.env.local` 파일에 업데이트합니다.

3.  **(터미널 2 계속) Paymaster 펀딩**
    배포 스크립트나 별도의 Hardhat 스크립트를 작성하여 로컬 노드 상의 `Paymaster` 컨트랙트에 BNB를 전송하고, `EntryPoint`에 자금을 예치(`deposit`)합니다.

4.  **(터미널 3) 자체 Bundler 실행**
    Bundler 소프트웨어가 있는 경로로 이동합니다. `bundler.toml` 설정 파일의 `rpc_url`이 로컬 Hardhat 노드 주소(`http://127.0.0.1:8545`)를 가리키는지 확인하고 Bundler를 실행합니다.

    ```bash
    ./stackup-bundler --config bundler.toml
    ```

    - Bundler가 성공적으로 실행되면 `HTTP RPC server listening on [::]:3000`와 같은 로그가 출력됩니다.

5.  **(터미널 4) Next.js 개발 서버 실행**
    프로젝트의 루트 디렉토리에서 Next.js 개발 서버를 실행합니다.

    ```bash
    npm run dev
    ```

    - `.env.local`의 `NEXT_PUBLIC_BUNDLER_RPC_URL`이 Bundler가 실행된 주소(`http://127.0.0.1:3000`)를 가리키는지 확인합니다.

6.  **테스트:** 브라우저에서 `localhost:3001` (또는 Next.js가 실행된 포트)에 접속하여 dApp 기능을 테스트합니다. 모든 요청은 `Next.js -> Local Bundler -> Local Hardhat Node` 순서로 처리됩니다.
