# ERC-4337 Paymaster를 이용한 가스비 대납 기능 구현 가이드 (하이브리드)

dApp 백엔드가 승인한 트랜잭션에 대해서만 가스비를 지불하는 `VerifyingPaymaster` 모델을 OpenZeppelin 유틸리티로 강화하여 구현합니다.

## 1. Paymaster 컨트랙트 구현 (`MyPaymaster.sol`)

`VerifyingPaymaster`를 기반으로 하되, 서명 검증 로직에 OpenZeppelin의 `ECDSA.sol`을 사용하여 보안을 강화합니다.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// 기반: eth-infinitism의 표준 인터페이스
import {VerifyingPaymaster} from "@account-abstraction/contracts/samples/VerifyingPaymaster.sol";
// 강화: OpenZeppelin의 검증된 암호화 유틸리티
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

// MyPaymaster.sol
contract MyPaymaster is VerifyingPaymaster {
    // dApp 백엔드 서명자의 주소
    address public immutable signingAuthority;

    constructor(address _entryPoint, address _signer) VerifyingPaymaster(_entryPoint) {
        signingAuthority = _signer;
    }

    // UserOperation의 유효기간과 백엔드 서명을 검증하는 핵심 함수
    function _validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 /* requiredPreFund */
    ) internal virtual override returns (bytes memory context, uint256 validationData) {
        // EntryPoint로부터의 호출과 기본 로직 검증
        (context, validationData) = super._validatePaymasterUserOp(userOp, userOpHash, 0);

        // paymasterAndData에서 유효기간과 서명을 추출
        (uint48 validUntil, uint48 validAfter, bytes memory signature) = abi.decode(
            userOp.paymasterAndData[20:], // paymaster 주소(20 bytes) 이후의 데이터
            (uint48, uint48, bytes)
        );

        // 시간 기반 검증
        require(block.timestamp <= validUntil && block.timestamp >= validAfter, "Paymaster: outside time range");

        // OpenZeppelin ECDSA 라이브러리를 사용한 백엔드 서명 검증
        bytes32 hashedUserOp = _getHash(userOp, validUntil, validAfter);
        address recoveredSigner = ECDSA.recover(hashedUserOp, signature);

        require(recoveredSigner == signingAuthority && recoveredSigner != address(0), "Paymaster: invalid signature");
    }

    // 백엔드와 동일한 방식으로 서명 대상 해시를 생성하는 함수
    function _getHash(UserOperation calldata userOp, uint48 validUntil, uint48 validAfter)
        internal
        view
        returns (bytes32)
    {
        // UserOperation 해시, 유효기간, 체인ID, Paymaster 주소를 모두 포함하여 리플레이 공격 방지
        return keccak256(abi.encode(
            _getStructHash(userOp),
            validUntil,
            validAfter,
            block.chainid,
            address(this)
        ));
    }
}
```

## 2. 백엔드 서명 API 구현 (`app/api/sponsor.ts`)

프론트엔드의 요청을 받아 `UserOperation`을 검증하고 서명해주는 API입니다. 컨트랙트의 `_getHash` 로직과 완벽히 동일한 방식으로 해시를 생성해야 합니다.

```typescript
// app/api/sponsor.ts
// (이전 답변과 동일한 코드를 사용하되, PAYMASTER_ADDRESS를 환경변수에서 가져오도록 수정)
import type { NextApiRequest, NextApiResponse } from "next";
import { UserOperation } from "permissionless";
// ... (viem, ethers, etc. imports)

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // ... (메서드, 파라미터 체크)

  const paymasterAddress = process.env.NEXT_PUBLIC_PAYMASTER_ADDRESS!;
  // ... (비즈니스 로직 검증)

  // ... (해시 생성 및 서명 로직)

  const paymasterAndData = new AbiCoder().encode(
    ["address", "uint48", "uint48", "bytes"],
    [paymasterAddress, validUntil, validAfter, signature]
  );

  res.status(200).json({ paymasterAndData });
}
```

## 3. Paymaster 자금 예치 및 운영

- **예치:** 배포된 `Paymaster` 컨트랙트가 가스비를 지불하려면 `EntryPoint`에 BNB를 예치(`deposit`)해야 합니다.
- **모니터링:** `EntryPoint`에 예치된 잔액을 실시간으로 모니터링하고, 부족 시 자동으로 충전하는 오프체인 스크립트(필수)를 운영해야 합니다.
