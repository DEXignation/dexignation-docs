---
sidebar_position: 3
title: Registrar
---

# DXRegistrar

ERC-721 minting and lifecycle for `.dex` 2LDs.

`.dex` 2LD의 ERC-721 발행과 생명주기 관리.

---

## Token ID convention

`tokenId = uint256(keccak256(label))`. The label (e.g. `"alice"`) is the
human-readable string, and the token ID is its keccak256 cast to a
uint256. This matches the registry subnode formula:

`tokenId = uint256(keccak256(label))`. 라벨(예: `"alice"`)의 keccak256을
uint256으로 변환한 값. 레지스트리 서브노드 공식과 일치:

```
subnode = keccak256(parentNode || labelhash)
        = keccak256(namehash("dex") || bytes32(tokenId))
```

---

## Lifecycle

| Phase | Duration | Behaviour |
|---|---|---|
| Active | `0 → expires` | Owner has full control |
| Grace | `expires → expires + 30 days` | Owner can renew but cannot register a new name |
| Free | `> expires + 30 days` | Available for anyone to register |

`GRACE_PERIOD = 30 days`. ENS uses 90 days; this is a product decision.

ENS의 90일 대비 30일로 단축. 제품 정책 결정.

---

## On-chain `tokenURI`

The registrar renders SVG + JSON inside the contract. See
[Concepts → On-chain SVG NFT](../concepts/onchain-svg).

리졸버 컨트랙트 내부에서 SVG + JSON 생성. [Concepts → On-chain SVG NFT](../concepts/onchain-svg) 참고.

---

## Source / 소스

[`contracts/registrar/DXRegistrar.sol`](https://github.com/DEXignation/dexignation-contracts/blob/main/contracts/registrar/DXRegistrar.sol)
