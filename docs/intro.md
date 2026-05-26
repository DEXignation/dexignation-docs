---
sidebar_position: 1
slug: /intro
title: Introduction
---

# DEXignation

**Human-readable names for blockchain addresses on Polygon.**

블록체인 주소를 사람이 읽을 수 있는 이름으로 — Polygon 네이티브 네임 서비스.

---

## What is DEXignation? / DEXignation이란?

DEXignation maps long hexadecimal blockchain addresses to memorable
human-readable names under the `.dex` TLD. Instead of sending POL to
`0x71C7656EC7ab88b098defB751B7401B5f6d8976F`, a user sends it to
`alice.dex`. The on-chain mapping is owned by the user as an ERC-721 NFT,
paid for in USDC, USDT, or POL.

DEXignation은 긴 16진 블록체인 주소를 `.dex` TLD 하위의 사람이 읽을 수 있는
이름으로 매핑합니다. POL을 `0x71C7656EC7...`로 보내는 대신 `alice.dex`로
보낼 수 있습니다. 매핑은 사용자가 직접 보유하는 ERC-721 NFT이며 USDC, USDT,
POL로 결제할 수 있습니다.

---

## Why use it? / 왜 쓰는가?

- **No more 42-char addresses.** Type `alice.dex`, not `0x71C7...8976F`.
- **One name, many chains.** A single `.dex` name can hold addresses on
  Polygon, Ethereum, BNB Chain, Bitcoin, Solana, and more — wallets
  resolve to the right one automatically.
- **Stablecoin payment.** Register and renew in USDC or USDT, not in a
  volatile native token.
- **You own it.** Names are ERC-721 NFTs in your wallet. Transferable,
  marketable, censorship-resistant.
- **Cheap on Polygon.** Cents in gas, not tens of dollars.

- 42자 주소 끝. `alice.dex`만 입력.
- 한 이름에 여러 체인 주소. 지갑이 알맞은 것을 자동 선택.
- USDC/USDT 결제.
- ERC-721로 사용자 직접 보유. 양도·거래 가능.
- Polygon 가스비는 센트 단위.

---

## How does it work? / 어떻게 작동하는가?

Six smart contracts cooperate:

여섯 개의 스마트 컨트랙트가 협력합니다:

1. **DXRegistry** — the namehash tree that maps `(node → owner, resolver, expires)`.
2. **DXRegistrar** — mints names as ERC-721 NFTs and enforces lifecycle.
3. **DXRegistrarController** — user-facing entry point with commit-reveal
   and stablecoin payment support.
4. **DXResolver** — stores `(node, coinType) → address bytes` and reverse names.
5. **DXReverseRegistrar** — lets users claim `{addr}.addr.reverse` for reverse lookups.
6. **DXPriceOracle** — converts USD prices to wei via Chainlink, with a
   dual-path fallback.

The full architectural deep-dive lives in
[Architecture → Overview](./architecture/overview).

전체 아키텍처는 [Architecture → Overview](./architecture/overview)에서.

---

## Built on ENS / ENS 위에서 빌드

DEXignation is transparently built on the architectural patterns and
the MIT-licensed reference implementation of the
[Ethereum Name Service (ENS)](https://ens.domains/) by Nick Johnson and
the ENS Labs team. We are deeply grateful for their work.

DEXignation은 Nick Johnson과 ENS Labs의
[Ethereum Name Service (ENS)](https://ens.domains/) 아키텍처와 MIT 라이선스
참조 구현 위에서 투명하게 빌드되었습니다.

What we kept, what we changed, and full attribution: see
[Architecture → Overview](./architecture/overview) and the
`THIRD-PARTY-LICENSES.md` in each repository.

차용한 부분, 바꾼 부분, 전체 출처: [Architecture → Overview](./architecture/overview) 및
각 저장소의 `THIRD-PARTY-LICENSES.md` 참고.

---

## Where to go next / 다음 읽을거리

- **Just want to use it?** → [Guides → Resolve a name](./guides/resolve-a-name)
- **Want the conceptual story?** → [Concepts](./concepts/namehash)
- **Want to build on it?** → [Architecture → Overview](./architecture/overview)
- **Background reading?** → The [blog series](/blog) starting with
  "Why DEXignation".
