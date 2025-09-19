좋아. **ERC-4337 v0.8** 기준으로, **클라이언트(프론트엔드)에서 UserOperation(`userOp`) 생성 및 서명 완료** → 백엔드에서 **사전 심사(`simulateValidation`)** → **배치 윈도우 최대 1초 / 최대 5건** → **동기 응답(요청 연결 유지)** → **실패 시 자동 재시도 없음(클라이언트가 재요청)** 흐름으로 정리했어.

- **프론트엔드**: 사용자의 **모든 종류의 요청(Native 전송, 토큰 전송, 컨트랙트 호출 등)**을 **범용 `Action` 객체**로 변환하고, 이를 기반으로 `userOp`를 생성 및 서명까지 모두 담당.
- **백엔드**: 완성된 `userOp`를 받아 검증, 큐잉, 번들링 실행만 담당.

ABI는 **외부 파일(예: `@/abi/EntryPointV08`)에 이미 존재**한다고 가정하고 해당 모듈을 import만 해. 핵심 라우트는 두 개:

1.  `/api/userop/submit` — **서명된 `userOp` 수신** + 검증 + 큐 적재 + 결과 동기 대기(폴링)
2.  `/api/userop/worker` — 락으로 단일 배처 보장 + 1초/5건 모아 `handleOps` 실행 + 요청별 결과 기록

아래 코드는 **Next.js App Router(Typescript, Node.js 런타임, viem)** 기준 예시이며, **레이트리밋(보낸 사람 주소당 KST 하루 10건)** 포함이야.

---

# 1) 제출 라우트 — `app/api/userop/submit/route.ts`

```ts
import { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";
import {
  createPublicClient,
  createWalletClient,
  getContract,
  http,
} from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

// ✅ 런타임/타임아웃
export const runtime = "nodejs";
export const maxDuration = 120;

// ✅ ENV
const RPC_URL = process.env.RPC_URL!;
const ENTRY_POINT = process.env.ENTRY_POINT as `0x${string}`;
const DEV_PK = process.env.BUNDLER_PRIVATE_KEY as `0x${string}`;
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ✅ viem clients
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});
const walletClient = createWalletClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
  account: privateKeyToAccount(DEV_PK),
});

// ✅ EntryPoint v0.8 ABI는 외부 파일에서 import
import ENTRY_POINT_ABI from "@/abi/EntryPointV08";

// ===== Redis 키 스킴
const Q = (chainId: number) => `q:bundler:${chainId}`;
const RES = (reqId: string) => `res:bundler:${reqId}`;

// ===== KST 자정까지 TTL
function secondsUntilNextKSTMidnight(): number {
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 3600_000);
  const next0 = new Date(
    Date.UTC(
      kstNow.getUTCFullYear(),
      kstNow.getUTCMonth(),
      kstNow.getUTCDate() + 1,
      0,
      0,
      0
    )
  );
  return Math.max(1, Math.ceil((next0.getTime() - kstNow.getTime()) / 1000));
}

// ===== sender별 하루 10건 제한(KST)
async function checkDailyLimit(sender: `0x${string}`) {
  const key = `rl:bundler:${baseSepolia.id}:${sender}`;
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, secondsUntilNextKSTMidnight());
  return { count: n, remaining: Math.max(0, 10 - n) };
}

// ===== 유효성 체크(필드 존재/간단 형식)
function assertUserOpShape(op: any) {
  const req = [
    "sender",
    "nonce",
    "initCode",
    "callData",
    "accountGasLimits",
    "preVerificationGas",
    "gasFees",
    "paymasterAndData",
    "signature",
  ];
  for (const f of req) if (!(f in op)) throw new Error(`missing field: ${f}`);
  if (typeof op.sender !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(op.sender)) {
    throw new Error("invalid sender");
  }
  if (
    typeof op.signature !== "string" ||
    op.signature === "0x" ||
    !op.signature
  ) {
    throw new Error("signature is required");
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  try {
    // 프론트엔드에서 생성 및 서명까지 완료한 userOp를 전달받음
    const { userOp } = await req.json();
    assertUserOpShape(userOp);

    const sender = userOp.sender as `0x${string}`;
    // 1) 레이트리밋
    const rl = await checkDailyLimit(sender);
    if (rl.count > 10) {
      return Response.json(
        {
          error: "RATE_LIMIT",
          message: "하루 10건 제한을 초과했습니다.",
          remaining: 0,
          reset: secondsUntilNextKSTMidnight(),
        },
        { status: 429 }
      );
    }

    // 2) 사전 심사: simulateValidation
    try {
      await publicClient.simulateContract({
        address: ENTRY_POINT,
        abi: ENTRY_POINT_ABI,
        functionName: "simulateValidation",
        args: [userOp],
      });
    } catch (e: any) {
      return new Response(
        JSON.stringify({
          error: "VALIDATION_FAILED",
          message: String(e?.shortMessage ?? e?.message ?? e),
          rateLimit: rl,
        }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    // 3) 무결성 참고: getUserOpHash
    const epRead = getContract({
      address: ENTRY_POINT,
      abi: ENTRY_POINT_ABI,
      client: publicClient,
    });
    const userOpHash = await epRead.read.getUserOpHash([userOp]);

    // 4) 큐 적재
    const requestId = crypto.randomUUID();
    await redis.lpush(
      Q(baseSepolia.id),
      JSON.stringify({ requestId, sender, userOp, userOpHash })
    );

    // 5) 동기 대기(짧은 폴링)
    const timeoutMs = 90_000;
    const pollEvery = 100;
    const t0 = Date.now();

    while (true) {
      const res = await redis.get(RES(requestId));
      if (res) {
        await redis.del(RES(requestId));
        return Response.json({ ...(res as any), userOpHash, rateLimit: rl });
      }
      if (Date.now() - t0 > timeoutMs) {
        return new Response(
          JSON.stringify({
            error: "TIMEOUT",
            message:
              "배치 또는 체인 확정이 시간 내에 끝나지 않았습니다. 다시 시도하세요.",
            userOpHash,
            rateLimit: rl,
          }),
          { status: 504, headers: { "content-type": "application/json" } }
        );
      }
      await sleep(pollEvery);
    }
  } catch (e: any) {
    return new Response(
      JSON.stringify({
        error: "SUBMIT_ERROR",
        message: String(e?.message ?? e),
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
```

---

# 2. 배처 워커 — `app/api/userop/worker/route.ts`

이 파일은 큐에서 작업을 가져와 처리하므로, userOp를 누가 생성했는지와 무관하게 동일하게 동작합니다.

```TypeScript
import { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";
import {
  createWalletClient,
  createPublicClient,
  getContract,
  http,
} from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

export const runtime = "nodejs";

// ✅ ENV & Redis
const RPC_URL = process.env.RPC_URL!;
const ENTRY_POINT = process.env.ENTRY_POINT as `0x${string}`;
const DEV_PK = process.env.BUNDLER_PRIVATE_KEY as `0x${string}`;
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ✅ viem clients
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});
const walletClient = createWalletClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
  account: privateKeyToAccount(DEV_PK),
});

// ✅ EntryPoint v0.8 ABI — 외부 파일 의존
import ENTRY_POINT_ABI from "@/abi/EntryPointV08";

// ===== Keys & Policy
const Q = (chainId: number) => `q:bundler:${chainId}`;
const RES = (reqId: string) => `res:bundler:${reqId}`;
const LOCK = (chainId: number) => `lock:bundler:${chainId}`;

const MAX_OPS = 5;
const WINDOW_MS = 1000;
const LOCK_TTL_MS = 5000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function acquireLock(key: string, ttlMs: number) {
  const token = crypto.randomUUID();
  const ok = await redis.set(key, token, { nx: true, px: ttlMs });
  return ok ? token : null;
}

async function releaseLock(key: string, token: string) {
  const lua = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end`;
  await redis.eval(lua, [key], [token]);
}

async function drainBatch(): Promise<{ items: any[]; ops: any[] } | null> {
  const first = await redis.rpop(Q(baseSepolia.id));
  if (!first) return null;

  const items: any[] = [JSON.parse(first as string)];
  const until = Date.now() + WINDOW_MS;

  while (items.length < MAX_OPS && Date.now() < until) {
    const it = await redis.rpop(Q(baseSepolia.id));
    if (!it) {
      await sleep(10);
      continue;
    }
    items.push(JSON.parse(it as string));
  }

  const ops = items.map((x) => x.userOp);
  return { items, ops };
}

export async function POST(_req: NextRequest) {
  const lockKey = LOCK(baseSepolia.id);
  const token = await acquireLock(lockKey, LOCK_TTL_MS);
  if (!token)
    return Response.json({ ok: false, reason: "BUSY" }, { status: 409 });

  try {
    const batch = await drainBatch();
    if (!batch) return Response.json({ ok: true, drained: 0 });

    const ep = getContract({
      address: ENTRY_POINT,
      abi: ENTRY_POINT_ABI,
      client: walletClient,
    });

    let txHash: `0x${string}` | null = null;
    let status: "success" | "reverted" | string = "reverted";

    try {
      txHash = await ep.write.handleOps([
        batch.ops,
        walletClient.account!.address,
      ]);
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });
      status = receipt.status;
    } catch (e: any) {
      txHash = null;
      status = "reverted";
    }

    await Promise.all(
      batch.items.map(
        (item, idx) =>
          redis.set(
            RES(item.requestId),
            {
              ok: status === "success",
              status,
              txHash,
              index: idx,
              batchSize: batch.items.length,
            },
            { ex: 300 }
          )
      )
    );

    return Response.json({
      ok: true,
      txHash,
      status,
      batchSize: batch.items.length,
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e?.message ?? e) }),
      { status: 500 }
    );
  } finally {
    await releaseLock(lockKey, token);
  }
}
```

---

# 3. 프론트엔드 예시 — 범용 userOp 생성 및 제출

callData 생성을 추상화하여 어떤 종류의 트랜잭션이든 처리할 수 있도록 개선한 최종 프론트엔드 예시입니다.

```TypeScript
// 예: components/MyTransactionButtons.tsx
import { useWeb3Auth } from "@web3auth/modal-react-hooks";
import {
  createPublicClient,
  createWalletClient,
  http,
  getContract,
  encodeFunctionData,
  parseEther,
  type Abi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

// ABI들은 외부 파일에서 가져온다고 가정
import ENTRY_POINT_ABI from "@/abi/EntryPointV08";
import MY_ACCOUNT_FACTORY_ABI from "@/abi/MyAccountFactory";
import MY_ACCOUNT_ABI from "@/abi/MyAccount";
import TEST_TOKEN_ABI from "@/abi/TestToken";

// --- 주소 및 설정 ---
const RPC_URL = "[https://sepolia.base.org](https://sepolia.base.org)";
const ENTRY_POINT_ADDRESS = "0x...";
const FACTORY_ADDRESS = "0x...";
const TOKEN_ADDRESS = "0x..."; // 예시 ERC20 토큰

// --- 1. 범용 헬퍼 및 타입 정의 ---

/**
 * 실행할 작업을 정의하는 인터페이스
 * to: 대상 컨트랙트 주소 (Native 전송 시에는 받는 사람 주소)
 * value: 함께 보낼 Native 토큰의 양
 * data: 실행할 함수의 callData (Native 전송 시에는 "0x")
 */
interface Action {
  to: `0x${string}`;
  value: bigint;
  data: `0x${string}`;
}

/**
 * 범용 callData 생성 헬퍼 함수
 */
function createContractCallData<TAbi extends Abi>({
  abi,
  functionName,
  args,
}: {
  abi: TAbi;
  functionName: string;
  args: any[];
}): `0x${string}` {
  return encodeFunctionData({
    abi,
    functionName,
    args,
  });
}

// --- 2. 핵심 UserOperation 생성 함수 ---

/**
 * 어떤 Action이든 받아서 UserOp를 생성하고 서명하는 핵심 함수
 */
async function buildAndSignUserOp(
  provider: any,
  ownerAddress: `0x${string}`,
  action: Action
) {
  // 1. Web3Auth에서 private key 추출
  const privateKey = (await provider.request({
    method: "private_key",
  })) as `0x${string}`;
  if (!privateKey) throw new Error("Private key not found");
  const userAccount = privateKeyToAccount(privateKey);

  // 2. viem 클라이언트 설정
  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC_URL) });

  // 3. SCA 주소 예측 및 배포 필요 여부 확인
  const factory = getContract({ address: FACTORY_ADDRESS, abi: MY_ACCOUNT_FACTORY_ABI, client: publicClient });
  const scaAddress = await factory.read.getAddress([ownerAddress, BigInt(0)]);
  const scaCode = await publicClient.getCode({ address: scaAddress });
  const needsDeployment = !scaCode || scaCode === "0x";

  let initCode: `0x${string}` = "0x";
  if (needsDeployment) {
    const createAccountCalldata = encodeFunctionData({
      abi: MY_ACCOUNT_FACTORY_ABI,
      functionName: "createAccount",
      args: [ownerAddress, BigInt(0)],
    });
    initCode = `${FACTORY_ADDRESS}${createAccountCalldata.slice(2)}`;
  }

  // 4. Nonce 가져오기
  const entryPoint = getContract({ address: ENTRY_POINT_ADDRESS, abi: ENTRY_POINT_ABI, client: publicClient });
  const nonce = await entryPoint.read.getNonce([scaAddress, BigInt(0)]);

  // 5. 스마트 컨트랙트 계정의 execute 함수를 위한 callData 생성
  const executeCalldata = encodeFunctionData({
    abi: MY_ACCOUNT_ABI,
    functionName: "execute",
    args: [action.to, action.value, action.data],
  });

  // 6. UserOperation 객체 구성
  const userOp = {
    sender: scaAddress,
    nonce,
    initCode,
    callData: executeCalldata,
    accountGasLimits: `0x${BigInt(1_000_000).toString(16).padStart(32, "0")}${BigInt(500_000).toString(16).padStart(32, "0")}`,
    preVerificationGas: BigInt(100_000),
    gasFees: `0x${BigInt(0).toString(16).padStart(32, "0")}${BigInt(0).toString(16).padStart(32, "0")}`,
    paymasterAndData: "0x",
    signature: "0x" as `0x${string}`,
  };

  // 7. UserOpHash 생성 및 서명
  const userOpHash = await entryPoint.read.getUserOpHash([userOp]);
  const signature = await userAccount.signMessage({ message: { raw: userOpHash } });
  userOp.signature = signature;

  return userOp;
}

// --- 3. React 컴포넌트에서 사용 ---

export function MyTransactionButtons() {
  const { provider, address } = useWeb3Auth();

  const handleSubmit = async (action: Action) => {
     if (!provider || !address) {
      alert("Please connect your wallet first.");
      return;
    }
    try {
      const signedUserOp = await buildAndSignUserOp(provider, address as `0x${string}`, action);
      const response = await fetch("/api/userop/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userOp: signedUserOp }),
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result.message || "An error occurred.");

      console.log("Transaction submitted successfully:", result);
      alert(`Success! TxHash: ${result.txHash}`);

    } catch (error: any) {
      console.error("Failed to submit transaction:", error);
      alert(`Error: ${error.message}`);
    }
  }

  // ERC20 토큰 전송 버튼 핸들러
  const handleErc20Transfer = () => {
    const tokenTransferCallData = createContractCallData({
        abi: TEST_TOKEN_ABI,
        functionName: "transfer",
        args: ["0xRECIPIENT_ADDRESS", parseEther("10")],
    });
    handleSubmit({ to: TOKEN_ADDRESS, value: BigInt(0), data: tokenTransferCallData });
  };

  // Native 토큰 전송 버튼 핸들러
  const handleNativeTransfer = () => {
    handleSubmit({ to: "0xRECIPIENT_ADDRESS", value: parseEther("0.01"), data: "0x" });
  };

  return (
    <div>
      <button onClick={handleErc20Transfer}>Send 10 ERC20 Tokens</button>
      <button onClick={handleNativeTransfer}>Send 0.01 ETH</button>
    </div>
  );
}
```
