# Why DEXignation: Names for Polygon

*Part 1 of the DEXignation Series. Estimated read time: 8 min.*

---

> 이 글은 한국어와 영어를 함께 제공합니다. 각 섹션 끝의 ▸ 펼치기 부분에
> 한국어 본문이 있습니다.

---

I have a personal rule when I'm shipping a payment app: **never make the
user copy and paste a 42-character hex string.** Every time you do, a few
percent of users abandon. Of the ones who don't, a few percent will make
a typo. Of the ones who don't typo, a few percent will paste the address
from a clipboard hijacker.

This is a UX problem dressed as a cryptography problem.

`0x71C7656EC7ab88b098defB751B7401B5f6d8976F` is technically a perfect
identifier. It is globally unique, mathematically derived, and impossible
to forge. It is also unusable, and that's what we're going to fix.

DEXignation is a Polygon-native name service. It maps human-readable
names like `alice.dex` to addresses. Each name is an ERC-721 NFT, owned
by the user, paid for in USDC or POL, valid for a fixed term. The
mapping lives entirely on-chain.

This series tells the story of how DEXignation is built, what we
borrowed from ENS, and what we changed.

This first post answers the prior question: **why build this at all,
when ENS exists?**

<details>
<summary>▸ 한국어로 보기</summary>

결제 앱을 만들 때 제가 지키는 원칙이 하나 있습니다. **사용자에게 42자
16진수 문자열을 복사·붙여넣기 시키지 말 것.** 그렇게 만드는 순간 사용자의
몇 %는 이탈하고, 남은 사용자 중 몇 %는 오타를 내고, 또 남은 사용자 중
몇 %는 클립보드 하이재커에 당합니다.

이건 암호학 문제처럼 보이는 UX 문제입니다.

`0x71C7656EC7ab88b098defB751B7401B5f6d8976F`는 기술적으로 완벽한
식별자입니다. 전역적으로 유일하고, 수학적으로 도출되고, 위조 불가능합니다.
그리고 사용 불가능하기도 합니다. 그 부분을 고치자는 것이 이 시리즈의
주제입니다.

DEXignation은 Polygon 네이티브 네임 서비스입니다. `alice.dex` 같은 사람이
읽을 수 있는 이름을 주소에 매핑합니다. 각 이름은 사용자가 보유하는
ERC-721 NFT이며, USDC 또는 POL로 결제하고, 고정 기간 동안 유효합니다.
매핑은 전부 온체인에 있습니다.

이번 시리즈는 DEXignation을 어떻게 만들었고, ENS에서 무엇을 차용했고,
무엇을 바꿨는지 풀어냅니다. 1편은 그 이전 질문에 답합니다.
**ENS가 있는데 왜 이걸 만드는가?**

</details>

---

## ENS is excellent. So why a new project?

[The Ethereum Name Service](https://ens.domains) is one of the cleanest
pieces of infrastructure in the Ethereum ecosystem. It's been live since
2017, it's been audited multiple times, and it powers `.eth` resolution
in basically every major wallet. We are deeply grateful for ENS's
existence and for the team's decision to release the contracts under MIT.

Three things, however, make a Polygon-native alternative valuable.

### 1. Registration cost

ENS registration on Ethereum L1 costs roughly **$5 in protocol fees plus
$20–$80 in gas** on a busy day. For a $5 name, paying $50 in gas is
absurd. For a $50 enterprise name, it's tolerable. For Korea, where most
of our early users are paying in KRW-denominated stablecoins, the gas
floor alone is a UX problem.

On Polygon, the same registration costs roughly **$5 in protocol fees
plus $0.01–$0.05 in gas.** That difference is enough to change *who*
registers a name. Not just power users — regular Polygon users
registering one name for their main wallet.

### 2. Stablecoin payments as first-class

ENS prices are USD-denominated but settled in ETH. You pay ETH for an
ETH name. Even on Polygon there's a tradition of paying in the native
asset (MATIC, now POL) for protocol fees.

A name registration is the kind of transaction where price stability
matters. You're not trading; you're paying for a service. The price
should be the price.

DEXignation supports stablecoin payment as a first-class flow. The
controller has `registerWithToken()` and `renewWithToken()` next to
`register()` and `renew()`. We maintain an allow-list of payment tokens
(starting with USDT and USDC on Polygon), and we use ceiling division
when converting USD prices to token decimals so the user never underpays
by a wei.

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

### 3. Network reach

This is the most important one. Most blockchain users *aren't* on
Ethereum L1. They're on Polygon, BNB Chain, Arbitrum, Base, or one of a
dozen specialised chains. An L1-only naming system asks them to bridge
back to a chain they don't use, pay a fee they don't want to pay, for a
name they want to use somewhere else.

The right answer isn't "force them to L1." The right answer is
"meet them where they are." DEXignation is on Polygon now. The
architecture (in particular, the dual-path oracle we'll cover in Part 5)
is designed so that the same protocol can deploy onto any EVM chain.

<details>
<summary>▸ 한국어로 보기</summary>

## ENS는 훌륭합니다. 그런데 왜 새로 만드는가?

[Ethereum Name Service](https://ens.domains)는 Ethereum 생태계에서 가장
깔끔한 인프라 중 하나입니다. 2017년부터 가동 중이고, 여러 차례 감사를
받았고, 거의 모든 메이저 지갑에서 `.eth` 해결을 담당합니다. ENS의 존재와
ENS 팀이 컨트랙트를 MIT로 공개해준 결정에 깊이 감사드립니다.

다만 세 가지 이유로 Polygon 네이티브 대안이 가치 있다고 봅니다.

### 1. 등록 비용

ENS 메인넷 등록은 혼잡한 날 **프로토콜 수수료 $5 + 가스 $20~$80** 정도
듭니다. $5짜리 이름에 $50 가스를 쓰는 건 말이 안 됩니다. $50짜리 엔터프라이즈
이름이라면 견딜 만하지만요. KRW 기반 스테이블코인을 쓰는 한국 초기 유저
입장에서는 가스 바닥값만으로도 UX 문제입니다.

Polygon에서는 동일한 등록이 **프로토콜 수수료 $5 + 가스 $0.01~$0.05** 입니다.
이 차이는 *누가* 이름을 등록하는지를 바꿉니다. 파워 유저뿐 아니라 본인
메인 지갑 하나를 위해 이름을 등록하는 일반 Polygon 유저까지 포함됩니다.

### 2. 스테이블코인 결제 1급화

ENS 가격은 USD 기준이지만 결제는 ETH로 합니다. ETH 이름값을 ETH로 냅니다.
Polygon 위에서도 프로토콜 수수료는 네이티브 자산(MATIC, 현재 POL)으로 내는
전통이 있습니다.

이름 등록은 가격 안정성이 중요한 트랜잭션입니다. 트레이드가 아니라
서비스에 비용을 내는 것이니까요. 가격이 가격대로여야 합니다.

DEXignation은 스테이블코인 결제를 1급 흐름으로 지원합니다. 컨트롤러에
`register()`/`renew()`와 나란히 `registerWithToken()`/`renewWithToken()`이
있습니다. 결제 토큰 화이트리스트(Polygon의 USDT/USDC로 시작)를 두고,
USD 가격을 토큰 decimals로 변환할 때 **올림 나눗셈**을 써서 1 wei도
부족 결제되지 않도록 합니다.

### 3. 네트워크 도달 범위

이게 가장 중요합니다. 대부분의 블록체인 사용자는 Ethereum L1에 있지
*않습니다*. Polygon, BNB Chain, Arbitrum, Base 등 다양한 체인에 흩어져
있습니다. L1 전용 네이밍 시스템은 그들에게 안 쓰는 체인으로 브릿지하고,
내고 싶지 않은 가스비를 내고, 다른 곳에서 쓸 이름을 사라고 요구합니다.

정답은 "L1으로 끌어오라"가 아닙니다. "그들이 있는 곳으로 가라"입니다.
DEXignation은 지금은 Polygon에 있지만, 아키텍처(특히 5편에서 다룰
dual-path 오라클)는 동일한 프로토콜이 어떤 EVM 체인에든 배포될 수 있도록
설계되었습니다.

</details>

---

## What we kept from ENS

Let me be precise about this, because it matters for trust.

DEXignation is **built directly on the architectural patterns and
reference implementation of ENS**. The split into Registry, Registrar,
Resolver, Reverse Registrar, and Registrar Controller is ENS's design.
The commit-reveal pattern is ENS's. The namehash algorithm is the
EIP-137 standard ENS authored. The coin-type encoding is ENSIP-11, again
authored by ENS.

We did not invent any of those. We copied them with appreciation, kept
the MIT-license attribution, and listed every derived file in our
[`THIRD-PARTY-LICENSES.md`](https://github.com/DEXignation/dexignation-contracts/blob/main/THIRD-PARTY-LICENSES.md).

If you want a one-line summary of DEXignation's relationship to ENS:
**ENS-architecture, Polygon-economics, on-chain-art, no-cosmetic-bridges.**

<details>
<summary>▸ 한국어로 보기</summary>

## ENS에서 차용한 것들

이 부분은 신뢰와 직결되어서 정확히 짚고 가겠습니다.

DEXignation은 **ENS의 아키텍처 패턴과 참조 구현 위에 직접적으로 빌드**되었습니다.
Registry, Registrar, Resolver, Reverse Registrar, Registrar Controller로
나누는 구조는 ENS의 설계입니다. commit-reveal 패턴도 ENS의 것입니다.
namehash 알고리즘은 ENS가 작성한 EIP-137 표준입니다. coin-type 인코딩은
다시 ENS가 작성한 ENSIP-11입니다.

이중 어느 것도 우리가 발명한 것이 아닙니다. 감사하는 마음으로 차용했고,
MIT 라이선스 출처 표기를 유지했고, 파생된 모든 파일을
[`THIRD-PARTY-LICENSES.md`](https://github.com/DEXignation/dexignation-contracts/blob/main/THIRD-PARTY-LICENSES.md)에
명시했습니다.

DEXignation과 ENS의 관계를 한 줄로 요약하면:
**ENS 아키텍처, Polygon 경제, 온체인 아트, 군더더기 브릿지 없음.**

</details>

---

## What we changed

Five concrete changes.

**1. Fixed-tier pricing.** ENS prices per second, with a high "premium"
that decays exponentially after a name expires (encouraging quick
re-registration). DEXignation prices in four tiers — 1, 3, 5, or 10
years, with bulk discounts. This is simpler to communicate and simpler
to compute.

**2. ERC-20 stablecoin payments.** Already covered above. The user
chooses POL, USDT, or USDC at the call site.

**3. Dual-path oracle.** On Polygon, the standard POL/USD Chainlink feed
works fine. But the same code will eventually run on chains without a
direct USD feed for the native asset. So `DXPriceOracle` supports two
paths:

```
Path A (Direct):   POL/USD → wei
Path B (ViaLink):  LINK/USD ÷ LINK/POL → POL/USD → wei
```

The owner chooses which one via `setPriceSource()`. This is Part 5
material.

**4. Atomic resolver wiring.** ENS leaves the resolver and the initial
address record to a *separate* transaction after registration. So your
freshly minted `alice.eth` doesn't actually resolve to your address
until you send a second transaction. That's a confusing experience.

DEXignation does it in one transaction: the controller takes temporary
ownership of the subnode, writes the resolver and the initial Polygon
address record, then transfers everything to the real owner. Result:
the name resolves the moment the registration is confirmed.

**5. Fully on-chain `tokenURI`.** ENS uses an off-chain metadata service.
DEXignation generates the SVG inside the contract and Base64-encodes it
into a `data:` URI. No CDN to rug, no IPFS pin to forget.

```solidity
function tokenURI(uint256 tokenId) public view override returns (string memory) {
  _requireOwned(tokenId);
  string memory label = names[tokenId];
  if (bytes(label).length == 0) label = "?";
  string memory dotTld = string.concat(".", baseNodeName);
  string memory svg = _generateSVG(label, dotTld);
  string memory json = string.concat(
    '{"name":"', label, dotTld, '",',
    '"description":"DEXignation Name: ', label, dotTld, '",',
    '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '"}'
  );
  return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
}
```

We'll spend all of Part 3 on this.

<details>
<summary>▸ 한국어로 보기</summary>

## 우리가 바꾼 것들

다섯 가지 구체적 변경.

**1. 고정 구간 가격.** ENS는 초당 가격을 매기고, 이름 만료 후에는 지수적으로
감소하는 높은 "premium"으로 빠른 재등록을 유도합니다. DEXignation은 4구간
(1/3/5/10년)에 벌크 할인. 설명하기 쉽고, 계산하기 쉽습니다.

**2. ERC-20 스테이블코인 결제.** 위에서 다뤘습니다. 호출 시점에 POL, USDT,
USDC 중 선택.

**3. dual-path 오라클.** Polygon에서는 표준 POL/USD Chainlink 피드면 충분합니다.
하지만 같은 코드가 결국 네이티브 자산에 대한 직접 USD 피드가 없는 체인에서도
돌아가야 합니다. 그래서 `DXPriceOracle`은 두 경로를 지원:

```
경로 A (Direct):   POL/USD → wei
경로 B (ViaLink):  LINK/USD ÷ LINK/POL → POL/USD → wei
```

오너가 `setPriceSource()`로 선택. 5편 소재입니다.

**4. 리졸버 원자적 설정.** ENS는 등록 후 *별도* 트랜잭션으로 리졸버와 초기
주소 레코드를 설정합니다. 즉 갓 발급된 `alice.eth`가 두 번째 트랜잭션 전까지
실제로 본인 주소로 해결되지 않습니다. 혼란스러운 경험입니다.

DEXignation은 한 트랜잭션에서 처리합니다. 컨트롤러가 서브노드 임시 소유권을
잡고, 리졸버와 초기 Polygon 주소 레코드를 기록한 뒤, 모든 것을 실제 소유자에게
이전. 결과: 등록이 컨펌되는 순간 이름이 해결됩니다.

**5. 완전 온체인 `tokenURI`.** ENS는 오프체인 메타데이터 서비스를 사용합니다.
DEXignation은 컨트랙트 내부에서 SVG를 생성하고 Base64로 인코딩해 `data:`
URI로 만듭니다. 러그될 CDN도, 잊어버릴 IPFS pin도 없습니다.

이건 3편 전체에서 다룹니다.

</details>

---

## What "Polygon-first" actually means in code

The hardest part of being "Polygon-first" isn't writing Solidity. It's
making product decisions that align with where Polygon users actually
are.

Some examples:

- **The default coin-type at registration is Polygon, not Ethereum.**
  When the controller atomically wires the initial address record, it
  writes it under `COIN_TYPE_DEFAULT | 137`. A user can add Ethereum,
  BNB, or Bitcoin records later. But the *default* is the chain the
  user is on.

- **The TLD is `.dex`, not `.poly` or `.matic`.** We don't tie the brand
  to a single chain's marketing name. Polygon has rebranded its asset
  before; it may again. The name service shouldn't have to rebrand.

- **Stablecoins, not "wrapped USD".** Polygon already has high-liquidity
  native-ish USDT and USDC. We support those directly, with `SafeERC20`
  to handle USDT's non-standard return-value behaviour.

- **Korean users get UTF-8 character counting.** `StringUtils.strlen()`
  is multi-byte aware, so a 3-character Korean label like `김로이` is
  valid, not "9 bytes, too short."

```solidity
// Multi-byte aware: counts codepoints, not bytes.
function strlen(string calldata s) internal pure returns (uint256) {
  uint256 len;
  uint256 i = 0;
  uint256 bytelength = bytes(s).length;
  for (len = 0; i < bytelength; len++) {
    bytes1 b = bytes(s)[i];
    if (b < 0x80)      i += 1;
    else if (b < 0xE0) i += 2;
    else if (b < 0xF0) i += 3;
    else if (b < 0xF8) i += 4;
    else if (b < 0xFC) i += 5;
    else               i += 6;
  }
  return len;
}
```

<details>
<summary>▸ 한국어로 보기</summary>

## "Polygon-first"가 코드에서 실제로 의미하는 것

"Polygon-first"의 어려운 부분은 Solidity 작성이 아닙니다. Polygon 유저가
실제로 어디에 있는지에 맞춘 제품 결정입니다.

몇 가지 예시:

- **등록 시 기본 coin-type이 Ethereum이 아니라 Polygon입니다.** 컨트롤러가
  초기 주소 레코드를 원자적으로 기록할 때 `COIN_TYPE_DEFAULT | 137`로 씁니다.
  사용자가 나중에 Ethereum, BNB, Bitcoin 레코드를 추가할 수 있지만,
  *기본값*은 사용자가 있는 체인입니다.

- **TLD가 `.poly`나 `.matic`이 아니라 `.dex`.** 브랜드를 특정 체인의
  마케팅 이름에 묶지 않습니다. Polygon은 이전에 자산명을 바꿨고, 또 바꿀 수
  있습니다. 네임 서비스가 따라서 리브랜드할 필요는 없죠.

- **"wrapped USD"가 아니라 스테이블코인.** Polygon에는 이미 유동성 높은
  네이티브-ish USDT/USDC가 있습니다. `SafeERC20`로 USDT의 비표준 반환값
  동작까지 처리하면서 직접 지원합니다.

- **한국 유저는 UTF-8 문자 카운팅 적용.** `StringUtils.strlen()`이 멀티바이트
  인식이라 `김로이` 같은 3글자 한글 라벨도 유효합니다. "9바이트라 너무 짧음"
  같은 일이 안 일어납니다.

</details>

---

## What comes next in this series

- **Part 2 — EIP-137 `namehash`, Explained Simply.** We'll walk through
  the algorithm, look at the right-to-left scanning implementation in
  `DXNamehash.sol`, and explain why hashing labels separately matters.

- **Part 3 — An ERC-721 with Fully On-Chain SVG.** The `tokenURI`
  function from above gets a full breakdown, including the Base64
  double-encoding dance.

- **Part 4 — Stopping Front-Running with Commit-Reveal.** Why this
  pattern exists, what it costs, and how it interacts with stablecoin
  payment.

- **Part 5 — attoUSD + Chainlink Dual-Path Oracle.** The math of
  ceiling-division decimals conversion and the algebra of the
  ViaLink path.

- **Part 6 — Multi-Chain Resolution via ENSIP-11.** How one `.dex` name
  can resolve to addresses on four different blockchains.

<details>
<summary>▸ 한국어로 보기</summary>

## 시리즈 다음 편

- **2편 — EIP-137 `namehash`, 쉽게 풀이.** 알고리즘을 차근차근, `DXNamehash.sol`의
  우→좌 스캐닝 구현을 살펴보고, 라벨을 따로 해싱하는 이유를 설명합니다.

- **3편 — 완전 온체인 SVG를 가진 ERC-721.** 위의 `tokenURI` 함수를 Base64
  이중 인코딩까지 모두 분해해서 봅니다.

- **4편 — commit-reveal로 프론트러닝 막기.** 이 패턴이 존재하는 이유, 비용,
  스테이블코인 결제와의 상호작용.

- **5편 — attoUSD + Chainlink dual-path 오라클.** 올림 나눗셈 decimals 변환의
  수학과 ViaLink 경로의 대수.

- **6편 — ENSIP-11로 멀티체인 해결.** 하나의 `.dex` 이름이 어떻게 4개 체인의
  주소로 해결되는지.

</details>

---

## Credits & disclosure / 크레딧과 고지

DEXignation builds directly on the
[ENS contracts](https://github.com/ensdomains/ens-contracts) by Nick
Johnson and ENS Labs, licensed under MIT. Full attribution is in
[`THIRD-PARTY-LICENSES.md`](https://github.com/DEXignation/dexignation-contracts/blob/main/THIRD-PARTY-LICENSES.md).

DEXignation is **not yet audited**. Do not deposit significant value
until at least one independent audit has been published. See
[`SECURITY.md`](https://github.com/DEXignation/dexignation-contracts/blob/main/SECURITY.md)
for our disclosure policy.

The full contracts repository is at:
`https://github.com/DEXignation/dexignation-contracts`.

The project lives at **https://dexignation.com**, and the broader code
organisation is at **https://github.com/DEXignation** — including the
companion `dexignation-api` backend, `dexignation-snap` MetaMask
integration, and `dexignation-docs` documentation site.

DEXignation은 Nick Johnson과 ENS Labs의
[ENS contracts](https://github.com/ensdomains/ens-contracts) (MIT) 위에
직접 빌드되었습니다. 전체 출처 표기는
[`THIRD-PARTY-LICENSES.md`](https://github.com/DEXignation/dexignation-contracts/blob/main/THIRD-PARTY-LICENSES.md).

DEXignation은 **아직 감사받지 않았습니다.** 최소 1회 이상의 독립 감사가
공개될 때까지 큰 가치를 예치하지 마십시오.

전체 컨트랙트 저장소:
`https://github.com/DEXignation/dexignation-contracts`.

프로젝트 공식 사이트는 **https://dexignation.com**, 더 넓은 코드 조직은
**https://github.com/DEXignation** — 동반 저장소로 백엔드(`dexignation-api`),
MetaMask 통합(`dexignation-snap`), 문서 사이트(`dexignation-docs`)가 있습니다.

---

*Next: [Part 2 — EIP-137 `namehash`, Explained Simply](./02-namehash-explained.md)*
