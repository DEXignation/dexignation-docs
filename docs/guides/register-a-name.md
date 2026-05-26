---
sidebar_position: 2
title: Register a name
---

# Register a name

Registration is two transactions due to commit-reveal. Here is the full
flow from a TypeScript dApp.

commit-reveal 때문에 등록은 두 트랜잭션. TypeScript dApp에서의 전체 흐름.

---

## Prerequisites / 사전 요구사항

- A connected wallet (e.g. via viem's `WalletClient`).
- The deployed contract addresses for the target network.
- Enough POL or USDC/USDT to cover the rent price (see
  [pricing](#pricing)).

---

## Pricing

| Duration | Price (attoUSD) |
|---:|---:|
| 1 year   | $8 |
| 3 years  | $18 |
| 5 years  | $25 |
| 10 years | $40 |

Convert with `controller.rentPrice(duration)` for POL or
`controller.rentPriceInToken(duration, tokenAddress)` for stablecoins.

POL은 `controller.rentPrice(duration)`, 스테이블코인은 `rentPriceInToken`으로 변환.

---

## Step 1: Commit

```typescript
import { keccak256, encodeAbiParameters, parseAbiParameters } from "viem";

// Generate a fresh secret for this registration only.
const secret = `0x${[...crypto.getRandomValues(new Uint8Array(32))]
  .map((b) => b.toString(16).padStart(2, "0"))
  .join("")}` as `0x${string}`;

const commitment = keccak256(
  encodeAbiParameters(
    parseAbiParameters("string, address, bytes32"),
    [label, ownerAddress, secret],
  ),
);

const txHash = await walletClient.writeContract({
  address: CONTROLLER_ADDRESS,
  abi: controllerAbi,
  functionName: "commit",
  args: [commitment],
});

await publicClient.waitForTransactionReceipt({ hash: txHash });

// IMPORTANT: persist `secret` in memory / local storage. You need it
// for the reveal step.
// 중요: secret을 메모리/local storage에 보관. reveal 시 필요.
```

---

## Step 2: Wait

Wait at least `minCommitmentAge` (default 30 seconds). MetaMask will
typically take 3–10 seconds for the commit to confirm, so a UI prompt
of "Waiting 30 seconds for anti-front-running window..." is appropriate.

최소 `minCommitmentAge`(기본 30초) 대기. 커밋 컨펌이 보통 3–10초이므로
"프론트러닝 방지 윈도우 30초 대기 중..." UI 표시 권장.

---

## Step 3: Reveal & register

### Option A — pay in POL

```typescript
const price = await publicClient.readContract({
  address: CONTROLLER_ADDRESS,
  abi: controllerAbi,
  functionName: "rentPrice",
  args: [duration],
});

const txHash = await walletClient.writeContract({
  address: CONTROLLER_ADDRESS,
  abi: controllerAbi,
  functionName: "register",
  args: [label, ownerAddress, duration, RESOLVER_ADDRESS, secret],
  value: price,
});
```

Overpayment is refunded automatically. 초과분은 자동 환불.

### Option B — pay in USDC or USDT

```typescript
const tokenAmount = await publicClient.readContract({
  address: CONTROLLER_ADDRESS,
  abi: controllerAbi,
  functionName: "rentPriceInToken",
  args: [duration, USDC_ADDRESS],
});

// 1. Approve the controller to pull `tokenAmount` USDC.
await walletClient.writeContract({
  address: USDC_ADDRESS,
  abi: erc20Abi,
  functionName: "approve",
  args: [CONTROLLER_ADDRESS, tokenAmount],
});

// 2. Register with token payment.
await walletClient.writeContract({
  address: CONTROLLER_ADDRESS,
  abi: controllerAbi,
  functionName: "registerWithToken",
  args: [
    label,
    ownerAddress,
    duration,
    RESOLVER_ADDRESS,
    USDC_ADDRESS,
    secret,
  ],
});
```

No refund logic for tokens — the exact amount is pulled.

토큰 결제는 환불 없음 — 정확히 필요한 양만 인출.

---

## After registration / 등록 후

The controller automatically sets the initial Polygon address record
during registration, so `alice.dex` resolves immediately to the owner's
address. No second transaction needed.

컨트롤러가 등록 시 초기 Polygon 주소 레코드를 자동으로 설정합니다.
별도 트랜잭션 불필요. `alice.dex`가 즉시 소유자 주소로 해결됩니다.

To add Ethereum, BNB Chain, or other chain records, call
`resolver.setAddr(node, coinType, addrBytes)`.

Ethereum, BNB Chain 등 추가 체인 레코드는 `resolver.setAddr`로.

---

## Renewal / 갱신

Renewal is a single transaction — no commit-reveal needed because no
new ownership transfer happens.

갱신은 단일 트랜잭션. 소유권 이전이 없으므로 commit-reveal 불필요.

```typescript
await walletClient.writeContract({
  address: CONTROLLER_ADDRESS,
  abi: controllerAbi,
  functionName: "renew",
  args: [label, duration],
  value: await controller.rentPrice(duration),
});
```
