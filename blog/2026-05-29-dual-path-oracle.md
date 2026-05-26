# attoUSD + Chainlink Dual-Path Oracle

*Part 5 of the DEXignation Series. Estimated read time: 8 min.*

> 한국어 본문은 각 섹션 아래 펼치기 영역에 있습니다.

---

A name service charges in USD but settles in volatile native tokens or
in multiple stablecoins with different decimals. That sounds simple
until you realise three things:

1. USD is not a thing on-chain. You need an oracle.
2. The oracle's output has its own decimals scale that's not 1e18.
3. Each payment token has its own decimals that also might not be 1e18.

Get any conversion wrong by a factor of 10 and your $5 name suddenly
costs $50 or $0.50.

This post explains how DEXignation handles the math. It also explains
why we built a **dual-path oracle** instead of relying on a single feed.

<details>
<summary>▸ 한국어로 보기</summary>

네임 서비스는 USD로 가격을 매기지만 변동성 있는 네이티브 토큰이나 서로
다른 decimals를 가진 여러 스테이블코인으로 정산합니다. 단순해 보이지만
세 가지를 깨닫는 순간 그렇지 않게 됩니다:

1. USD는 온체인에 존재하지 않습니다. 오라클이 필요합니다.
2. 오라클 출력은 자체 decimals 스케일을 가지며 1e18이 아닐 가능성이 있습니다.
3. 결제 토큰마다 decimals가 다르며 역시 1e18이 아닐 수 있습니다.

어떤 변환에서든 10배 실수하면 $5 이름이 갑자기 $50 또는 $0.50이 됩니다.

이번 편은 DEXignation이 그 수학을 어떻게 처리하는지 설명합니다. 그리고
단일 피드 대신 **dual-path 오라클**을 만든 이유도 함께.

</details>

---

## attoUSD: pretend USD has 18 decimals

DEXignation stores all USD prices in **attoUSD** (1 USD = `10^18`):

```solidity
price1Year  =  8 * 10**18;   //  $8
price3Year  = 18 * 10**18;   // $18
price5Year  = 25 * 10**18;   // $25
price10Year = 40 * 10**18;   // $40
```

Why 18 decimals? Because POL is 18 decimals, and most of our math at
the conversion step involves POL. Working in attoUSD means we never
*scale up*, only scale down to lower-decimals tokens. Scaling down with
ceiling division is safe and predictable.

The convention "name prices live in attoUSD" appears throughout the
codebase. The oracle returns `priceAttoUSD(duration)`. The token
converter multiplies, divides, and rounds.

<details>
<summary>▸ 한국어로 보기</summary>

## attoUSD: USD가 18 decimals라고 가정

DEXignation은 모든 USD 가격을 **attoUSD**($1 = `10^18`)로 저장합니다.

왜 18 decimals? POL이 18 decimals이고, 변환 단계의 수학 대부분이 POL을
포함하기 때문입니다. attoUSD로 작업하면 *키울* 일은 없고 더 낮은 decimals
토큰으로 *줄이는* 일만 있습니다. 올림 나눗셈으로 줄이는 건 안전하고
예측 가능합니다.

"이름 가격은 attoUSD에 산다"는 컨벤션이 코드베이스 전반에 등장합니다.
오라클이 `priceAttoUSD(duration)`을 반환. 토큰 변환기가 곱하고 나누고 반올림.

</details>

---

## Direct path: POL/USD

The Direct path uses one Chainlink aggregator that publishes POL/USD.

```solidity
function _attoUSDToWeiViaPolUsd(uint256 amount) internal view returns (uint256) {
  (uint256 polUsd, uint256 polUsdScale) = _readPrice(polUsdOracle);
  return (amount * polUsdScale) / polUsd;
}
```

The math: if `polUsd / polUsdScale = USD per POL`, then
`POL per USD = polUsdScale / polUsd`. To convert USD amount → POL
amount:

```
wei      attoUSD * polUsdScale
─── = ──────────────────────────
       polUsd  (per scale unit)
```

For $8 with POL at $0.40 and an aggregator reporting 8 decimals:

```
polUsd     = 40_000_000          (0.40 with 8 decimals)
polUsdScale = 100_000_000        (10^8)

wei = (8e18 * 1e8) / 4e7
    = 8e26 / 4e7
    = 2e19
    = 20 POL
```

8 USD ÷ 0.40 USD/POL = 20 POL. Check.

<details>
<summary>▸ 한국어로 보기</summary>

## Direct 경로: POL/USD

Direct 경로는 POL/USD를 발행하는 Chainlink aggregator 하나를 사용합니다.

수학: `polUsd / polUsdScale = POL당 USD`라면, `USD당 POL = polUsdScale / polUsd`.
USD 금액 → POL 금액 변환.

$0.40 POL 가격, aggregator가 8 decimals일 때 $8을 계산해보면 20 POL — 정답.

</details>

---

## ViaLink path: synthetic POL/USD from LINK pairs

Some chains don't have a direct POL/USD Chainlink feed, or the feed is
less liquid than we'd like. But Chainlink almost always publishes
LINK-anchored pairs: LINK/USD and LINK/(target asset).

We can synthesize POL/USD from these:

```
POL/USD = (LINK/USD) ÷ (LINK/POL)
```

Worked out in code:

```solidity
function _attoUSDToWeiViaLink(uint256 amount) internal view returns (uint256) {
  (uint256 linkPol, uint256 linkPolScale) = _readPrice(linkPolOracle);
  (uint256 linkUsd, uint256 linkUsdScale) = _readPrice(linkUsdOracle);

  return (amount * linkPol * linkUsdScale) / (linkUsd * linkPolScale);
}
```

Derivation:

```
POL/USD = (LINK/USD) / (LINK/POL)
        = (linkUsd / linkUsdScale) / (linkPol / linkPolScale)
        = (linkUsd * linkPolScale) / (linkPol * linkUsdScale)

wei = amount * (scale of POL/USD denominator) / (POL/USD numerator)
    = amount * (linkPol * linkUsdScale) / (linkUsd * linkPolScale)
```

Two oracle reads, more arithmetic, but the same product: wei of POL
that buys `amount` attoUSD worth.

### Trade-offs

| | Direct | ViaLink |
|---|---|---|
| Gas | Lower (1 read) | Higher (2 reads) |
| Trust assumptions | One feed, one heartbeat | Two feeds, two heartbeats |
| Network coverage | Requires POL/USD | Works wherever LINK pairs exist |
| Failure modes | Single point of failure | Either pair stale ⇒ revert |

The owner switches paths via:

```solidity
function setPriceSource(PriceSource _source) external onlyOwner {
  if (_source == PriceSource.Direct) {
    if (address(polUsdOracle) == address(0)) revert OracleNotConfigured();
  } else {
    if (address(linkPolOracle) == address(0) ||
        address(linkUsdOracle) == address(0))
      revert OracleNotConfigured();
  }
  priceSource = _source;
}
```

The check prevents switching to a path whose oracles haven't been set
up yet — a defensive measure against fat-finger configuration mistakes.

<details>
<summary>▸ 한국어로 보기</summary>

## ViaLink 경로: LINK 페어로 합성된 POL/USD

일부 체인에는 직접 POL/USD Chainlink 피드가 없거나 우리가 바라는 만큼
유동성이 충분하지 않습니다. 하지만 Chainlink는 거의 항상 LINK 기준 페어를
발행합니다: LINK/USD와 LINK/(타깃 자산).

이것들로 POL/USD를 합성할 수 있습니다.

오라클 read 두 번, 산수 더 많이, 같은 결과: `amount` attoUSD 가치만큼 사는
POL의 wei.

오너가 경로 전환 시 — 아직 설정 안 된 오라클로 전환하지 못하게 막습니다.
오타·실수 방지 방어선.

</details>

---

## Staleness guards

A bad oracle read is worse than no oracle read. Every aggregator pull
in `DXPriceOracle` is gated by:

```solidity
function _readPrice(AggregatorV3Interface oracle)
  internal view returns (uint256 priceVal, uint256 scale)
{
  (, int256 answer, , uint256 updatedAt, ) = oracle.latestRoundData();

  if (answer <= 0) revert InvalidOraclePrice();

  if (updatedAt == 0 || block.timestamp - updatedAt >= maxOracleDelay) {
    revert StaleOraclePrice();
  }

  priceVal = uint256(answer);
  scale = 10 ** uint256(oracle.decimals());
}
```

Three checks:

1. **Non-positive answer.** Chainlink occasionally returns 0 or a
   negative value during feed initialisation or anomaly recovery.
   We refuse these absolutely.

2. **`updatedAt == 0`.** This catches the "never updated" case.

3. **Stale `updatedAt`.** Our default `maxOracleDelay` is 26 hours.
   Most major Chainlink feeds have a 24-hour heartbeat — meaning if
   the price doesn't move >0.5%, they push an update once a day
   anyway. 26h gives 2h of grace if the heartbeat is late.

`maxOracleDelay` is configurable by the owner within `[1h, 48h]`.
We didn't want to allow zero (would always revert) or unbounded
(security risk).

```solidity
function setMaxoracleDelay(uint256 delay) external onlyOwner {
  if (delay < 1 hours || delay > 48 hours) revert InvalidOracleDelay();
  maxOracleDelay = delay;
}
```

<details>
<summary>▸ 한국어로 보기</summary>

## staleness 가드

나쁜 오라클 read는 read 안 하는 것보다 나쁩니다. `DXPriceOracle`의 모든
aggregator pull이 다음으로 게이팅됩니다 — 세 가지 검증:

1. **음수/0 응답.** Chainlink가 피드 초기화나 이상 회복 중에 0이나 음수를
   가끔 반환합니다. 절대 거부.

2. **`updatedAt == 0`.** "업데이트된 적 없음" 케이스 캐치.

3. **`updatedAt` 오래됨.** 기본 `maxOracleDelay`는 26시간. 메이저 Chainlink
   피드 대부분이 24시간 heartbeat — 가격이 >0.5% 이동하지 않아도 하루에 한
   번은 업데이트를 푸시합니다. 26h가 heartbeat가 늦었을 때 2h 여유를 줍니다.

`maxOracleDelay`는 오너가 `[1h, 48h]` 범위에서 설정 가능. 0(항상 revert)이나
무제한(보안 위험)을 허용하지 않습니다.

</details>

---

## Token conversion: ceiling division matters

Once we have a USD price, converting to USDT/USDC (6 decimals on
Polygon) is the second tricky math step:

```solidity
function rentPriceInToken(uint256 duration, address token) public view returns (uint256) {
  if (!allowedPaymentTokens[token]) revert TokenNotAllowed(token);
  uint8 d = IERC20Metadata(token).decimals();
  if (d > 18) revert UnsupportedTokenDecimals(d);

  uint256 attoUSD = priceOracle.priceAttoUSD(duration);
  uint256 scaleDown = 10 ** (18 - uint256(d));
  return (attoUSD + scaleDown - 1) / scaleDown;  // ceiling division
}
```

For $8 in USDC (6 decimals):

```
attoUSD   = 8_000_000_000_000_000_000  (8 * 10^18)
scaleDown = 1_000_000_000_000          (10^(18-6))
ceil(8e18 / 1e12) = 8_000_000          (8.000000 USDC)
```

For $25.0000001 (hypothetical fractional cent):

```
attoUSD   = 25_000_000_100_000_000_000
scaleDown = 1_000_000_000_000
ceil      = 25_000_001                 (25.000001 USDC — round UP by 1 micro-USDC)
```

That last micro-cent prevents the user from ever paying less than the
true USD price. The cost to the user: at most $0.000001 over per
transaction.

If we used floor division instead, an attacker could in principle
construct a price tier where they pay 1 wei less than the protocol
intended. Multiply across many registrations, and it becomes real
money. Ceiling division removes the incentive.

### Why reject `decimals > 18`?

If a token claims 22 decimals, our scaling logic would try `10**(18-22)`
which underflows in `uint256`. Reverting explicitly is cleaner than
allowing the call to fail at the underflow site, and there's no
real-world stablecoin with >18 decimals anyway.

<details>
<summary>▸ 한국어로 보기</summary>

## 토큰 변환: 올림 나눗셈이 중요

USD 가격이 있고, USDT/USDC(Polygon에서 6 decimals)로 변환할 때 — 두 번째
까다로운 수학 단계.

$8을 USDC로 → 8.000000 USDC. 가상의 $25.0000001 같은 분수 센트가 있다면
→ 25.000001 USDC(마이크로-USDC 1개 올림). 마지막 마이크로센트가 사용자가
진짜 USD 가격보다 적게 내지 못하게 막습니다. 사용자 비용: 트랜잭션당 최대
$0.000001 초과 지불.

floor 나눗셈을 썼다면 공격자가 원리상 프로토콜 의도보다 1 wei 적게 내는
가격 구간을 만들 수 있습니다. 많은 등록에 걸쳐 누적되면 실제 돈입니다.
올림이 그 인센티브를 없앱니다.

decimals > 18 거부 이유: 토큰이 22 decimals라고 주장하면 우리 스케일링이
`10**(18-22)`를 시도해서 `uint256`에서 언더플로우. 명시적 revert가 언더플로우
지점에서 호출이 실패하는 것보다 깔끔합니다. 어차피 실제 세계에 >18 decimals
스테이블코인은 없습니다.

</details>

---

## What we deliberately didn't do

Two things people ask about and we decided against.

**1. No TWAP smoothing.** Chainlink feeds are already aggregated across
many sources by Chainlink themselves. Adding our own time-weighted
average on top would only add latency and complexity. If Chainlink's
spot price moves, we accept the new price immediately.

**2. No "premium decay" on expiry.** ENS charges a steep but
exponentially-decaying premium for names that have just expired (to
discourage parking and to give a price-discovery mechanism for valuable
names). We chose fixed-tier pricing instead, prioritising
predictability over optimal market behaviour for a small fraction of
names. We may revisit this in a future version.

<details>
<summary>▸ 한국어로 보기</summary>

## 의도적으로 안 한 것

사람들이 묻고 우리가 안 하기로 한 두 가지.

**1. TWAP 평활화 없음.** Chainlink 피드는 이미 Chainlink가 여러 소스에서
집계합니다. 그 위에 자체 시간 가중 평균을 더하면 지연과 복잡성만 추가됩니다.
Chainlink 스팟 가격이 움직이면 새 가격을 즉시 받아들입니다.

**2. 만료 시 "premium decay" 없음.** ENS는 막 만료된 이름에 가파른 지수적
감쇠 premium을 매깁니다(파킹 억제, 가치 있는 이름의 가격 발견 메커니즘).
우리는 작은 비율의 이름에 대한 최적 시장 행동보다 예측 가능성을 우선해
고정 구간 가격을 선택. 미래 버전에서 재고할 수 있습니다.

</details>

---

*Previous: [Part 4 — Commit-Reveal](./04-commit-reveal.md)*
*Next: [Part 6 — Multi-Chain Resolution via ENSIP-11](./06-multichain-resolution.md)*
