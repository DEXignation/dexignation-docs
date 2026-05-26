---
sidebar_position: 1
title: Resolve a name
---

# Resolve a name

Three ways to turn a `.dex` name into a chain-specific address.

`.dex` 이름을 체인별 주소로 바꾸는 세 가지 방법.

---

## Option 1: HTTP via dexignation-api

The simplest path. No on-chain interaction from your client.

가장 간단한 경로. 클라이언트에서 온체인 호출 없음.

```bash
curl https://api.dexignation.com/resolve/alice.dex
```

```json
{
  "name": "alice.dex",
  "owner": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  "expired": false,
  "addresses": {
    "polygon": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    "ethereum": "0xA1B2C3D4E5F60718293A4B5C6D7E8F9A0B1C2D3E"
  }
}
```

---

## Option 2: viem / ethers directly

If you're already running a chain client, talk to the resolver directly.

이미 체인 클라이언트가 있다면 리졸버에 직접 호출.

```typescript
import { createPublicClient, http, getAddress } from "viem";
import { namehash } from "viem/ens";
import { polygon } from "viem/chains";

const client = createPublicClient({
  chain: polygon,
  transport: http(),
});

const node = namehash("alice.dex");
const COIN_TYPE_POLYGON = (1n << 31n) | 137n;

const addrBytes = await client.readContract({
  address: getAddress(RESOLVER_ADDRESS),
  abi: [
    {
      type: "function",
      name: "addr",
      stateMutability: "view",
      inputs: [
        { name: "node", type: "bytes32" },
        { name: "coinType", type: "uint256" },
      ],
      outputs: [{ type: "bytes" }],
    },
  ],
  functionName: "addr",
  args: [node, COIN_TYPE_POLYGON],
});

const address = getAddress(addrBytes);
```

---

## Option 3: MetaMask Snap

If the user has the [DEXignation Snap](https://github.com/DEXignation/dexignation-snap)
installed, ask MetaMask to resolve.

사용자가 [DEXignation Snap](https://github.com/DEXignation/dexignation-snap)을
설치한 경우.

```javascript
const result = await window.ethereum.request({
  method: "wallet_invokeSnap",
  params: {
    snapId: "npm:@dexignation/snap",
    request: {
      method: "resolve",
      params: { name: "alice.dex" },
    },
  },
});
```

---

## Which should I use? / 어느 걸 써야 하나?

| Use case | Recommended |
|---|---|
| Backend service / indexer | Option 2 (viem direct) |
| Web app, server already running | Option 1 (HTTP API) |
| Browser dApp, user has MetaMask | Option 3 (Snap), fallback to Option 1 |
| Mobile wallet | Option 2 (viem) with the wallet's chain client |

---

## Reverse lookup

`reverse` versions of all three options exist:

```bash
# HTTP
curl https://api.dexignation.com/reverse/0x71C7...8976F

# Snap
await window.ethereum.request({
  method: "wallet_invokeSnap",
  params: {
    snapId: "npm:@dexignation/snap",
    request: {
      method: "reverseResolve",
      params: { address: "0x71C7...8976F" },
    },
  },
});
```
