---
sidebar_position: 1
title: Namehash (EIP-137)
---

# Namehash

The **namehash** algorithm (EIP-137) turns a dotted name like
`alice.dex` into a deterministic 32-byte identifier. Every name in
DEXignation is referenced by its namehash, never by its raw string.

**namehash** 알고리즘(EIP-137)은 `alice.dex` 같은 점 구분 이름을 결정적
32바이트 식별자로 변환합니다. DEXignation의 모든 이름은 raw 문자열이 아닌
namehash로 참조됩니다.

---

## The algorithm in one paragraph

Start with `bytes32(0)`. Split the name into labels by `.`. Iterate
right-to-left. For each label, replace the current node with
`keccak256(currentNode || keccak256(label))`. The final node is the
namehash.

`bytes32(0)`으로 시작. 이름을 `.` 기준으로 라벨로 쪼개고, 오른쪽에서
왼쪽으로 반복하며 `keccak256(currentNode || keccak256(label))`로 갱신.
최종 노드가 namehash.

```
namehash("")              = 0x00...00
namehash("dex")           = keccak256(0x00...00 || keccak256("dex"))
namehash("alice.dex")     = keccak256(namehash("dex") || keccak256("alice"))
namehash("foo.alice.dex") = keccak256(namehash("alice.dex") || keccak256("foo"))
```

---

## Why hash labels separately?

If we just hashed `keccak256("alice.dex")`, the registry couldn't grant
ownership over `dex` independently from `alice.dex` — they'd have
unrelated identifiers. Hashing each label and chaining bakes parent-child
relationships into the cryptography itself.

라벨별 해싱은 부모-자식 관계를 암호학 수준에서 보장합니다.

---

## In code / 코드에서

DEXignation's implementation lives in
[`contracts/utils/DXNamehash.sol`](https://github.com/DEXignation/dexignation-contracts/blob/main/contracts/utils/DXNamehash.sol).
It is byte-for-byte compatible with `viem`'s `namehash` and
`ethers.js`'s `namehash`.

```javascript
import { namehash } from "viem/ens";

namehash("alice.dex");
// 0x...same as DXNamehash.namehash("alice.dex") on-chain
```

---

## Full deep-dive

For the full walkthrough — including the right-to-left scan
optimisation, the `EmptyDnsLabel` guard, and EIP-181 reverse-resolution
helpers — read the blog post:

→ [Blog: namehash, explained simply](/blog/namehash-explained)
