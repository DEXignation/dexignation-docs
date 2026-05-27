# DEXignation Development Journey

> From token-economy maximalism to a lean, audit-ready SaaS — and the
> Hardhat 3 dependency hell along the way.
>
> 토큰 경제 풀스택에서 audit 가능한 lean SaaS로, 그리고 그 과정에서
> 만난 Hardhat 3 의존성 지옥까지.

This document chronicles the pre-deployment hardening journey of
DEXignation's smart contracts. It covers three intertwined threads:
architectural decisions that shaped the final design, security fixes
that emerged from internal review, and the very real engineering pain
of getting Hardhat 3 + viem + mocha to cooperate.

이 문서는 DEXignation 스마트 컨트랙트의 배포 전 강화 여정을 기록한다.
세 가지 흐름이 얽혀 있다: 최종 설계를 형성한 아키텍처 결정, 내부 검토에서
나온 보안 수정, 그리고 Hardhat 3 + viem + mocha를 협력시키기 위한
엔지니어링 고통.

It exists so that future contributors, security auditors, and the
original author understand **why** the codebase looks the way it does
— not just **what** it does — and so other one-person teams hitting
the same dependency walls can find the path through.

미래의 기여자, 보안 audit firm, 원저자가 코드베이스가 **왜** 이런 모습인지
이해할 수 있도록, 그리고 같은 의존성 벽에 부딪힌 다른 1인 팀이 길을 찾을
수 있도록 작성되었다.

---

## Table of Contents / 목차

1. [Where we started / 출발점](#1-where-we-started--출발점)
2. [The architecture pivot / 아키텍처 전환](#2-the-architecture-pivot--아키텍처-전환)
3. [Security hardening pass / 보안 강화](#3-security-hardening-pass--보안-강화)
4. [Pre-deployment test additions / 배포 전 테스트 추가](#4-pre-deployment-test-additions--배포-전-테스트-추가)
5. [The Hardhat 3 dependency journey / Hardhat 3 의존성 여정](#5-the-hardhat-3-dependency-journey--hardhat-3-의존성-여정)
6. [Test runner conflicts / 테스트 러너 충돌](#6-test-runner-conflicts--테스트-러너-충돌)
7. [Test code adaptations / 테스트 코드 적응](#7-test-code-adaptations--테스트-코드-적응)
8. [The final state / 최종 상태](#8-the-final-state--최종-상태)
9. [Lessons for one-person teams / 1인 팀을 위한 교훈](#9-lessons-for-one-person-teams--1인-팀을-위한-교훈)

---

## 1. Where we started / 출발점

The initial codebase looked like a textbook web3 launch package:

초기 코드베이스는 교과서적인 web3 출시 패키지였다:

- **DXNToken** — ERC20Votes governance token with a hard cap (197 lines)
- **DXNStaking** — multi-asset reward staking with carry-over logic (386 lines)
- **RevenueDistributor** — protocol revenue splitter with atomic notify (203 lines)
- **DXContributionSBT** — soulbound NFT for contributor recognition (181 lines)
- Plus the actual name service: registry, registrar, controller, resolver, oracle

This is roughly what ENS, Uniswap, and most major protocols converge
on after several years. For a one-person team weeks away from launch,
it was over-built.

이는 ENS, Uniswap 등 대부분의 주요 프로토콜이 수 년 후 수렴하는 구조다.
출시 몇 주 앞둔 1인 팀에게는 과도하게 만들어진 상태였다.

The first internal review surfaced seven concrete security concerns:

첫 내부 검토에서 7가지 구체적 보안 우려가 드러났다:

1. **History-theft in staking** — a new staker could claim rewards
   that accrued before they joined, because `accRewardPerShare` was
   not settled on stake/unstake/claim.
   `accRewardPerShare`가 stake/unstake/claim 시 settle되지 않아
   새 staker가 가입 전 누적 보상을 가져갈 수 있는 버그.

2. **Notify-inflation in reward distribution** — the notifier's
   declared `amount` was trusted without measuring actual delta,
   so a malicious notifier could inflate the per-share accumulator.
   notifier의 명시 `amount`를 실제 delta 측정 없이 신뢰 → 악의적
   notifier가 per-share accumulator를 부풀릴 수 있음.

3. **Resolver-swap MEV** — commit-reveal hashed only
   `(name, owner, secret)`, so an attacker could front-run reveal
   with a different resolver, redirecting the new domain to their
   own address record.
   commit-reveal이 `(name, owner, secret)`만 해싱하여 attacker가
   다른 resolver로 front-run 가능 → 새 도메인이 공격자 address
   레코드를 가리키게 됨.

4. **Unicode label phishing** — `isValidLabel` accepted any UTF-8,
   so homoglyph attacks (`metаmask.dex` with Cyrillic 'а') were
   possible.
   `isValidLabel`이 임의 UTF-8 허용 → homoglyph 피싱 공격
   (키릴 'а'로 `metаmask.dex`) 가능.

5. **JSON/SVG injection in tokenURI** — labels flowed into metadata
   without escaping; quotation marks or angle brackets in labels
   would break the JSON and the rendered SVG.
   라벨이 escape 없이 metadata로 흘러 들어감 → 따옴표나 꺾쇠가
   포함된 라벨이 JSON과 SVG를 깨뜨림.

6. **Unbounded reward-asset growth** — `stake/unstake/claim`
   iterated all registered reward assets; without a cap, an
   attacker (or accident) adding many assets could brick the
   contract via out-of-gas.
   `stake/unstake/claim`이 모든 reward asset 순회 → 상한 없으면
   다수 추가 시 out-of-gas로 컨트랙트 마비.

7. **Carry-over for empty stake** — rewards arriving when
   `totalStaked == 0` were silently lost; nobody could ever claim
   them.
   `totalStaked == 0`일 때 도착한 보상이 조용히 손실됨 → 영구히
   미청구 상태.

All seven were fixed before the pivot. Then the pivot happened.

7개 모두 전환 전에 수정. 그리고 전환이 일어났다.

---

## 2. The architecture pivot / 아키텍처 전환

After fixing the bugs, a hard question surfaced: *do we actually need
any of this at launch?*

버그 수정 후 어려운 질문이 떠올랐다: **출시 시점에 정말 이게 필요한가?**

The honest answers:

정직한 답변들:

- **Token economy?** Tokenomics undecided. Issuing a token would
  trigger review under Korean 가상자산이용자보호법 and potentially
  자본시장법. ENS ran as a pure registrar from 2017 to 2021 — four
  years — before issuing the ENS token.
  토큰 경제? 토크노믹스 미확정. 토큰 발행은 가상자산이용자보호법과
  자본시장법 검토 대상. ENS는 2017–2021년 4년간 순수 registrar로
  운영 후에야 토큰 발행.

- **Staking?** Useless without a token to stake.
  스테이킹? stake할 토큰이 없으면 무의미.

- **Revenue distributor?** Useless without a holder community to
  distribute to.
  수익 분배기? 분배 받을 보유자 커뮤니티가 없으면 무의미.

- **Soulbound contributor NFT?** The original intent was for rewards
  to be monetisable (supplement to salary, not just attaboy). A
  non-transferable badge wasn't actually what was wanted.
  Soulbound 기여자 NFT? 원래 의도는 환금 가능한 보상(월급 보조)이었음.
  양도 불가 배지는 사실 원하던 것이 아니었음.

The pivot decision: **ship pure SaaS at v1.** Documented in ADR-001
through ADR-009. The deleted code's design rationale was preserved
in ADR-006 and ADR-007 so a future token launch wouldn't have to
re-derive the constraints (multi-asset rewards, Synthetix-style
accumulator, settle-on-mutation, balance-delta verification, asset
whitelist, carry-over, asset cap).

전환 결정: **v1은 순수 SaaS로 출시.** ADR-001~009에 기록. 삭제된 코드의
설계 근거는 ADR-006, ADR-007에 보존하여 향후 토큰 출시 시 제약을 재유도
할 필요가 없게 함 (다중 자산 보상, Synthetix-style accumulator,
settle-on-mutation, balance-delta 검증, asset whitelist, carry-over,
asset 상한).

The lines removed:

제거된 줄 수:

| Contract | Lines | Why removed |
|----------|-------|-------------|
| DXNToken | 197 | No token at v1 (ADR-001) |
| DXNStaking | 386 | No staking without token (ADR-001) |
| RevenueDistributor | 203 | Owner takes 100% via withdraw (ADR-008) |
| DXContributionSBT | 181 | Use .dex NFTs as rewards (ADR-002) |

| 컨트랙트 | 줄 수 | 제거 사유 |
|---------|------|----------|
| DXNToken | 197 | v1에 토큰 없음 (ADR-001) |
| DXNStaking | 386 | 토큰 없이는 스테이킹 무의미 (ADR-001) |
| RevenueDistributor | 203 | owner가 withdraw로 100% 수령 (ADR-008) |
| DXContributionSBT | 181 | .dex NFT를 보상으로 사용 (ADR-002) |

Total: ~1,000 lines of code (and the corresponding audit surface and
legal surface) removed before any external review even started.

총: 약 1,000줄의 코드 (그리고 그에 상응하는 audit 표면과 법적 표면)가
외부 검토 시작 전에 제거됨.

The remaining 17 production contracts (3,071 lines) all serve the
single purpose of the name service itself: register, renew, resolve,
reverse-resolve, price, reserve.

남은 17개 production 컨트랙트(3,071줄)는 모두 name service라는 단일
목적에만 봉사: register, renew, resolve, reverse-resolve, price, reserve.

### Generic discount API / 범용 할인 API

One naming change worth noting: the initial discount API was named
after a specific partner token (MOL, an existing project on BSC):

주목할 만한 명명 변경: 초기 할인 API는 특정 파트너 토큰(BSC의 기존
프로젝트 MOL) 이름이 박혀 있었음:

```solidity
function setMolDiscount(address _molToken, uint256 _threshold, uint256 _bps);
```

The discount logic itself is generic — "holder of token X with balance
≥ Y gets Z% off." Naming a generic mechanism after a specific instance
is a maintenance trap: in a year, if the partner changes (or a second
one is added), either the name lies or the API has to be split.

할인 로직 자체는 범용 — "토큰 X를 Y 이상 보유하면 Z% 할인." 범용
메커니즘을 특정 인스턴스 이름으로 명명하는 것은 유지보수 함정.

Renamed to `setDiscountToken(token, threshold, bps)`. Owner can now
point this at MOL, a future DXN, a partner DAO token, or anything
ERC-20-compatible without a code change (ADR-003).

`setDiscountToken(token, threshold, bps)`로 명명 변경. owner가 코드
변경 없이 MOL, 향후 DXN, 파트너 DAO 토큰 등 임의의 ERC-20에 가리킬 수
있음 (ADR-003).

### Strict ASCII labels / 엄격한 ASCII 라벨

The Unicode phishing concern was resolved by restricting labels to
ASCII lowercase (a-z, 0-9, hyphen) at launch (ADR-004). Korean Hangul,
Japanese, etc. are deferred to Phase 2 with proper UTS-46/ENSIP-15
normalisation.

Unicode 피싱 우려는 출시 시점에 라벨을 ASCII lowercase로 제한(a-z,
0-9, 하이픈)하여 해결 (ADR-004). 한글, 일본어 등은 적절한 UTS-46/
ENSIP-15 정규화와 함께 Phase 2로 연기.

This single restriction also closes the JSON/SVG injection vector by
construction — there is literally no character a label can contain
that would need escaping.

이 제한 하나로 JSON/SVG injection 벡터도 설계상 봉쇄됨 — 라벨이 가질
수 있는 문자 중 escape가 필요한 문자가 존재하지 않음.

---

## 3. Security hardening pass / 보안 강화

After the pivot, three further hardening changes were made:

전환 후 세 가지 강화 변경이 추가됨:

### Strict commitment binding (ADR-005) / Strict commitment binding

The original commit-reveal hash was the canonical ENS pattern:

원래 commit-reveal 해시는 표준 ENS 패턴:

```solidity
keccak256(abi.encode(name, owner, secret))
```

An MEV bot observing reveal could front-run with the same triple but a
different resolver, directing the new domain's address record to an
attacker-controlled contract while the NFT still landed with the
intended owner. The user might never notice — only the address that
`name.dex` resolves to is wrong, and the attacker can intercept any
payment sent to it.

reveal을 관찰한 MEV 봇이 같은 triple에 다른 resolver로 front-run 가능
→ NFT는 정상 owner에게 가지만 address 레코드는 공격자 컨트랙트를 가리킴.
사용자는 알아채지 못할 수도 있음 — `name.dex`가 resolve되는 주소만
잘못되어 있고 그곳으로 보내진 결제가 가로채임.

The fix: `makeCommitmentFull(label, owner, duration, resolver,
paymentToken, secret)` binds **every** register-time parameter into
the commitment hash. The legacy 3-arg form is preserved for ABI
compatibility but no longer accepted at register time.

수정: `makeCommitmentFull`이 register 시점의 **모든** 파라미터를
commitment 해시에 묶음. 레거시 3-인자 형식은 ABI 호환용으로 남기되
register 시 더 이상 허용 안 됨.

### Defensive balance-delta on ERC-20 receive (ADR-010) / ERC-20 수신 시 잔액-delta 방어

`registerWithToken` and `renewWithToken` accept any ERC-20 the owner
has allow-listed. The original code called `safeTransferFrom(payer →
controller, amount)` and trusted that the controller's balance
increased by exactly `amount`. This trust holds for USDC/USDT but
not for fee-on-transfer tokens.

`registerWithToken`과 `renewWithToken`은 owner가 허용한 임의 ERC-20을
받음. 원래 코드는 `safeTransferFrom`을 호출하고 잔액이 정확히 `amount`만큼
증가했다고 신뢰. USDC/USDT에는 성립하지만 fee-on-transfer 토큰에는 성립 안 함.

If an owner accidentally allow-lists a fee-on-transfer token:

owner가 실수로 fee-on-transfer 토큰을 허용하면:

- The user pays the declared amount (no fund loss for the user)
- The protocol receives `amount - fee` (silent revenue leak)
- Accounting drifts from reality

- 사용자는 명시 금액 결제 (사용자 자금 손실 없음)
- 프로토콜은 `amount - fee` 수령 (조용한 매출 누수)
- 회계가 현실에서 어긋남

The fix: `_safeReceiveExactly(token, payer, amount)` reads pre-balance,
calls `safeTransferFrom`, reads post-balance, and reverts with
`PaymentShortfall(token, expected, received)` if the delta is short.
~2,300 gas overhead, near-zero impact on normal tokens.

수정: `_safeReceiveExactly` 헬퍼가 pre/post 잔액을 읽고 delta가 부족하면
`PaymentShortfall`로 revert. 약 2,300 gas 추가 비용, 정상 토큰엔 거의
영향 없음.

### Owner-direct withdraw (ADR-008) / Owner 직접 withdraw

With `RevenueDistributor` removed, the controller's `withdraw()` no
longer needed to route through a configurable destination. Simplified
to direct transfer to `owner()`.

`RevenueDistributor` 제거 후 컨트롤러의 `withdraw()`가 설정 가능한
목적지로 라우팅할 필요 없어짐. `owner()`에게 직접 전송으로 단순화.

If a future version reintroduces a distributor, the owner can simply
withdraw to themselves and forward, or transfer ownership to the
distributor. Three forward-compatibility paths preserved.

향후 distributor가 재도입되면 owner가 직접 받아 전달하거나 ownership을
distributor로 이전 가능. 세 가지 forward-호환 경로 보존.

---

## 4. Pre-deployment test additions / 배포 전 테스트 추가

After the architectural and security work, four test suites were added
to verify the design under hostile conditions:

아키텍처와 보안 작업 후 4가지 테스트 스위트를 추가하여 적대적 조건 하의
설계를 검증:

### Invariants / 불변 조건

System-wide properties that must hold regardless of operation order:

작업 순서와 무관하게 유지되어야 하는 시스템 전역 성질:

1. NFT owner equals registry owner for every registered name
   모든 등록 도메인의 NFT owner = registry owner
2. Native balance equals sum collected minus sum withdrawn
   네이티브 잔액 = 누적 수금 - 누적 출금
3. Expiry is always in the future for newly registered names
   새로 등록된 도메인의 만료 시각 > 현재 시각
4. Discounted price never exceeds base price
   할인 적용 가격 ≤ 기본 가격
5. Discount basis points stored ≤ MAX_DISCOUNT_BPS (5000 = 50%)
   저장된 할인 bps ≤ MAX_DISCOUNT_BPS (5000 = 50%)
6. Re-registering an active name reverts
   활성 도메인 재등록은 revert

### Fuzz / 퍼지

Property-based random input testing using a seeded PRNG for
reproducibility:

재현 가능한 시드 PRNG로 속성 기반 랜덤 입력 테스트:

- 30 random valid ASCII labels all register successfully
  30개 랜덤 유효 ASCII 라벨 모두 정상 등록
- 14 random invalid labels (empty, too short, uppercase, leading/
  trailing hyphen, double hyphen, non-ASCII) all reject
  14개 랜덤 무효 라벨 모두 거부
- Discount calculation is monotonic in basis points (higher bps →
  equal-or-lower price)
  할인 계산이 bps에 단조 (높은 bps → 같거나 낮은 가격)

### MEV / MEV

Verifies commitment binding under attack scenarios:

공격 시나리오 하의 commitment binding 검증:

- Attacker cannot swap resolver in reveal
  공격자가 reveal 시 resolver 교체 불가
- Attacker cannot swap duration in reveal
  duration 교체 불가
- Attacker cannot swap owner in reveal
  owner 교체 불가
- Attacker cannot swap paymentToken in reveal
  paymentToken 교체 불가
- Legacy 3-arg commitment rejected at reveal
  레거시 3-인자 commitment는 reveal 시 거부
- Reveal before minCommitmentAge rejects
  minCommitmentAge 이전 reveal 거부
- First reveal wins on race condition for same label
  같은 라벨 race에서 먼저 reveal한 사람이 이김

### Hostile ERC-20 / 악성 ERC-20

Verifies behaviour against five classes of misbehaving tokens
(implemented in `contracts/mocks/MaliciousERC20.sol`):

다섯 가지 악성 토큰에 대한 동작 검증
(`contracts/mocks/MaliciousERC20.sol`에 구현):

- **FalseReturnERC20** — transfer returns false; SafeERC20 catches
  transfer가 false 반환; SafeERC20이 잡아냄
- **NoReturnERC20** — legacy USDT pre-2017 behaviour; SafeERC20 handles
  2017 이전 USDT 동작; SafeERC20이 처리
- **FeeOnTransferERC20** — charges fee; `_safeReceiveExactly` catches
  수수료 부과; `_safeReceiveExactly`가 잡아냄
- **LyingBalanceERC20** — reports fake balance in discount slot;
  documented as operational risk, not security flaw
  거짓 잔액 보고; 운영 위험으로 문서화, 보안 결함 아님
- **ReentrantERC20** — attempts reentry; `nonReentrant` modifier blocks
  재진입 시도; `nonReentrant` modifier가 차단

---

## 5. The Hardhat 3 dependency journey / Hardhat 3 의존성 여정

This is the section where things got genuinely painful. The code was
done, the architecture was clean, the tests were written — and then
running `npm install` for the first time turned into a multi-hour
exercise in peer-dependency archaeology.

여기서 진짜 고통스러워졌다. 코드는 완성, 아키텍처는 깔끔, 테스트도 작성
완료 — 그런데 첫 `npm install`이 peer-dependency 고고학 발굴 작업이 됨.

Hardhat 3 was released in late 2024. As of mid-2026 it is the
recommended version, but the ecosystem of plugins is still catching
up. Several official `@nomicfoundation` plugins exist as separate
packages that the meta-package `hardhat-toolbox-viem` requires as
*peer* dependencies, not regular dependencies. This means
`--legacy-peer-deps` (necessary for unrelated reasons) silently skips
installing them.

Hardhat 3는 2024년 말 출시. 2026년 중반 권장 버전이지만 plugin 생태계는
아직 따라잡는 중. 여러 공식 `@nomicfoundation` plugin이 `hardhat-toolbox-viem`
의 *peer* dependency로 존재 — regular dependency가 아니라. 그래서
`--legacy-peer-deps`(다른 이유로 필요)가 조용히 설치를 건너뜀.

### The cascade / 연쇄 반응

The errors appeared one at a time, each requiring a separate install:

에러가 한 번에 하나씩 나타나며 매번 별도 설치 요구:

```
Error 1: hardhat-verify@2.0.13 requires hardhat ^2.26.0
          (peer dependency conflict, since hardhat is at 3.6.0)
          → fix: npm install with --legacy-peer-deps --force

Error 2: Cannot find module '@nomicfoundation/hardhat-viem'
          → fix: npm install --save-dev @nomicfoundation/hardhat-viem

Error 3: Cannot find module '@nomicfoundation/hardhat-ignition-viem'
          → fix: explicit install

Error 4: HHE201 Plugin "hardhat-toolbox-viem" missing
         "@nomicfoundation/hardhat-keystore"
          → fix: explicit install

Error 5: HHE202 hardhat-network-helpers version 1.1.2 found,
         but ^3.0.0 expected
          → fix: install @latest

Error 6: HHE201 missing "@nomicfoundation/hardhat-node-test-runner"
          → fix: explicit install
```

The eventual one-shot command that prevents the cascade:

연쇄를 한 번에 막는 명령어:

```bash
npm install --save-dev --legacy-peer-deps \
  @nomicfoundation/hardhat-keystore@latest \
  @nomicfoundation/hardhat-network-helpers@latest \
  @nomicfoundation/hardhat-viem@latest \
  @nomicfoundation/hardhat-ignition-viem@latest \
  @nomicfoundation/hardhat-viem-assertions@latest \
  @nomicfoundation/hardhat-node-test-runner@latest \
  @nomicfoundation/hardhat-mocha@latest
```

If anyone reads this and is starting a Hardhat 3 + viem project, run
this first.

이 문서를 읽고 Hardhat 3 + viem 프로젝트를 시작하는 사람이 있다면,
이 명령부터 실행하라.

### One step further: the chai dependency / 한 발 더: chai 의존성

`@nomicfoundation/hardhat-mocha` requires `mocha` itself as a peer
dependency. Same install pattern:

`@nomicfoundation/hardhat-mocha`는 `mocha` 자체를 peer dependency로
요구. 같은 설치 패턴:

```bash
npm install --save-dev mocha @types/mocha chai@latest --legacy-peer-deps
```

### Config-file pitfalls / 설정 파일 함정

The Hardhat 3 config schema changed in two non-obvious ways:

Hardhat 3 설정 스키마가 비명확한 방식으로 두 가지 변경:

1. **Network type discriminator.** Every network entry now requires a
   `type` field with one of two values:
   네트워크 type 식별자. 모든 network 항목이 `type` 필드 필수
   ```typescript
   networks: {
     hardhat: {
       type: "edr-simulated",  // in-memory EVM (not "edr" — that was beta)
       chainType: "l1",
     },
     polygon: {
       type: "http",            // RPC connection
       chainType: "l1",
       url: ...,
     },
   }
   ```
   The beta name was `"edr"`; the GA release renamed it to
   `"edr-simulated"`. Documentation that pre-dates the GA still
   shows the beta name in places.
   베타 이름은 `"edr"`였고 GA에서 `"edr-simulated"`로 변경. GA 이전
   문서가 여전히 베타 이름을 보여주는 곳 있음.

2. **Test runner registration.** Just installing `hardhat-mocha`
   isn't enough; it must be added to the `plugins` array in the
   config, and `paths.tests.mocha` must point to the test directory:
   테스트 러너 등록. `hardhat-mocha` 설치만으로 부족. config의 `plugins`
   배열에 추가하고 `paths.tests.mocha`가 테스트 디렉토리를 가리켜야 함:
   ```typescript
   import HardhatMocha from "@nomicfoundation/hardhat-mocha";

   const config: HardhatUserConfig = {
     plugins: [HardhatToolboxViem, HardhatIgnition, HardhatMocha, HardhatVerify],
     paths: {
       tests: {
         mocha: "test",
       },
     },
     test: {
       mocha: {
         timeout: 60000,
       },
     } as any,
     // ...
   };
   ```
   The `as any` is needed because the Hardhat type definitions in the
   GA release don't yet expose all valid `test` options.
   `as any`가 필요한 이유: GA 릴리스의 Hardhat 타입 정의가 모든 유효
   `test` 옵션을 노출하지 않음.

---

## 6. Test runner conflicts / 테스트 러너 충돌

A subtler problem surfaced after the mocha plugin was wired up:

mocha plugin 연결 후 더 미묘한 문제가 떠올랐다:

```
Running Solidity tests
Running node:test tests           ← problem
   1) DXNamehash.test.ts
   2) DXRegistrarController.test.ts
   ...
ReferenceError: describe is not defined
```

Hardhat 3's official documentation explicitly states:

Hardhat 3 공식 문서가 명시:

> The Viem toolbox makes the **Node.js test runner** available for use
> in your Hardhat project... The Ethers toolbox makes the **Mocha test
> runner** available.

`hardhat-toolbox-viem` defaults to `node:test` (Node.js's builtin
runner, which uses a different API — `describe` from `node:test`
module, not a global). Our test files were written in mocha syntax.

`hardhat-toolbox-viem`은 `node:test`(Node.js 내장 runner, 다른 API
사용)가 기본. 우리 테스트 파일은 mocha 문법.

Two solutions exist; we chose the second:

두 해결책 존재; 우리는 두 번째 선택:

1. Convert all tests to `node:test` syntax (Hardhat 3 recommended)
   모든 테스트를 `node:test` 문법으로 변환 (Hardhat 3 권장)
2. Configure `paths.tests.mocha` to claim the test directory for mocha
   `paths.tests.mocha` 설정으로 mocha가 test 디렉토리 점유

Option 2 took less work and let the existing mocha-style tests run
unchanged. The trade-off: `node:test` and `mocha` runners can now
coexist if we ever want to add `node:test` files in a separate
directory.

옵션 2가 작업량 적고 기존 mocha 스타일 테스트 변경 없이 실행. 트레이드오프:
향후 `node:test` 파일을 별도 디렉토리에 추가하고 싶으면 두 runner가 공존 가능.

---

## 7. Test code adaptations / 테스트 코드 적응

Once mocha was running, six categories of test-level failures surfaced.
None of these were security issues in the production code — they were
mismatches between test assumptions and the viem/chai environment.

mocha 실행 후 6가지 카테고리의 테스트 수준 실패가 떠올랐다. 모두 production
코드의 보안 이슈가 아니라 테스트의 viem/chai 환경과의 불일치였음.

### A. `chai-as-promised` not installed / chai-as-promised 미설치

```typescript
await expect(promise).to.be.rejected;
//            ↑ chai에 .to.be.rejected가 없음
```

The `.to.be.rejected` matcher comes from `chai-as-promised`, not core
chai. Rather than add another dependency for one matcher, we defined
a small `expectRevert` helper used across all test files:

`.to.be.rejected` matcher는 `chai-as-promised`에서 옴, core chai 아님.
matcher 하나 위해 의존성 추가하는 대신 모든 테스트 파일에서 쓰는 작은
`expectRevert` 헬퍼 정의:

```typescript
async function expectRevert(
  promise: Promise<unknown>,
  keyword?: string,
): Promise<void> {
  try {
    await promise;
  } catch (err: unknown) {
    if (keyword) {
      expect(String(err)).to.include(keyword);
    }
    return;
  }
  throw new Error(
    keyword
      ? `Expected transaction/read to revert with ${keyword}`
      : "Expected transaction/read to revert",
  );
}
```

### B. viem's testClient is separate from publicClient / testClient 분리

```typescript
await publicClient.testClient.increaseTime(...);
//                 ↑ TypeError: testClient is undefined
```

viem's `testClient` (which exposes `increaseTime`, `mine`, etc.) is a
separate client, not a property of `publicClient`. Fix in each
`deploy()` helper:

viem의 `testClient`(`increaseTime`, `mine` 등 노출)는 별도 client,
`publicClient`의 property 아님. 각 `deploy()` 헬퍼에서 수정:

```typescript
async function deploy() {
  const { ignition, viem } = await network.connect();
  const deployed = await ignition.deploy(DXDeployLocal);
  const publicClient = await viem.getPublicClient();
  const testClient = await viem.getTestClient();   // ← separate
  return { ...deployed, publicClient, testClient };
}
```

### C. chai v4 doesn't support bigint in comparisons / bigint 비교 미지원

```typescript
expect(price).to.be.lessThanOrEqual(lastPrice);
//      ↑ AssertionError: expected ... to be a number or a date
```

chai v4's `lessThanOrEqual` matcher only supports `number` and `Date`.
Bigint comparison must be done directly:

chai v4의 `lessThanOrEqual`은 `number`와 `Date`만 지원. bigint는 직접
비교:

```typescript
expect(price <= lastPrice).to.equal(true,
  `Higher bps did not produce lower-or-equal price: ${lastPrice} → ${price}`);
```

### D. Label namespace collision / 라벨 이름 충돌

The Invariants test used `inv2_${i}` as a label prefix (short for
"invariant 2"). It happened to collide with the controller's internal
`registerInventoryNames` pre-reservation pattern. The fix was a
one-line rename to `balance${i}`, but the surface lesson is:

Invariants 테스트가 라벨 prefix로 `inv2_${i}` 사용 ("invariant 2"
약자). 우연히 컨트롤러 내부의 `registerInventoryNames` 사전 예약 패턴과
충돌. 수정은 `balance${i}`로 한 줄 변경, 표면적 교훈:

- Don't pick test labels that look like reserved-namespace prefixes
- The fact that the test failed *here* is good news: it means
  reservation enforcement works in practice
- Mock labels in tests should be obviously fictional (e.g. `test_alpha`,
  `mock_x`, prefixed with patterns that production users would never
  pick)

- 예약 namespace prefix처럼 보이는 라벨을 테스트에 사용 금지
- 이 위치에서 실패했다는 것은 좋은 소식 — 예약 강제가 실전에서 작동
- 테스트 mock 라벨은 명백히 가상이어야 함

### E. Viem instance reuse / viem 인스턴스 재사용

```typescript
const { controller } = await deploy();
const { viem } = await network.connect();    // ← second connect!
const otherToken = await viem.deployContract("MockERC20", ...);
expect(await controller.read.isDiscountEligible(...)).to.equal(true);
//                                                       ↑ revert
```

Calling `network.connect()` twice creates two viem instances. The
second one's contract deployments are on the same chain but the
controller's view function calls (through the first instance) can race
against the second instance's deployment.

`network.connect()` 두 번 호출 → 두 viem 인스턴스 생성. 두 번째 컨트랙트
배포는 같은 chain이지만 첫 번째 인스턴스를 통한 컨트롤러 view 호출이
두 번째 배포와 race 가능.

Fix: have `deploy()` return the `viem` reference so the same instance
is used throughout the test:

수정: `deploy()`가 `viem` 참조를 반환하여 테스트 전체에서 같은 인스턴스
사용:

```typescript
async function deploy() {
  const { ignition, viem } = await network.connect();
  // ...
  return { ...deployed, viem };
}

it("...", async function () {
  const { controller, viem } = await deploy();
  const otherToken = await viem.deployContract(...);  // same instance
});
```

### F. Test files with file-level structure errors / 파일 수준 구조 오류

One test file (HostileERC20.test.ts) had a missing closing bracket
that turned two top-level `describe` blocks into one nested describe.
esbuild reported it as "Unexpected end of file" — a misleading message
because the file looked complete to a human reader.

테스트 파일 하나(HostileERC20.test.ts)에 닫는 괄호 누락으로 두 최상위
`describe`가 하나의 중첩 describe로 변함. esbuild가 "Unexpected end of
file"로 보고 — 사람이 읽으면 파일이 완전해 보여 오해의 소지 있는 메시지.

The lesson: when esbuild complains about EOF in a structured TS/JS
file, look for unbalanced braces, not actual file truncation.

교훈: esbuild가 구조화된 TS/JS 파일에서 EOF 불평하면 실제 잘림이 아니라
괄호 불균형 의심.

---

## 8. The final state / 최종 상태

After everything, the test suite output is:

모든 과정 후 테스트 출력:

```
49 passing (23s)
 0 failing
```

Distribution:

분포:

| Suite | Tests | Purpose |
|-------|-------|---------|
| DXNamehash | 4 | EIP-137 compliance vs viem reference |
| DXRegistrarController | 3 | E2E registration flow with native payment |
| DXReservations | 9 | Owner-only label blocking with releasers |
| Fuzz | 3 | Random label/discount/bps testing |
| HolderDiscount | 11 | Full holder-discount feature |
| HostileERC20 | 6 | Defence against malicious ERC-20s |
| Invariants | 6 | System-wide invariant properties |
| MEV | 7 | Commit-reveal under attack scenarios |

| 스위트 | 테스트 | 목적 |
|-------|------|------|
| DXNamehash | 4 | viem 참조 구현 vs EIP-137 준수 |
| DXRegistrarController | 3 | 네이티브 결제 E2E 등록 플로우 |
| DXReservations | 9 | releaser 위임 가능한 owner 전용 라벨 차단 |
| Fuzz | 3 | 랜덤 라벨/할인/bps 테스트 |
| HolderDiscount | 11 | 보유자 할인 전체 기능 |
| HostileERC20 | 6 | 악성 ERC-20 방어 |
| Invariants | 6 | 시스템 전역 불변 속성 |
| MEV | 7 | 공격 시나리오 하의 commit-reveal |

Documents present:

문서:

- `docs/architecture.md` — every contract explained
  모든 컨트랙트 설명
- `docs/architecture-decisions.md` — 10 ADRs with rationale
  10개 ADR과 근거
- `docs/development-journey.md` — this document
  본 문서

Contract count:

컨트랙트 수:

- 17 production contracts (3,071 lines)
- 1 test-only mock (MaliciousERC20.sol)

- 17개 production 컨트랙트 (3,071줄)
- 1개 테스트 전용 mock

Audit-ready estimate: a 17-contract codebase with comprehensive ADRs
and 49-test coverage is small enough that a Code4rena contest or
Sherlock audit should run in the lower end of the price range (4–6
weeks, $30k–80k as of 2026). For a one-person SaaS at pre-revenue
stage, this is probably premature; the recommendation in our internal
review was to validate on Amoy testnet for 2–4 weeks first, then
revisit.

Audit 준비 추정: 17개 컨트랙트 + 포괄적 ADR + 49개 테스트 커버리지면
Code4rena contest나 Sherlock audit이 가격대 하한(4–6주, 2026년 기준
$30k–80k)에서 가능할 정도로 작음. 매출 전 1인 SaaS에는 시기상조일 가능성;
내부 검토 권고는 Amoy 테스트넷에서 2–4주 검증 후 재평가.

---

## 9. Lessons for one-person teams / 1인 팀을 위한 교훈

A few patterns surfaced repeatedly. They might generalise.

반복적으로 떠오른 패턴들. 일반화 가능할 수 있음.

### Subtraction is harder than addition, and more valuable / 빼기가 더하기보다 어렵고 더 가치 있다

Removing 1,000 lines of working code (token, staking, distributor,
SBT) felt scarier than writing them in the first place. Each deleted
contract was someone's (mine) hours of effort. But each removal also
deleted:

작동하는 1,000줄 코드(토큰, 스테이킹, distributor, SBT) 제거가 처음
작성하는 것보다 무서웠다. 삭제된 각 컨트랙트는 누군가(저자)의 수 시간
노력. 하지만 각 제거가 동시에 삭제한 것:

- ~200 lines of audit surface
- A category of legal risk (가상자산이용자보호법, 자본시장법)
- A category of operational complexity (token holders to communicate
  with, governance proposals to facilitate, price to watch)
- Future maintenance debt

- 약 200줄의 audit 표면
- 법적 위험 카테고리 하나 (가상자산이용자보호법, 자본시장법)
- 운영 복잡성 카테고리 하나 (소통할 토큰 보유자, 진행할 거버넌스 제안,
  지켜볼 가격)
- 향후 유지보수 부채

The trade was always worth it. The hard part was being honest about
what was actually needed at launch.

거래는 항상 가치 있었다. 어려운 부분은 출시 시점에 실제로 필요한 것이
무엇인지에 대한 정직함.

### ADRs are the antidote to amnesia / ADR은 망각의 해독제

A year from now, looking at this codebase, the question "why isn't
there a governance token?" will arise. Without ADR-001, the answer
might be "I don't remember." With ADR-001, the answer is four
specific reasons that an auditor or investor can evaluate.

1년 후 이 코드베이스를 보면 "왜 거버넌스 토큰이 없지?" 질문이 나올 것.
ADR-001 없으면 답은 "기억 안 남." ADR-001 있으면 답은 audit firm이나
투자자가 평가할 수 있는 네 가지 구체적 이유.

The 10 ADRs in `architecture-decisions.md` are deliberately written
to outlive the author's memory and to brief external parties (audit,
legal, investors) without a meeting.

`architecture-decisions.md`의 10개 ADR은 저자 기억보다 오래가도록, 그리고
미팅 없이 외부 당사자(audit, 법무, 투자자)에게 설명할 수 있도록 작성됨.

### Defence in depth pays for itself / 심층 방어는 자기 비용을 지불한다

The `_safeReceiveExactly` helper adds ~2,300 gas per ERC-20 payment.
On 100,000 lifetime registrations (a generous estimate for a niche
TLD), that's 230 million gas — at 30 gwei on Polygon, about $0.50
total. The protection it provides against operator misconfiguration
is unbounded.

`_safeReceiveExactly` 헬퍼는 ERC-20 결제당 약 2,300 gas 추가. 평생 10만
건 등록(틈새 TLD에 후한 추정) 시 2억 3천만 gas — Polygon 30 gwei에 약
$0.50 합계. 운영자 오설정에 대한 보호는 무한.

Same principle for strict commitment binding: a few extra hash inputs
defeat a class of MEV attacks. The cost is negligible, the worst-case
prevented harm is not.

엄격한 commitment binding도 동일 원칙: 추가 해시 입력 몇 개로 MEV 공격
한 부류 차단. 비용은 무시할 만하고 최악 시 방지된 피해는 그렇지 않음.

### The ecosystem will lie about its readiness / 생태계는 자신의 준비도에 대해 거짓말한다

Hardhat 3 was released. It was "ready." Plugins were listed as
"compatible." Then `npm install` produced six layers of dependency
errors over an evening of work.

Hardhat 3가 출시. "준비됨." plugin들이 "호환"으로 등재. 그런데
`npm install`이 저녁 한 번의 작업 동안 6단계의 의존성 오류를 만들어냄.

This is not a complaint about Hardhat — it's a working system and the
errors were specific and fixable. The lesson is: for any
recently-released major-version dependency, budget several hours of
"this should just work" turning into "let me read these error
messages carefully and check the changelogs."

이는 Hardhat 비판이 아님 — 작동하는 시스템이고 오류는 구체적이며 수정
가능. 교훈: 최근 출시된 메이저 버전 의존성에 대해서는 "그냥 작동해야 함"이
"이 오류 메시지를 신중히 읽고 changelog 확인"으로 변하는 데 수 시간
예산 책정.

For Hardhat 3 specifically, the one-shot install command in §5 above
saves the cascade. We've documented it so the next person doesn't
have to discover it the hard way.

Hardhat 3에 대해서는 §5의 한 방 설치 명령이 연쇄를 막음. 다음 사람이
힘들게 발견할 필요 없도록 문서화함.

### "Failing for the right reason" is a signal / "올바른 이유로 실패함"은 신호

The most satisfying test failure of the entire process was this one:

전체 과정에서 가장 만족스러운 테스트 실패:

```
Error: NameNotAvailable("inv2_0")
   at DXRegistrarController.registerInventoryNames
```

The test was failing because the controller's inventory reservation
system was correctly blocking a label that conflicted with the
reserved namespace. The fix was renaming the test label. But the
underlying behaviour — *the contract refused to register a label it
shouldn't* — was exactly correct.

테스트가 실패한 이유는 컨트롤러의 inventory 예약 시스템이 예약 namespace와
충돌하는 라벨을 올바르게 차단하기 때문. 수정은 테스트 라벨 이름 변경.
하지만 근본 동작 — *컨트랙트가 등록하면 안 되는 라벨을 거부* — 은 정확히
옳음.

Tests that fail for the right reason are good tests. Tests that pass
because the production code is silently doing the wrong thing are
worthless.

올바른 이유로 실패하는 테스트는 좋은 테스트. production 코드가 조용히
잘못된 일을 해서 통과하는 테스트는 가치 없음.

### Document the journey, not just the destination / 목적지가 아닌 여정을 기록하라

This document exists because the journey turned out to be more
valuable than the destination. The 17 contracts in their final form
are good. The 49-test suite is good. But the decisions about what
*not* to build, the bugs that *weren't* shipped, the dependency
puzzles that *were* solved — those are the actual content.

이 문서가 존재하는 이유: 여정이 목적지보다 가치 있는 것으로 드러나서.
최종 형태의 17개 컨트랙트는 좋음. 49개 테스트 스위트도 좋음. 하지만
*만들지 않기*로 한 결정, *출시되지 않은* 버그, *해결된* 의존성 퍼즐 —
그것들이 실제 컨텐츠.

If you're a one-person team facing a similar pre-deployment phase,
the technical answer is in the code. The strategic answer — about
when to subtract, when to defend, when to ship — is in the choices
that shaped the code.

비슷한 배포 전 단계를 마주한 1인 팀이라면, 기술적 답은 코드에 있음.
전략적 답 — 언제 빼고, 언제 방어하고, 언제 출시할지 — 은 코드를 형성한
선택에 있음.

Both deserve to be written down.

둘 다 기록될 가치가 있음.

---

## Related documents / 관련 문서

- [`architecture.md`](./architecture.md) — every contract explained in detail
- [`architecture-decisions.md`](./architecture-decisions.md) — 10 ADRs
- [`../README.md`](../README.md) — quickstart, contract addresses, license

- [`architecture.md`](./architecture.md) — 모든 컨트랙트 상세 설명
- [`architecture-decisions.md`](./architecture-decisions.md) — 10개 ADR
- [`../README.md`](../README.md) — 시작하기, 컨트랙트 주소, 라이선스
