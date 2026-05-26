---
sidebar_position: 2
title: Registry
---

# DXRegistry

The state layer. Stores `(owner, resolver, expires)` per namehash node.

state 계층. namehash 노드마다 `(owner, resolver, expires)` 저장.

---

## Record shape

```solidity
struct Record {
    address owner;
    address resolver;
    uint256 expires;
}

mapping(bytes32 => Record) records;
```

---

## Notable changes vs ENS / ENS 대비 주요 변경

- `Record` includes `expires` — ENS does not track expiry at the
  registry level. This lets the registry itself enforce expiry,
  via the `authorised` modifier.
- New `setSubnodeExpires(node, label, expires)` — only the parent node
  owner (typically the Registrar) can write child expiry.
- Custom errors (`Unauthorized`, `NameExpired`) replace `require()`
  strings.

ENS는 만료를 레지스트리에서 추적하지 않습니다. DEXignation은 `expires`를
포함하여 만료를 레지스트리 차원에서 강제하고, 부모 노드 소유자만
자식의 만료를 기록할 수 있게 합니다.

---

## Authorisation modifier

```solidity
modifier authorised(bytes32 node) {
    if (isExpired(node)) revert NameExpired();
    address nodeOwner = records[node].owner;
    if (nodeOwner != msg.sender && !operators[nodeOwner][msg.sender]) {
        revert Unauthorized();
    }
    _;
}
```

Every state-changing function on the registry runs through this check.

레지스트리의 모든 state 변경 함수가 이 검증을 거칩니다.

---

## Source / 소스

[`contracts/registry/DXRegistry.sol`](https://github.com/DEXignation/dexignation-contracts/blob/main/contracts/registry/DXRegistry.sol)
