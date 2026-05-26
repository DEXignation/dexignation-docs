---
sidebar_position: 1
title: Overview
---

# Architecture Overview

DEXignation is a layered system. Each layer has one job; layers above
can be replaced without disturbing layers below.

DEXignation은 계층 시스템입니다. 각 계층은 하나의 일만 하고, 상위 계층을
교체해도 하위에 영향이 없습니다.

---

## Layer diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  Application layer                                               │
│  Wallets · dApps · MetaMask Snap · dexignation.com               │
└──────────────────────────────┬──────────────────────────────────┘
                               │ ABI calls
┌──────────────────────────────▼──────────────────────────────────┐
│  Controller layer                                                │
│  DXRegistrarController · DXReverseRegistrar                      │
└──────────────────────────────┬──────────────────────────────────┘
                               │ subnode ops, price quotes
┌──────────────────────────────▼──────────────────────────────────┐
│  Protocol layer                                                  │
│  DXRegistrar (ERC-721)  ·  DXResolver  ·  DXPriceOracle          │
└──────────────────────────────┬──────────────────────────────────┘
                               │ registry mutations
┌──────────────────────────────▼──────────────────────────────────┐
│  State layer                                                     │
│  DXRegistry — namehash → (owner, resolver, expires)              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Contracts at a glance / 컨트랙트 한눈에

| Contract | Responsibility |
|---|---|
| [`DXRegistry`](./registry) | namehash tree of `(owner, resolver, expires)` records |
| [`DXRegistrar`](./registrar) | ERC-721 NFT minting and expiry for `.dex` 2LDs |
| `DXRegistrarController` | User-facing entry: commit-reveal, payment, atomic resolver setup |
| [`DXResolver`](./resolver) | `(node, coinType) → addrBytes` and reverse names |
| `DXReverseRegistrar` | Claim `{addr}.addr.reverse` |
| [`DXPriceOracle`](./oracle) | attoUSD → wei via Chainlink (Direct / ViaLink) |

---

## Key design properties / 핵심 설계 성질

- **Replaceable controllers.** Owner can whitelist additional controllers
  for promotions or migrations without touching the registry.
  컨트롤러 교체 가능. 레지스트리는 그대로.

- **Replaceable resolvers.** Users can switch their name's resolver
  per-name.
  리졸버 교체 가능. 이름별 개별 가능.

- **Stable state at the bottom.** `DXRegistry` is the smallest, least
  changeable component.
  하단의 안정적 상태.

---

## Built on ENS

DEXignation borrows the architectural pattern from ENS — the
registry/registrar/resolver separation, commit-reveal, EIP-137 namehash,
ENSIP-9/11 coin types. ENS reference contracts are MIT-licensed; we keep
their attribution headers and list every derived file in our
`THIRD-PARTY-LICENSES.md`.

What we **kept** from ENS:

- Registry / Registrar / Resolver / Reverse Registrar separation
- Commit-reveal pattern
- EIP-137 namehash
- ENSIP-9 / ENSIP-11 coin-type encoding

What we **changed**:

- Fixed-tier pricing (1/3/5/10 years) instead of per-second + premium decay
- ERC-20 stablecoin payments alongside native
- Dual-path price oracle for cross-network portability
- Atomic resolver wiring at registration time
- Fully on-chain `tokenURI`

For the full deep-dive, see the [`docs/architecture.md`](https://github.com/DEXignation/dexignation-contracts/blob/main/docs/architecture.md)
file in the contracts repo or the [blog series](/blog/why-dexignation).

---

## Read next

- [Registry](./registry) — the state layer in detail
- [Registrar](./registrar) — ERC-721 lifecycle
- [Resolver](./resolver) — address records
- [Oracle](./oracle) — pricing math
