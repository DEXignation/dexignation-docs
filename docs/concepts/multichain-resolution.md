---
sidebar_position: 5
title: Multi-Chain Resolution
---

# Multi-Chain Resolution

One `.dex` name can resolve to addresses on many blockchains
simultaneously. DEXignation follows **ENSIP-9 (SLIP-44)** for non-EVM
chains and **ENSIP-11** for EVM chains.

하나의 `.dex` 이름이 여러 블록체인에서 동시에 해결됩니다. 비EVM 체인은
**ENSIP-9 (SLIP-44)**, EVM 체인은 **ENSIP-11** 인코딩을 따릅니다.

---

## Coin-type encoding

SLIP-44 numbers each cryptocurrency. ENSIP-11 extends this with a
high-bit set for EVM chains:

| coinType | Meaning |
|---|---|
| `0` | Bitcoin |
| `60` | Ethereum (SLIP-44 legacy) |
| `501` | Solana |
| `0x80000000` | "any EVM" (default) |
| `0x80000000 \| 1` | Ethereum mainnet (chain ID 1) |
| `0x80000000 \| 137` | Polygon |
| `0x80000000 \| 56` | BNB Chain |
| `0x80000000 \| 8453` | Base |

---

## Reading a record

```solidity
function addr(bytes32 node, uint256 coinType) external view returns (bytes memory);
```

Returns raw bytes. For EVM coin types, these are 20-byte addresses.
For non-EVM, they're the chain-native byte string (e.g. Bitcoin
scriptPubKey, Solana ed25519 key).

EVM은 20바이트, 비EVM은 체인 고유 바이트 문자열.

---

## Wallet integration recipe

```javascript
function lookup(name, currentChainId) {
  const node = namehash(name);

  // Most specific: address for the exact chain
  let addr = resolver.addr(node, 0x80000000 | currentChainId);
  if (addr) return addr;

  // SLIP-44 legacy code for Ethereum mainnet
  if (currentChainId === 1) {
    addr = resolver.addr(node, 60);
    if (addr) return addr;
  }

  // Fallback: "any EVM"
  return resolver.addr(node, 0x80000000);
}
```

가장 구체적 → 가장 일반적 순으로 fallback.

---

## Full deep-dive

→ [Blog: Multi-chain resolution via ENSIP-11](/blog/multichain-resolution)
