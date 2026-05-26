---
sidebar_position: 3
title: Integrate the MetaMask Snap
---

# Integrate the MetaMask Snap

If your dApp is open in a browser where the user has MetaMask, you can
delegate `.dex` resolution to the
[DEXignation MetaMask Snap](https://github.com/DEXignation/dexignation-snap).

사용자가 MetaMask를 쓰는 브라우저에서 dApp을 연다면, `.dex` 해결을
[DEXignation MetaMask Snap](https://github.com/DEXignation/dexignation-snap)에 위임할 수 있습니다.

---

## Install (user side) / 사용자 측 설치

The user needs MetaMask 11+ or
[MetaMask Flask](https://metamask.io/flask/) for unaudited Snaps.

사용자는 MetaMask 11+ 또는 (감사 전 Snap을 위한) MetaMask Flask 필요.

The first time your dApp calls the Snap, MetaMask will prompt the user
to install it.

dApp이 처음 Snap을 호출하면 MetaMask가 사용자에게 설치 안내.

---

## Request the Snap

```javascript
await window.ethereum.request({
  method: "wallet_requestSnaps",
  params: {
    "npm:@dexignation/snap": {},
  },
});
```

---

## Resolve a name

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
// {
//   name: "alice.dex",
//   owner: "0x71C7...",
//   expired: false,
//   addresses: { polygon: "0x71C7...", ethereum: "0xA1B2..." }
// }
```

---

## Reverse resolve

```javascript
const { name } = await window.ethereum.request({
  method: "wallet_invokeSnap",
  params: {
    snapId: "npm:@dexignation/snap",
    request: {
      method: "reverseResolve",
      params: { address: userAddress },
    },
  },
});
```

---

## Graceful fallback

If the Snap isn't installed, fall back to the HTTP API:

Snap이 설치되지 않았으면 HTTP API로 fallback:

```typescript
async function resolveDexName(name: string) {
  try {
    return await window.ethereum.request({
      method: "wallet_invokeSnap",
      params: {
        snapId: "npm:@dexignation/snap",
        request: { method: "resolve", params: { name } },
      },
    });
  } catch {
    const res = await fetch(`https://api.dexignation.com/resolve/${name}`);
    if (!res.ok) return null;
    return res.json();
  }
}
```
