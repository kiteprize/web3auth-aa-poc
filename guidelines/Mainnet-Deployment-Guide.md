# 자체 인프라 메인넷 배포 및 운영 가이드라인

프로덕션 환경에 자체 ERC-4337 인프라(Bundler, Paymaster)를 배포하고 안정적으로 운영하기 위한 가이드입니다. **높은 수준의 DevOps 및 보안 역량이 요구됩니다.**

## Phase 1: 스마트 컨트랙트 배포

1.  **코드 감사 (Audit):** 배포할 모든 스마트 컨트랙트(`Paymaster`, `Factory`)는 반드시 제3자 전문 보안 감사 업체로부터 감사를 받아야 합니다.
2.  **보안된 배포:**
    - 배포자의 개인키는 Ledger와 같은 하드웨어 월렛 또는 Gnosis Safe(멀티시그)를 통해 관리합니다.
    - 배포 스크립트(Hardhat, Foundry)를 사용하고, 배포 트랜잭션을 신중하게 검토 후 서명합니다.
3.  **소스코드 검증:** BscScan에서 배포된 모든 컨트랙트의 소스코드를 검증(Verify)하여 투명성을 확보합니다.

## Phase 2: Bundler 인프라 배포 및 운영

자체 Bundler는 서비스의 핵심 동맥입니다. 24/7 안정적인 운영을 위한 인프라 구축이 필수적입니다.

1.  **컴퓨트 환경:**
    - **컨테이너화:** `stackup-bundler`를 Docker 이미지로 빌드하여 배포 환경의 일관성을 확보합니다.
    - **배포:** AWS ECS/EKS, Google Cloud Run/GKE와 같은 컨테이너 오케스트레이션 서비스를 사용하여 배포합니다. 최소 2개 이상의 인스턴스를 서로 다른 가용 영역(AZ)에 배포하여 고가용성을 확보합니다.
    - **로드 밸런서:** 배포된 Bundler 인스턴스들 앞에 Application Load Balancer를配置하여 트래픽을 분산하고 Health Check를 수행합니다.
2.  **BSC 노드 연결:**
    - **Private RPC 사용:** QuickNode, Ankr, Chainstack 등 유료 RPC 제공업체의 **Private 엔드포인트**를 사용해야 합니다. Public RPC는 속도 및 안정성 문제로 프로덕션 환경에 절대 적합하지 않습니다.
    - **자체 노드 운영 (고급):** 최고 수준의 안정성과 성능이 필요하다면 직접 BSC Full Node(Archive 포함)를 운영하는 것을 고려할 수 있습니다.
3.  **보안:**
    - **DDoS 방어:** Bundler의 공개 RPC 엔드포인트 앞에 Cloudflare와 같은 DDoS 방어 솔루션을配置합니다.
    - **방화벽:** 필요한 포트(RPC) 외에는 모든 접근을 차단하는 엄격한 방화벽 규칙을 적용합니다.
4.  **Bundler 지갑 관리:**
    - Bundler의 EOA 지갑은 `EntryPoint`에 트랜잭션을 보내는 역할만 수행합니다. 이 지갑의 개인키는 AWS KMS와 같은 키 관리 서비스에 안전하게 저장하고, Bundler 인스턴스는 해당 키를 사용할 IAM 권한만 갖도록 합니다.
    - 이 지갑에는 가스비로 사용할 소량의 BNB만 유지하고, 주기적으로 충전하는 시스템을 구축합니다.

## Phase 3: Paymaster 서명 서비스 배포

1.  **🔥 개인키 보안:** `PAYMASTER_SIGNER_PRIVATE_KEY`는 **AWS KMS** 또는 **Google Cloud KMS**를 사용하여 관리해야 합니다.
2.  **서버리스 배포:** Next.js API Route(`sponsor` API)는 Vercel, AWS Lambda 등 서버리스 환경에 배포하여 보안과 확장성을 확보합니다.

## Phase 4: 운영 및 유지보수

1.  **모니터링 및 알림 (필수):**
    - **Paymaster 잔액:** `EntryPoint`에 예치된 `Paymaster`의 BNB 잔액을 5분마다 체크하고, 임계값 이하 시 즉시 운영팀에 알림(Slack, PagerDuty)을 보내는 시스템을 구축합니다.
    - **Bundler 지갑 잔액:** Bundler EOA 지갑의 BNB 잔액을 모니터링하고 충전합니다.
    - **인프라 모니터링:** Bundler 인스턴스의 CPU/메모리 사용량, RPC 응답 시간, 에러율 등을 Datadog, Grafana 등으로 모니터링합니다.
2.  **자금 관리 프로세스:**
    - 모든 운영 자금은 Gnosis Safe와 같은 멀티시그 지갑(Treasury)에 보관합니다.
    - 정기적으로 또는 알림 수신 시, 정해진 프로세스에 따라 Treasury에서 Paymaster와 Bundler 지갑으로 자금을 이체합니다.
3.  **로깅 및 분석:**
    - Bundler와 Paymaster 서명 API의 모든 요청과 응답을 로깅합니다.
    - 비정상적인 `UserOperation` 요청 패턴을 분석하여 어뷰징을 탐지하고 방어 정책을 고도화합니다.
