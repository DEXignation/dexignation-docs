# An ERC-721 with Fully On-Chain SVG

*Part 3 of the DEXignation Series. Estimated read time: 7 min.*

> 한국어 본문은 각 섹션 아래 펼치기 영역에 있습니다.

---

Most NFTs are not on-chain. Their `tokenURI` returns an IPFS or HTTPS
link, and a JSON document at that location points at *another* link
where the image actually lives. Two layers of indirection. Two
opportunities for the artwork to vanish.

DEXignation does it differently. Every `.dex` name's image, metadata,
and JSON are generated *inside the contract* on every call to
`tokenURI`. As long as the contract exists and the chain runs, the
artwork exists.

This post walks through how that works in roughly 80 lines of Solidity,
and what trade-offs we accepted along the way.

<details>
<summary>▸ 한국어로 보기</summary>

대부분의 NFT는 온체인이 아닙니다. `tokenURI`가 IPFS나 HTTPS 링크를 반환하고,
그 위치의 JSON 문서가 *또 다른* 링크 — 실제 이미지가 있는 곳 — 를 가리킵니다.
이중 우회. 아트워크가 사라질 두 번의 기회.

DEXignation은 다르게 합니다. 모든 `.dex` 이름의 이미지, 메타데이터, JSON이
`tokenURI` 호출마다 *컨트랙트 안에서* 생성됩니다. 컨트랙트가 살아있고
체인이 돌아가는 한, 아트워크도 살아있습니다.

이번 편은 그게 어떻게 80여 줄의 Solidity로 작동하는지, 그리고 우리가 받아들인
트레이드오프를 설명합니다.

</details>

---

## What "fully on-chain" actually means

There are three things a `tokenURI` returns:

1. A **URI**.
2. That URI resolves to a **JSON document**.
3. The JSON's `image` field points at an **image**.

"Fully on-chain" means all three live in contract storage or are
computed from it — no network round-trips. The standard technique is
**`data:` URIs**.

A `data:` URI lets you inline content directly into a URL:

```
data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCI+...
data:application/json;base64,eyJuYW1lIjoiYWxpY2UuZGV4Iiwi...
```

Both fields above contain Base64-encoded payloads. The browser, the
NFT marketplace, or the wallet can decode and display them directly.
No server needed.

<details>
<summary>▸ 한국어로 보기</summary>

## "완전 온체인"이 실제로 의미하는 것

`tokenURI`가 반환하는 것은 세 가지입니다.

1. **URI**.
2. 그 URI가 가리키는 **JSON 문서**.
3. JSON의 `image` 필드가 가리키는 **이미지**.

"완전 온체인"은 셋 다 컨트랙트 storage에 있거나 storage에서 계산된다는
뜻 — 네트워크 왕복이 없습니다. 표준 기법이 **`data:` URI**입니다.

`data:` URI는 URL에 콘텐츠를 직접 인라인할 수 있게 해줍니다. 위 두 필드는
모두 Base64 인코딩된 페이로드입니다. 브라우저, NFT 마켓플레이스, 지갑이
직접 디코드해서 표시합니다. 서버 불필요.

</details>

---

## The DEXignation implementation

Here's the full `tokenURI` from `contracts/registrar/DXRegistrar.sol`:

```solidity
function tokenURI(uint256 tokenId) public view override returns (string memory) {
  _requireOwned(tokenId);
  string memory label = names[tokenId];
  if (bytes(label).length == 0) {
    label = "?";
  }
  string memory dotTld = string.concat(".", baseNodeName);
  string memory svg = _generateSVG(label, dotTld);
  string memory json = string.concat(
    '{"name":"', label, dotTld, '",'
    '"description":"DEXignation Name: ', label, dotTld, '",'
    '"image":"data:image/svg+xml;base64,',
    Base64.encode(bytes(svg)),
    '"}'
  );
  return string.concat(
    "data:application/json;base64,",
    Base64.encode(bytes(json))
  );
}
```

Reading it top-to-bottom:

1. `_requireOwned(tokenId)` — OpenZeppelin's check that the token exists
   and has an owner. If not, revert.
2. Look up the original label string from the `names[tokenId]` mapping.
   Fall back to `"?"` for safety (shouldn't happen for properly
   registered names).
3. Compose `".dex"` from `baseNodeName` so the same code works for
   future TLDs.
4. Generate the SVG inline.
5. Build the metadata JSON, embedding the SVG as a `data:image/svg+xml`
   URI.
6. Wrap the whole JSON in `data:application/json` and return.

That's the entire metadata pipeline.

<details>
<summary>▸ 한국어로 보기</summary>

## DEXignation 구현

위→아래로 읽으면:

1. `_requireOwned(tokenId)` — OpenZeppelin의 토큰 존재·소유자 확인. 없으면
   revert.
2. `names[tokenId]` 매핑에서 원본 라벨 문자열 조회. 안전을 위해 `"?"`로
   fallback (정상 등록 시에는 일어나지 않음).
3. `baseNodeName`에서 `".dex"`를 조합 — 미래 TLD에도 같은 코드가 동작.
4. SVG 인라인 생성.
5. SVG를 `data:image/svg+xml` URI로 임베드한 메타데이터 JSON 구성.
6. 전체 JSON을 `data:application/json`으로 감싸서 반환.

이게 전체 메타데이터 파이프라인입니다.

</details>

---

## The SVG generator

```solidity
function _generateSVG(string memory label, string memory dotTld)
  internal pure returns (string memory)
{
  return string.concat(
    '<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">'
    '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">'
    '<stop offset="0%" stop-color="#07080A"/>'
    '<stop offset="100%" stop-color="#0D1117"/>'
    '</linearGradient></defs>'
    '<rect width="400" height="400" rx="20" fill="url(#bg)"/>'
    '<rect x="8" y="8" width="384" height="384" rx="16" fill="none" stroke="#00DC82" stroke-opacity="0.2"/>'
    '<text x="200" y="170" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="40" fill="#00DC82">',
    label,
    '</text>'
    '<text x="200" y="220" text-anchor="middle" font-family="sans-serif" font-size="28" fill="#64748B">',
    dotTld,
    '</text>'
    '<text x="200" y="360" text-anchor="middle" font-family="monospace" font-size="11" fill="#2D3A48">DEXignation Name Service</text>'
    '</svg>'
  );
}
```

The function is `pure` — no state reads, no external calls. For a given
label and TLD, it always produces the same SVG. That makes it a clean
target for off-chain caching by marketplaces.

A few choices worth noting:

- **Sans-serif system font.** Embedding a font in the SVG would inflate
  output by 50–100 KB. Falling back to whatever the renderer has is
  fine for a name display.
- **Solid colours and a gradient, no images.** Pure SVG primitives so
  there's nothing to load externally.
- **Title and subtitle separation.** The label and the `.dex` are on
  different lines so long Korean or unicode labels still read cleanly.

<details>
<summary>▸ 한국어로 보기</summary>

## SVG 생성기

함수가 `pure` — state read도, 외부 호출도 없습니다. 같은 라벨과 TLD에 대해
항상 같은 SVG를 만듭니다. 마켓플레이스의 오프체인 캐싱 대상으로 깔끔합니다.

주목할 만한 선택들:

- **시스템 sans-serif 폰트.** SVG에 폰트를 임베드하면 출력이 50–100KB
  부풀어 오릅니다. 렌더러가 가진 폰트로 fallback하는 게 이름 표시에는
  충분합니다.
- **단색과 그라디언트만, 이미지 없음.** 순수 SVG 프리미티브라 외부에서
  로드할 게 없습니다.
- **제목과 부제 분리.** 라벨과 `.dex`가 다른 줄에 있어 긴 한글이나 유니코드
  라벨도 깔끔하게 읽힙니다.

</details>

---

## The Base64 double-encoding dance

The outermost wrapper is `data:application/json;base64,<JSON-base64>`.
Inside the JSON, the `image` field is another `data:image/svg+xml;base64,<SVG-base64>`.
We Base64-encode twice.

Why? Because both URIs are syntactically URLs, and a URL can contain
characters that have special meaning in URL parsing (`#`, `?`, `&`,
spaces, quotes). Base64 normalises everything to a URL-safe alphabet.

The decoder does this in reverse:

```
1. Strip the "data:application/json;base64," prefix.
2. Base64-decode → JSON string.
3. Parse JSON, read `image` field.
4. Strip the "data:image/svg+xml;base64," prefix.
5. Base64-decode → SVG.
6. Render.
```

We use OpenZeppelin's `Base64` utility, which is well-tested and gas-
efficient. The full overhead is about 33% more bytes per encoding pass,
i.e. our 1 KB SVG becomes ~1.4 KB Base64'd, embedded in a ~1.5 KB JSON
which becomes ~2 KB Base64'd. Still cheap.

<details>
<summary>▸ 한국어로 보기</summary>

## Base64 이중 인코딩

가장 바깥 wrapper가 `data:application/json;base64,<JSON-base64>`. JSON 안에서
`image` 필드가 또 다른 `data:image/svg+xml;base64,<SVG-base64>`. Base64로
두 번 인코딩합니다.

왜? 두 URI가 모두 문법상 URL이고, URL은 파싱에서 특별한 의미를 가진 문자
(`#`, `?`, `&`, 공백, 따옴표)를 포함할 수 있기 때문입니다. Base64는 모든
것을 URL-safe 알파벳으로 정규화합니다.

OpenZeppelin의 `Base64` 유틸리티를 사용 — 검증되고 가스 효율적. 인코딩
패스마다 ~33% 바이트 증가. 1KB SVG가 ~1.4KB Base64가 되고, ~1.5KB JSON에
임베드돼서 ~2KB Base64가 됩니다. 여전히 저렴합니다.

</details>

---

## Why we store the original label

ENS doesn't store the human-readable label. Only its
`keccak256(label)` (the "labelhash"). This saves a storage slot per
registration. The downside is you can never reconstruct `"alice"` from
`labelhash` — you can only verify a candidate.

DEXignation stores the label:

```solidity
mapping(uint256 => string) names;

// inside register():
names[id] = label;
```

The tradeoff is one extra SSTORE per registration. That's roughly
20,000 gas. At Polygon's typical gas price (around 30 gwei) and POL
price (around $0.4), this costs about **$0.0024 per registration**. We
accept that.

In exchange, we get:

- **Renderable `tokenURI`.** The whole point of this post.
- **Future-proofed on-chain features.** Subdomain listings, search,
  display logic — all of them benefit from having the canonical label
  stored.

<details>
<summary>▸ 한국어로 보기</summary>

## 원본 라벨을 저장하는 이유

ENS는 사람이 읽을 수 있는 라벨을 저장하지 않습니다. `keccak256(label)`
("labelhash")만 저장. 등록당 storage slot 하나를 절약합니다. 단점은
`labelhash`에서 `"alice"`를 복원할 수 없다는 것 — 후보를 검증만 할 수 있습니다.

DEXignation은 라벨을 저장합니다. 등록당 SSTORE 한 번 추가 — 약 20,000 gas.
Polygon의 일반적 gas price(약 30 gwei)와 POL 가격(약 $0.4)에서 등록당
**약 $0.0024**. 받아들입니다.

그 대신:

- **렌더링 가능한 `tokenURI`.** 이 글의 핵심.
- **미래 온체인 기능 대비.** 서브도메인 목록, 검색, 표시 로직 — 모두 정규
  라벨이 저장돼 있을 때 이득.

</details>

---

## Trade-offs to consider

I'd be lying if I said fully-on-chain is always the right call. Things
you give up:

- **Bigger contract bytecode.** SVG and Base64 logic add bytes. Stay
  well under the 24 KB contract limit; we use ~12 KB for the whole
  registrar.
- **No high-fidelity art.** A 4 KB SVG of geometric shapes is fine.
  A 200 KB photographic NFT is not. Pick the medium accordingly.
- **`view`-call gas cost.** `tokenURI` does work on every call.
  Marketplaces cache it, but pay attention if you're calling it
  in a loop.
- **No off-chain enhancement.** With an off-chain renderer you can
  update the art design without redeploying. With on-chain SVG, the
  art is locked.

For a name service the trade-offs are obviously favourable. For an art
project where the art is the value, you'd want a different answer.

<details>
<summary>▸ 한국어로 보기</summary>

## 고려할 트레이드오프

완전 온체인이 항상 정답이라고 하면 거짓말입니다. 포기하는 것들:

- **컨트랙트 바이트코드 크기 증가.** SVG와 Base64 로직이 바이트를 추가합니다.
  24KB 컨트랙트 제한 안에 여유 있게. Registrar 전체가 ~12KB.
- **고품질 아트 불가.** 4KB 기하학 SVG는 괜찮습니다. 200KB 사진 NFT는 안 됩니다.
  매체를 그에 맞게 선택.
- **`view` 호출 가스 비용.** `tokenURI`가 매 호출마다 일을 합니다. 마켓플레이스가
  캐싱하지만, 루프에서 호출하면 주의.
- **오프체인 개선 불가.** 오프체인 렌더러라면 컨트랙트 재배포 없이 아트 디자인
  업데이트 가능. 온체인 SVG는 아트가 잠깁니다.

네임 서비스에는 트레이드오프가 명백히 유리합니다. 아트 자체가 가치인 프로젝트면
다른 답이 맞을 겁니다.

</details>

---

## What you can do next

- **Read the function in context** —
  [`DXRegistrar.sol`](https://github.com/DEXignation/dexignation-contracts/blob/main/contracts/registrar/DXRegistrar.sol).
- **Try generating a `tokenURI` locally** — deploy to Hardhat, register
  a name, call `tokenURI(tokenId)`, paste the resulting `data:` URI
  into your browser. The SVG should render.
- **Customise the SVG** — `_generateSVG` is internal but very easy to
  fork. Match it to your brand if you reuse DEXignation as a base.

<details>
<summary>▸ 한국어로 보기</summary>

## 다음에 해볼 것

- **함수를 맥락에서 읽기** — `DXRegistrar.sol`.
- **로컬에서 `tokenURI` 생성해보기** — Hardhat에 배포, 이름 등록, `tokenURI(tokenId)`
  호출, 결과 `data:` URI를 브라우저에 붙여넣기. SVG가 렌더링돼야 합니다.
- **SVG 커스터마이즈** — `_generateSVG`는 internal이지만 fork하기 쉽습니다.
  DEXignation을 베이스로 재사용한다면 브랜드에 맞추세요.

</details>

---

*Previous: [Part 2 — namehash Explained](./02-namehash-explained.md)*
*Next: [Part 4 — Stopping Front-Running with Commit-Reveal](./04-commit-reveal.md)*
