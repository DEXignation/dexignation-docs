---
sidebar_position: 4
title: Resolver
---

# DXResolver

Stores `(node, coinType) → addressBytes` and reverse names.

`(node, coinType) → 주소바이트` 및 역방향 이름 저장.

---

## Storage shape

```solidity
mapping(bytes32 => mapping(uint256 => bytes)) addresses;
//      node             coinType    rawBytes

mapping(bytes32 => string) names;
//      reverseNode    reverseName
```

---

## EVM length validation

For EVM coin types, `setAddr` enforces that `addrBytes.length` is either
0 (delete) or exactly 20 bytes:

EVM coin type일 때 길이가 0(삭제) 또는 정확히 20바이트인지 검증:

```solidity
function setAddr(bytes32 node, uint256 coinType, bytes calldata addrBytes)
    public override authorised(node)
{
    if (
        addrBytes.length != 0 &&
        addrBytes.length != 20 &&
        EVMCoinUtils.isEVMCoinType(coinType)
    ) {
        revert InvalidEVMAddress(coinType, addrBytes);
    }
    addresses[node][coinType] = addrBytes;
    emit AddrChanged(node, coinType, addrBytes);
}
```

Non-EVM types accept any length (Bitcoin scriptPubKey, Solana ed25519
key, etc).

비EVM 타입은 가변 길이 허용.

---

## Anti-spoof reverse lookup

`name(node)` performs a **forward verification** at read time. If the
forward record doesn't point back to the same owner, we return an
empty string — wallets can treat that as "no verified name."

`name(node)`은 읽기 시점에 **정방향 검증**을 수행합니다. 정방향 레코드가
같은 소유자를 가리키지 않으면 빈 문자열 반환.

```solidity
function name(bytes32 node) public view returns (string memory) {
    if (_isExpired(node)) return "";
    string memory stored = names[node];
    if (bytes(stored).length == 0) return stored;

    bytes32 forwardNode = DXNamehash.namehash(stored);
    address reverseOwner = registry.owner(node);
    if (_isExpired(forwardNode) || registry.owner(forwardNode) != reverseOwner) {
        return "";
    }
    return stored;
}
```

---

## Source / 소스

[`contracts/resolver/DXResolver.sol`](https://github.com/DEXignation/dexignation-contracts/blob/main/contracts/resolver/DXResolver.sol)
