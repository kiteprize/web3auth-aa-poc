# Next.js dApp에 자체 운영 ERC-4337 인프라 연동 가이드

`permissionless.js`와 `viem`을 사용하여 Next.js 프론트엔드에서 자체 운영 Bundler 및 Paymaster와 상호작용하는 방법을 안내합니다.

## 1. 클라이언트 및 Provider 설정

SaaS API 키 대신 로컬 또는 자체 서버에서 실행 중인 Bundler RPC 엔드포인트를 사용하도록 클라이언트를 설정합니다.

```tsx
// lib/clients.ts
import { createPublicClient, http } from "viem";
import { bsc, bscTestnet } from "viem/chains";
import { createBundlerClient } from "permissionless";
import { Web3Auth } from "@web3auth/modal";
import {
  toWeb3AuthSigner,
  type SmartAccountSigner,
} from "permissionless/signers/web3auth";

// 1. 자체 운영 Bundler 클라이언트 생성 함수
export const createSelfHostedBundlerClient = (chainId: number) => {
  // 로컬 테스트 시에는 NEXT_PUBLIC_BUNDLER_RPC_URL 사용
  // 프로덕션 환경에서는 배포된 Bundler의 public URL 사용
  const bundlerUrl = process.env.NEXT_PUBLIC_BUNDLER_RPC_URL!;

  return createBundlerClient({
    chain: chainId === 56 ? bsc : bscTestnet,
    transport: http(bundlerUrl),
    entryPoint: process.env.NEXT_PUBLIC_ENTRYPOINT_ADDRESS as `0x${string}`,
  });
};

// 2. viem Public 클라이언트 생성 함수
export const createViemPublicClient = (chainId: number) =>
  createPublicClient({
    chain: chainId === 56 ? bsc : bscTestnet,
    transport: http(), // 혹은 자체 노드 RPC 사용
  });

// 3. Web3Auth Provider를 SmartAccountSigner로 변환하는 함수 (변경 없음)
export async function getWeb3AuthSigner(
  web3auth: Web3Auth
): Promise<SmartAccountSigner> {
  if (!web3auth.provider) throw new Error("Web3Auth not connected");
  return toWeb3AuthSigner({ web3auth });
}
```

## 2. Smart Account 클라이언트 생성 및 사용

사용자 로그인 후, 자체 인프라(`Bundler`, `Factory`)와 통신하는 `SmartAccountClient`를 생성합니다.

```tsx
// React 컴포넌트 예시
import { useState, useEffect } from "react";
import { createSmartAccountClient, SmartAccountClient } from "permissionless";
import { signerToSimpleSmartAccount } from "permissionless/accounts";
import {
  getWeb3AuthSigner,
  createSelfHostedBundlerClient,
  createViemPublicClient,
} from "../lib/clients";

function MyDapp({ web3auth, chainId }) {
  const [smartAccountClient, setSmartAccountClient] =
    useState<SmartAccountClient | null>(null);

  useEffect(() => {
    const setupAccount = async () => {
      if (web3auth && web3auth.provider) {
        const signer = await getWeb3AuthSigner(web3auth);
        const publicClient = createViemPublicClient(chainId);

        const simpleAccount = await signerToSimpleSmartAccount(publicClient, {
          signer,
          entryPoint: process.env
            .NEXT_PUBLIC_ENTRYPOINT_ADDRESS as `0x${string}`,
          factoryAddress: process.env
            .NEXT_PUBLIC_ACCOUNT_FACTORY_ADDRESS as `0x${string}`,
        });

        // 자체 운영 Bundler Transport를 사용
        const bundlerClient = createSelfHostedBundlerClient(chainId);

        const client = createSmartAccountClient({
          account: simpleAccount,
          chain: chainId === 56 ? bsc : bscTestnet,
          transport: bundlerClient.transport, // bundlerClient.transport를 명시
          sponsorUserOperation: async ({ userOperation }) => {
            const response = await fetch("/api/sponsor", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userOp: userOperation, chainId }),
            });
            const { paymasterAndData } = await response.json();
            return { paymasterAndData };
          },
        });

        setSmartAccountClient(client);
      }
    };
    setupAccount();
  }, [web3auth, chainId]);

  const handleSponsoredTx = async () => {
    if (!smartAccountClient) return;

    // permissionless.js의 sponsorUserOperation 미들웨어가 자동으로
    // 백엔드 API를 호출하고 paymasterAndData를 채워줍니다.
    const txHash = await smartAccountClient.sendTransaction({
      to: "0xRecipientAddress...",
      value: 1000000000000000n, // 0.001 BNB
    });
    console.log("Transaction sent!", txHash);
  };

  return <button onClick={handleSponsoredTx}>Send Sponsored TX</button>;
}
```
