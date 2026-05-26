---
sidebar_position: 5
title: Price Oracle
---

# DXPriceOracle

Converts attoUSD rent prices into wei of the native asset (POL), with
two selectable Chainlink paths.

attoUSD 가격을 네이티브 자산(POL) wei로 변환. 두 가지 Chainlink 경로 선택.

See [Concepts → Dual-Path Price Oracle](../concepts/dual-path-oracle)
for the rationale and math.

배경과 수학은 [Concepts → Dual-Path Price Oracle](../concepts/dual-path-oracle) 참고.

---

## Owner-only configuration

```solidity
function setPolUsdOracle(address _polUsdOracle) external onlyOwner;
function setLinkPolOracle(address _linkPolOracle, address _linkUsdOracle) external onlyOwner;
function setPriceSource(PriceSource _source) external onlyOwner;
function setMaxoracleDelay(uint256 delay) external onlyOwner;
```

Each setter is `onlyOwner` and validates that the corresponding feeds
are configured before allowing a switch.

각 setter는 `onlyOwner`이며 전환 전에 해당 피드가 설정됐는지 검증.

---

## Allowed durations

The oracle only accepts four fixed durations:

오라클은 4개 고정 기간만 허용:

```solidity
DURATION_1Y  = 365 days
DURATION_3Y  = 3 * 365 days
DURATION_5Y  = 5 * 365 days
DURATION_10Y = 10 * 365 days
```

Anything else reverts with `InvalidDuration`.

다른 값은 `InvalidDuration`으로 revert.

---

## Source / 소스

[`contracts/oracle/DXPriceOracle.sol`](https://github.com/DEXignation/dexignation-contracts/blob/main/contracts/oracle/DXPriceOracle.sol)
