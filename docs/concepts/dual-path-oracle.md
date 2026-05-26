---
sidebar_position: 4
title: Dual-Path Price Oracle
---

# Dual-Path Price Oracle

Names are priced in USD but settled in POL or stablecoins. The
`DXPriceOracle` converts attoUSD → wei via Chainlink, with **two
selectable conversion paths** for cross-network portability.

이름은 USD로 가격을 매기되 POL 또는 스테이블코인으로 결제. `DXPriceOracle`이
**dual-path** Chainlink 변환을 수행합니다.

---

## Path A — Direct (POL/USD)

```
wei = attoUSD × 10^d / answer
```

Where `answer / 10^d = USD per POL` from a Chainlink POL/USD aggregator.
One read, lowest gas.

POL/USD 직접 피드 read 1회, 최저 가스.

---

## Path B — ViaLink (LINK/USD ÷ LINK/POL)

```
                   attoUSD × (LINK/POL) × 10^(LINK/USD decimals)
wei = ──────────────────────────────────────────────────────────
              (LINK/USD) × 10^(LINK/POL decimals)
```

Derived from `POL/USD = (LINK/USD) / (LINK/POL)`. Two reads, but works
on networks without a direct POL/USD feed.

직접 POL/USD 피드가 없는 네트워크에서도 동작.

---

## Staleness guards

Every aggregator pull enforces:

오라클 read마다 강제:

- `answer > 0`
- `block.timestamp - updatedAt < maxOracleDelay` (default 26h)

---

## attoUSD scale

Prices are stored in **attoUSD** (1 USD = `10^18`):

```solidity
price1Year  =  8e18;   //  $8
price3Year  = 18e18;   // $18
price5Year  = 25e18;   // $25
price10Year = 40e18;   // $40
```

Token conversion uses **ceiling division** to ensure no underpayment.

토큰 변환은 **올림 나눗셈**으로 부족 결제 방지.

---

## Full deep-dive

→ [Blog: attoUSD + Chainlink dual-path oracle](/blog/dual-path-oracle)
