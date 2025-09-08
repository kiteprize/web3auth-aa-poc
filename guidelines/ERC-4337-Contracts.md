# ERC-4337 구성 컨트랙트 리스트 (하이브리드 방식)

이 문서는 자체 인프라 운영을 목표로, `eth-infinitism`의 표준 구현체를 기반으로 하되 OpenZeppelin의 검증된 유틸리티를 결합하여 보안을 강화하는 '하이브리드 방식'의 컨트랙트 구성을 안내합니다.

## 1. EntryPoint

`EntryPoint`는 모든 `UserOperation`을 처리하는 싱글톤(Singleton) 컨트랙트입니다. 네트워크에 단 하나만 존재하며, **절대 직접 배포하지 말고 아래의 공식 주소를 사용해야 합니다.**

- **소스코드 레퍼런스:** [eth-infinitism/account-abstraction](https://github.com/eth-infinitism/account-abstraction/blob/develop/contracts/core/EntryPoint.sol)
- **BNB Chain Mainnet (`chainId: 56`) 주소:**
  - `EntryPoint v0.6`: `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789`
- **BNB Chain Testnet (`chainId: 97`) 주소:**
  - `EntryPoint v0.6`: `0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789`

## 2. Smart Account & Factory (하이브리드)

사용자 지갑은 EIP-4337 표준을 가장 정확히 따르는 `eth-infinitism`의 `SimpleAccount`를 기반으로 구성합니다. 추가 기능 구현 시 OpenZeppelin의 검증된 컨트랙트를 활용하여 안정성을 높입니다.

- **기반 구현체:**
  - `SimpleAccount.sol`: [eth-infinitism/account-abstraction](https://github.com/eth-infinitism/account-abstraction/blob/develop/contracts/samples/SimpleAccount.sol)
  - `SimpleAccountFactory.sol`: [eth-infinitism/account-abstraction](https://github.com/eth-infinitism/account-abstraction/blob/develop/contracts/samples/SimpleAccountFactory.sol)
- **강화 방식:**
  - 새로운 관리자 기능을 추가할 때는 OpenZeppelin의 `Ownable.sol`을 상속받아 사용합니다.
  - 컨트랙트 업그레이드 기능을 고려한다면 OpenZeppelin의 UUPS 프록시 패턴을 적용할 수 있습니다.
- **Factory 배포:** `SimpleAccountFactory`는 직접 배포하여 서비스의 독립성을 확보합니다.

## 3. Paymaster (하이브리드)

가스비 대납 정책을 구현하는 `Paymaster` 또한 `eth-infinitism`의 `VerifyingPaymaster`를 기반으로 하되, 핵심 암호화 로직은 OpenZeppelin의 유틸리티를 사용하여 보안을 극대화합니다.

- **기반 구현체:**
  - `VerifyingPaymaster.sol`: [eth-infinitism/account-abstraction](https://github.com/eth-infinitism/account-abstraction/blob/develop/contracts/samples/VerifyingPaymaster.sol)
- **강화 방식 (필수):**
  - dApp 백엔드의 서명을 온체인에서 검증하는 로직에 OpenZeppelin의 `ECDSA.sol` 라이브러리를 사용합니다. 이는 매우 안전하고 표준적인 서명 검증 방법을 제공합니다.
- **Paymaster 배포:** `Paymaster` 컨트랙트는 dApp의 핵심 비즈니스 로직이므로 반드시 직접 배포하고 철저하게 관리해야 합니다.
