# Multi-Chain Resolution via ENSIP-11

*Part 6 of the DEXignation Series. Estimated read time: 7 min.*

> 한국어 본문은 각 섹션 아래 펼치기 영역에 있습니다.

---

When you register `alice.dex`, the natural question is "which chain is
that for?" The right answer is "all of them, if you want." A name
should be a personal identity, not a chain-specific account number.
You should be able to attach a Polygon address, an Ethereum address,
a Bitcoin address, and a Solana address to one name, and let each
wallet look up the right one.

This is what the resolver's coin-type record system is for. It comes
from **SLIP-44** (the registry of cryptocurrency coin types) and
**ENSIP-9 / ENSIP-11** (how to use SLIP-44 inside a name resolver,
including for EVM chains that share SLIP-44 codes).

This post explains the encoding, walks through `DXResolver`'s
implementation, and shows how to register and read multi-chain
addresses for a name.

<details>
<summary>▸ 한국어로 보기</summary>

`alice.dex`를 등록할 때 자연스러운 질문은 "그게 어느 체인용인가?"입니다.
정답은 "원한다면 전부 다"입니다. 이름은 개인 정체성이지, 체인별 계정 번호가
아닙니다. 하나의 이름에 Polygon 주소, Ethereum 주소, Bitcoin 주소, Solana
주소를 붙이고 각 지갑이 알맞은 것을 찾도록 할 수 있어야 합니다.

이게 리졸버의 coin-type 레코드 시스템 목적입니다. **SLIP-44**(암호화폐 코인
타입 레지스트리)와 **ENSIP-9 / ENSIP-11**(SLIP-44를 네임 리졸버 내에서 어떻게
쓰는지, SLIP-44 코드를 공유하는 EVM 체인 포함)에서 옵니다.

이번 편은 인코딩을 설명하고, `DXResolver`의 구현을 살펴보고, 이름에 멀티체인
주소를 등록하고 읽는 방법을 보여줍니다.

</details>

---

## SLIP-44 in 30 seconds

SLIP-44 is the canonical numbering of cryptocurrencies, originally
written for BIP-44 hierarchical wallets. Each chain gets a unique
non-negative integer:

```
0      Bitcoin
60     Ethereum
2      Litecoin
145    Bitcoin Cash
501    Solana
714    BNB Chain
...
```

ENS adopted SLIP-44 as the coin-type identifier for resolver records:
"give me the address for `alice.dex` on coin 60" means "give me her
Ethereum address."

For non-EVM chains this works directly. The address is whatever the
chain considers an address: a 25-byte legacy Bitcoin script, a
32-byte Solana ed25519 public key, etc. The resolver stores raw
bytes; the wallet decodes them according to its chain's conventions.

<details>
<summary>▸ 한국어로 보기</summary>

## 30초 만에 SLIP-44

SLIP-44는 암호화폐의 정규 번호 체계. 원래 BIP-44 계층 지갑을 위해 작성됐습니다.
각 체인이 고유한 음이 아닌 정수를 받습니다.

ENS는 SLIP-44를 리졸버 레코드의 coin-type 식별자로 채택했습니다. "alice.dex의
coin 60 주소를 주세요"는 "그녀의 Ethereum 주소를 주세요"라는 뜻입니다.

비EVM 체인에는 이게 직접 작동합니다. 주소는 체인이 주소로 간주하는 것:
25바이트 레거시 Bitcoin script, 32바이트 Solana ed25519 공개키 등. 리졸버는
raw 바이트를 저장하고 지갑이 자기 체인 컨벤션에 따라 디코드합니다.

</details>

---

## The EVM problem (and ENSIP-11)

SLIP-44 has *one* code for "Ethereum-family chains": 60. But there
are now dozens of EVM chains, all using 20-byte addresses, all
incompatible at the chain-ID level. A 20-byte address that's valid on
Polygon isn't necessarily what the user wants used for Ethereum L1,
even if the bytes are the same.

ENSIP-11 solves this with a high-bit-set encoding:

```
For EVM chain with chainId C:
  coinType = 0x80000000 | C
```

- The high bit (bit 31) being set distinguishes "EVM chain N" from
  the SLIP-44 coin code N.
- `coinType = 0x80000000` (high bit, no chain ID) means "any EVM
  chain" — useful when the user wants one address that all EVM
  wallets default to.

Examples:

```
0x80000000             = "any EVM" (default)
0x80000000 | 1         = 0x80000001 = Ethereum mainnet
0x80000000 | 137       = 0x80000089 = Polygon
0x80000000 | 56        = 0x80000038 = BNB Chain
0x80000000 | 8453      = 0x80002105 = Base
0x80000000 | 42161     = 0x8000A4B1 = Arbitrum
```

DEXignation's `EVMCoinUtils` library has the encoding and the
decoder:

```solidity
uint256 constant COIN_TYPE_DEFAULT = 1 << 31; // 0x8000_0000

function isEVMCoinType(uint256 coinType) internal pure returns (bool) {
  return coinType == COIN_TYPE_DEFAULT || chainFromCoinType(coinType) > 0;
}

function chainFromCoinType(uint256 coinType) internal pure returns (uint32) {
  if (coinType == COIN_TYPE_ETH) return CHAIN_ID_ETH;
  coinType ^= COIN_TYPE_DEFAULT;
  return uint32(coinType < COIN_TYPE_DEFAULT ? coinType : 0);
}
```

There's one historical quirk: `coinType == 60` is also recognised as
EVM, because SLIP-44 60 (Ethereum) predates ENSIP-11 and `ethers.js`
and many wallets used it for Ethereum-mainnet addresses long before
the high-bit convention existed. ENSIP-11 keeps it for compatibility.

<details>
<summary>▸ 한국어로 보기</summary>

## EVM 문제 (그리고 ENSIP-11)

SLIP-44에는 "Ethereum 계열 체인"에 대한 코드가 *하나*뿐입니다: 60. 하지만
이제 수십 개의 EVM 체인이 있고, 모두 20바이트 주소를 쓰지만 chain-ID 레벨에서
호환되지 않습니다. Polygon에서 유효한 20바이트 주소가 바이트가 같더라도
사용자가 Ethereum L1에서 쓰고 싶어하는 그것은 아닙니다.

ENSIP-11이 high-bit-set 인코딩으로 해결합니다.

- high bit(bit 31)가 설정되면 "EVM 체인 N"과 SLIP-44 코인 코드 N을 구분.
- `coinType = 0x80000000`(high bit, chain ID 없음)은 "모든 EVM 체인" — 사용자가
  모든 EVM 지갑이 기본으로 쓸 주소 하나를 원할 때 유용.

역사적 특이사항 하나: `coinType == 60`도 EVM으로 인식됩니다. SLIP-44 60
(Ethereum)이 ENSIP-11보다 먼저 있었고, `ethers.js`와 많은 지갑이 high-bit
컨벤션이 있기 전부터 그것을 Ethereum 메인넷 주소에 썼습니다. ENSIP-11이
호환성을 위해 유지합니다.

</details>

---

## How DXResolver stores addresses

The resolver storage is a two-level mapping:

```solidity
mapping(bytes32 => mapping(uint256 => bytes)) addresses;
//      node             coinType    rawBytes
```

For each `(node, coinType)` pair we store raw bytes. The bytes are
the chain-native address form. No interpretation, no validation
beyond length-correctness for EVM coin types.

The setter:

```solidity
function setAddr(
  bytes32 node,
  uint256 coinType,
  bytes calldata addrBytes
) public override authorised(node) {
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

The validation rule: if the coin type is EVM, the bytes must be either
empty (= clear the record) or exactly 20 bytes. For non-EVM coin types
we accept any length, because chain-native address formats vary
wildly: Bitcoin scripts can be 25+ bytes, Solana keys are 32 bytes,
Cosmos addresses are bech32-decoded into variable-length byte strings.

We could try to validate each chain's format, but that's a never-ending
catch-up game and adds bytecode for chains we may never have first-class
support for. Better to let wallets handle that.

<details>
<summary>▸ 한국어로 보기</summary>

## DXResolver가 주소를 저장하는 방법

리졸버 저장소는 2단계 매핑. `(node, coinType)` 쌍마다 raw 바이트 저장. 바이트는
체인-네이티브 주소 형태. 해석 없음. EVM coin type에 대한 길이 정확성 외 검증
없음.

검증 규칙: coin type이 EVM이면 바이트가 비어있거나(레코드 삭제) 정확히 20바이트.
비EVM coin type은 임의 길이 허용. 체인-네이티브 주소 형식이 매우 다양하기
때문입니다: Bitcoin script는 25+바이트, Solana 키는 32바이트, Cosmos 주소는
bech32-디코드된 가변 길이 바이트 문자열.

각 체인 형식을 검증할 수도 있지만 끝없는 따라잡기 게임이고, 우리가 1급
지원을 안 할 체인을 위한 바이트코드를 추가하는 셈. 지갑이 처리하게 하는 게
낫습니다.

</details>

---

## A worked multi-chain registration

Suppose `alice` wants to use `alice.dex` on Polygon, Ethereum, and
Bitcoin. After her initial registration, she sends three `setAddr`
transactions:

```javascript
const node = namehash('alice.dex');

// Polygon address (the default during registration, but she could update it)
await resolver.write.setAddr([
  node,
  0x80000000n | 137n,        // ENSIP-11: 0x80000089 = Polygon
  '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
]);

// Ethereum mainnet address
await resolver.write.setAddr([
  node,
  60n,                       // SLIP-44: Ethereum
  '0xA1B2C3D4E5F60718293A4B5C6D7E8F9A0B1C2D3E',
]);

// Bitcoin scriptPubKey
await resolver.write.setAddr([
  node,
  0n,                        // SLIP-44: Bitcoin
  '0x76a91471c7656ec7ab88b098defb751b7401b5f6d8976f88ac',  // P2PKH
]);
```

A Polygon wallet looking up `alice.dex` will query `coinType = 0x80000089`
(or fall back to `0x80000000` "any EVM"). An Ethereum wallet will
query `coinType = 60`. A Bitcoin wallet will query `coinType = 0`.

The resolver doesn't know or care about the relationship between these
addresses. They're independent records under the same name.

<details>
<summary>▸ 한국어로 보기</summary>

## 멀티체인 등록 예시

`alice`가 `alice.dex`를 Polygon, Ethereum, Bitcoin에서 쓰고 싶다고 합시다.
최초 등록 후, 그녀는 `setAddr` 트랜잭션 세 개를 보냅니다.

Polygon 지갑이 `alice.dex`를 조회할 때 `coinType = 0x80000089`(또는 `0x80000000`
"any EVM"으로 fallback)를 질의합니다. Ethereum 지갑은 `coinType = 60`을. Bitcoin
지갑은 `coinType = 0`을.

리졸버는 이 주소들 사이의 관계를 알지 못하고 신경 쓰지 않습니다. 같은 이름
아래 독립적 레코드들입니다.

</details>

---

## Reading from the resolver

```javascript
const node = namehash('alice.dex');

const polygonAddrBytes = await resolver.read.addr([node, 0x80000089n]);
// 0x71C7656EC7ab88b098defB751B7401B5f6d8976F

const ethereumAddrBytes = await resolver.read.addr([node, 60n]);
// 0xA1B2C3D4E5F60718293A4B5C6D7E8F9A0B1C2D3E

const btcScriptBytes = await resolver.read.addr([node, 0n]);
// 0x76a91471c7656ec7ab88b098defb751b7401b5f6d8976f88ac
```

`hasAddr(node, coinType)` is a cheaper existence check that doesn't
return the bytes — useful when a UI just wants to know which chains
have records.

The function reverts if the node is expired. That's an important
distinction from "returns empty": a wallet asking about an expired name
should treat the response as a hard error, not as "no address set."

<details>
<summary>▸ 한국어로 보기</summary>

## 리졸버에서 읽기

`hasAddr(node, coinType)`는 바이트를 반환하지 않는 더 저렴한 존재 확인입니다.
어느 체인에 레코드가 있는지 UI가 알고 싶을 때 유용.

함수는 노드가 만료되면 revert합니다. "빈 값 반환"과 중요한 차이입니다. 만료된
이름에 대해 묻는 지갑은 "주소 미설정"이 아니라 하드 에러로 응답을 처리해야
합니다.

</details>

---

## Wallet integration recipe

If you're writing a wallet (or a dApp doing resolution), here's a
sensible lookup order for an EVM context:

```
function lookup(name, currentChainId):
  node = namehash(name)

  // Most specific: address for the exact chain
  addr = resolver.addr(node, 0x80000000 | currentChainId)
  if addr: return addr

  // SLIP-44 legacy code if currentChainId is Ethereum mainnet
  if currentChainId == 1:
    addr = resolver.addr(node, 60)
    if addr: return addr

  // Fallback: "any EVM"
  addr = resolver.addr(node, 0x80000000)
  if addr: return addr

  return null
```

Most-specific to least-specific. A user who has set an explicit
Polygon address gets it. A user who hasn't set one falls through to
their "any EVM" default. A user with no default gets a clean null.

For non-EVM chains, just look up by SLIP-44 code directly.

<details>
<summary>▸ 한국어로 보기</summary>

## 지갑 통합 레시피

지갑(또는 해결을 하는 dApp)을 만드는 중이라면, EVM 컨텍스트에 합리적인 조회
순서: 가장 구체적 → 가장 일반적. 명시적 Polygon 주소를 설정한 사용자는 그것을
얻습니다. 설정 안 한 사용자는 "any EVM" 기본값으로 떨어집니다. 기본값도 없는
사용자는 깔끔한 null을 받습니다.

비EVM 체인은 SLIP-44 코드로 직접 조회.

</details>

---

## What we don't do (yet)

- **No CCIP-Read.** ENS supports off-chain resolution via the
  CCIP-Read pattern, letting a name's resolver delegate to an
  off-chain service. We may add this later for cost-amortising
  millions of subdomain resolutions (e.g. for a single organisation
  owning `acme.dex` and resolving `*.acme.dex` off-chain). For now,
  every record is on-chain.

- **No reverse resolution per coin type.** The reverse name is global
  per node — `0xABC...addr.reverse → alice.dex`, not per chain. A user
  who wants different display names per chain currently can't have
  them. We may revisit if there's demand.

- **No batch setters.** `setAddr` is one record at a time. A
  `setAddrBatch(node, coinTypes[], addrs[])` would be a clean
  add-on. We left it out of v1 to keep the resolver small.

<details>
<summary>▸ 한국어로 보기</summary>

## 아직 안 하는 것

- **CCIP-Read 없음.** ENS는 CCIP-Read 패턴으로 오프체인 해결을 지원해서
  이름의 리졸버가 오프체인 서비스로 위임할 수 있게 합니다. 수백만 서브도메인
  해결의 비용을 분산하기 위해 나중에 추가할 수 있습니다(예: `acme.dex`를
  보유한 단일 조직이 `*.acme.dex`를 오프체인 해결). 지금은 모든 레코드가
  온체인.

- **coin type별 역방향 해결 없음.** 역방향 이름은 노드당 전역
  — `0xABC...addr.reverse → alice.dex`이지 체인별이 아닙니다. 체인별로 다른
  표시 이름을 원하는 사용자는 현재 가질 수 없습니다. 수요가 있다면 재고할
  수 있습니다.

- **배치 setter 없음.** `setAddr`는 레코드 한 번에 하나씩.
  `setAddrBatch(node, coinTypes[], addrs[])`는 깔끔한 추가가 될 겁니다.
  리졸버를 작게 유지하기 위해 v1에서는 뺐습니다.

</details>

---

## Wrapping the series

That's all six parts. If you read them in order, you've now seen how
DEXignation:

- Borrows ENS's architecture and explains exactly what it borrowed.
- Computes namehash without modifying the EIP-137 standard.
- Generates fully on-chain NFT metadata.
- Defends against front-running with commit-reveal.
- Quotes prices in attoUSD and converts to wei via a dual-path
  Chainlink oracle.
- Supports multi-chain resolution per ENSIP-11.

The code is on GitHub at
`https://github.com/DEXignation/dexignation-contracts`.

If you find a bug, please follow the disclosure process in
[`SECURITY.md`](https://github.com/DEXignation/dexignation-contracts/blob/main/SECURITY.md).

For everything else — official docs, the MetaMask Snap, the backend
service — head to **https://dexignation.com** or the
[`DEXignation`](https://github.com/DEXignation) GitHub organisation.

Thank you for reading. And thank you, again, to the ENS team for the
groundwork.

<details>
<summary>▸ 한국어로 보기</summary>

## 시리즈 마무리

여섯 편 모두입니다. 순서대로 읽었다면 DEXignation이 어떻게:

- ENS의 아키텍처를 차용하고 정확히 무엇을 차용했는지 설명하는지.
- EIP-137 표준을 수정하지 않고 namehash를 계산하는지.
- 완전 온체인 NFT 메타데이터를 생성하는지.
- commit-reveal로 프론트러닝을 방어하는지.
- attoUSD로 가격을 매기고 dual-path Chainlink 오라클로 wei로 변환하는지.
- ENSIP-11에 따라 멀티체인 해결을 지원하는지.

코드는 GitHub에 `https://github.com/DEXignation/dexignation-contracts`.

버그를 찾으면 `SECURITY.md`의 공개 절차를 따라주세요.

그 외 모든 것 — 공식 문서, MetaMask Snap, 백엔드 — 은 **https://dexignation.com**
또는 [`DEXignation`](https://github.com/DEXignation) GitHub 조직에서 확인하실 수
있습니다.

읽어주셔서 감사합니다. 그리고 다시 한 번, 기반 작업을 해준 ENS 팀에 감사합니다.

</details>

---

*Previous: [Part 5 — Dual-Path Oracle](./05-dual-path-oracle.md)*
*Series index: [`README.md`](./README.md)*
