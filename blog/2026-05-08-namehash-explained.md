# EIP-137 `namehash`, Explained Simply

*Part 2 of the DEXignation Series. Estimated read time: 6 min.*

> 이 글은 한국어와 영어를 함께 제공합니다. 한국어 본문은 각 섹션 아래
> 펼치기 영역에 있습니다.

---

A name service that wants to be wallet-compatible has exactly one
non-negotiable: it must turn a name like `alice.dex` into the same
`bytes32` node hash that every other EVM tool would compute. That
algorithm is **EIP-137 `namehash`**, and it's small enough to understand
in one sitting.

This post walks through `namehash`, looks at DEXignation's
implementation (`DXNamehash.sol`), and explains a few details that
trip people up the first time.

<details>
<summary>▸ 한국어로 보기</summary>

지갑과 호환되고 싶은 네임 서비스에는 절대 양보 못 하는 한 가지가 있습니다.
`alice.dex` 같은 이름을 다른 모든 EVM 도구가 계산하는 것과 똑같은
`bytes32` 노드 해시로 바꿔야 한다는 것. 그 알고리즘이 **EIP-137 `namehash`**
이고, 한 자리에 앉아 이해할 수 있을 만큼 작습니다.

이번 편은 `namehash`를 차근차근 살펴보고, DEXignation의 구현
(`DXNamehash.sol`)을 보고, 처음 보면 헷갈리는 디테일을 짚어줍니다.

</details>

---

## The algorithm in one paragraph

Start with `bytes32(0)`. Split the name into labels by `.`. Iterate from
right to left. For each label, replace the current node with
`keccak256(currentNode || keccak256(label))`. When you run out of
labels, the current node is the namehash.

That's it. There are exactly two operations: `keccak256` and concatenation.

<details>
<summary>▸ 한국어로 보기</summary>

## 한 문단으로 보는 알고리즘

`bytes32(0)`으로 시작합니다. 이름을 `.` 기준으로 라벨로 쪼갭니다. 오른쪽에서
왼쪽으로 반복합니다. 각 라벨마다 현재 노드를
`keccak256(현재노드 || keccak256(라벨))`로 갱신합니다. 라벨이 떨어지면 현재
노드가 namehash입니다.

끝입니다. 연산은 `keccak256`과 concat 두 개뿐.

</details>

---

## Worked example

Let's compute `namehash("alice.dex")` step by step.

```
Step 0: node = bytes32(0)
                = 0x0000000000000000000000000000000000000000000000000000000000000000

Step 1: process the rightmost label "dex"
        node = keccak256(bytes32(0) || keccak256("dex"))
             = namehash("dex")

Step 2: process "alice"
        node = keccak256(namehash("dex") || keccak256("alice"))
             = namehash("alice.dex")
```

That gives you a deterministic 32-byte identifier for any name. Two
properties fall out immediately:

1. **Parent → child is one-way.** Given `namehash("alice.dex")` you
   can't recover `"alice"` or `"dex"` (it's a hash of a hash). You
   can only verify.

2. **Sibling names are independent.** `namehash("alice.dex")` tells
   you nothing about `namehash("bob.dex")`. The shared parent only
   becomes visible if you know the labels.

<details>
<summary>▸ 한국어로 보기</summary>

## 손계산 예시

`namehash("alice.dex")`를 단계별로 계산해봅시다.

```
Step 0: node = bytes32(0)
                = 0x000...000

Step 1: 가장 오른쪽 라벨 "dex" 처리
        node = keccak256(bytes32(0) || keccak256("dex"))
             = namehash("dex")

Step 2: "alice" 처리
        node = keccak256(namehash("dex") || keccak256("alice"))
             = namehash("alice.dex")
```

이렇게 어떤 이름이든 결정적 32바이트 식별자가 나옵니다. 두 가지 성질이
바로 나옵니다.

1. **부모 → 자식은 단방향.** `namehash("alice.dex")`로부터 `"alice"`나
   `"dex"`를 복원할 수 없습니다(해시의 해시). 검증만 가능합니다.

2. **형제 이름은 독립적.** `namehash("alice.dex")`는 `namehash("bob.dex")`에
   대해 아무것도 알려주지 않습니다. 공통 부모는 라벨을 알아야만 보입니다.

</details>

---

## Why hash each label separately?

A natural mistake is to think you can just do
`keccak256("alice.dex")` and call it a day. You can't — and there's a
real reason.

If you hashed the whole string, the registry couldn't grant ownership
over `dex` independently from `alice.dex`. They'd have unrelated
identifiers. By hashing each label and chaining, parent-child
relationships are baked in at the cryptographic level. Granting
ownership of `dex` is meaningful: it gives the owner the right to
create sub-records like `alice.dex` and `bob.dex`, all of which carry
verifiable parentage.

This is why namehash is structured as a *Merkle-style chain* rather
than a flat hash. It's not just a name → ID mapping; it's a
hierarchical identifier system.

<details>
<summary>▸ 한국어로 보기</summary>

## 왜 라벨을 따로따로 해싱하나?

자연스럽게 빠질 수 있는 오해는 `keccak256("alice.dex")` 한 방이면 되지
않냐는 것입니다. 안 됩니다. 그리고 진짜 이유가 있습니다.

전체 문자열을 한 번에 해싱하면, 레지스트리가 `dex`에 대한 소유권을
`alice.dex`와 독립적으로 부여할 수 없습니다. 식별자가 무관해지기 때문이죠.
라벨별로 해싱하고 체이닝함으로써 부모-자식 관계가 암호학적 레벨에
구워집니다. `dex`의 소유권을 부여하는 것이 의미를 가집니다 — 소유자가
`alice.dex`, `bob.dex` 같은 하위 레코드를 만들 수 있고, 모두 검증 가능한
부모 관계를 가집니다.

그래서 namehash가 평면 해시가 아니라 *Merkle 스타일 체인*으로 설계됐습니다.
단순한 이름 → ID 매핑이 아니라 계층적 식별자 시스템입니다.

</details>

---

## DEXignation's implementation

Here's the relevant function from `contracts/utils/DXNamehash.sol`:

```solidity
function namehash(string memory name) internal pure returns (bytes32 node) {
  bytes memory encoded = bytes(name);
  if (encoded.length == 0) {
    return bytes32(0);
  }
  node = bytes32(0);
  uint256 i = encoded.length;
  while (i > 0) {
    uint256 labelStart = i;
    // Walk left until a '.' or the start of the string.
    while (i > 0 && encoded[i - 1] != bytes1(".")) {
      unchecked { i--; }
    }
    if (labelStart == i) {
      revert EmptyDnsLabel();
    }
    bytes memory labelBytes = new bytes(labelStart - i);
    for (uint256 j = 0; j < labelBytes.length; ) {
      labelBytes[j] = encoded[i + j];
      unchecked { j++; }
    }
    node = keccak256(abi.encodePacked(node, keccak256(labelBytes)));
    if (i > 0) {
      unchecked { i--; }   // skip the '.'
    }
  }
}
```

Three things worth noticing.

### 1. Right-to-left scan

We don't split the string into an array of labels. We walk right-to-left
on the byte array directly. For short names (the typical case) this
saves a memory allocation per label.

`i` is the current cursor, walking leftward. We scan until we hit a `.`
or the start, then we know we have a label spanning `encoded[i..labelStart)`.
We hash it, fold it into `node`, skip the `.`, and continue.

### 2. The `EmptyDnsLabel` guard

If two `.`s are adjacent (`"alice..dex"`) or the name ends in `.`
(`"alice."`), the scan would produce an empty label. We reject this
explicitly. EIP-137 doesn't *require* a specific error here, but a
silent empty-label hash would create namespace collision risks
(many names with no real human spelling).

### 3. The `unchecked` blocks

`i--` and `j++` are bounded by string length, which Solidity has already
sized to fit in `uint256`. The overflow check would never trigger, and
in a tight loop the savings add up.

<details>
<summary>▸ 한국어로 보기</summary>

## DEXignation 구현

`contracts/utils/DXNamehash.sol`에서 가져온 코드. 짚어볼 점 세 가지.

### 1. 우→좌 스캔

문자열을 라벨 배열로 쪼개지 않습니다. 바이트 배열 위에서 직접
오른쪽→왼쪽으로 걷습니다. 짧은 이름(일반적 경우)에는 라벨당 메모리
할당을 절약합니다.

`i`가 커서, 왼쪽으로 이동. `.`이나 시작 지점에 도달할 때까지 스캔하면
`encoded[i..labelStart)`가 한 라벨. 해싱해서 `node`에 접고, `.`을 건너뛰고
계속.

### 2. `EmptyDnsLabel` 가드

`.`이 연속(`"alice..dex"`)이거나 이름이 `.`로 끝나면(`"alice."`) 빈 라벨이
나옵니다. 명시적으로 거부합니다. EIP-137이 이 에러를 *요구*하지는 않지만,
빈 라벨 해시가 조용히 통과되면 네임스페이스 충돌 위험(사람이 쓸 수 없는
이름이 잔뜩 생김)이 있습니다.

### 3. `unchecked` 블록

`i--`와 `j++`는 문자열 길이 안에서 움직입니다. Solidity는 이미 `uint256`에
들어가도록 사이즈를 결정했으므로 오버플로우 체크가 발동할 일이 없고,
타이트한 루프에서는 절약이 누적됩니다.

</details>

---

## Reverse-resolution namehash

EIP-181 introduces a special parent node, `addr.reverse`, where each
address has a deterministic child node derived from its lowercase hex
form. We compute the parent at compile time:

```solidity
function reverseAddrParentNode() internal pure returns (bytes32 node) {
  node = bytes32(0);
  node = keccak256(abi.encodePacked(node, keccak256(bytes("reverse"))));
  node = keccak256(abi.encodePacked(node, keccak256(bytes("addr"))));
}
```

And the per-address label hash:

```solidity
function addrReverseLabelHash(address addr) internal pure returns (bytes32) {
  bytes memory hex40 = _addressToLowerHexNoPrefix(addr);
  return keccak256(hex40);
}
```

Note: the address is rendered as 40 ASCII bytes of lowercase hex,
without a `0x` prefix. Forgetting the `0x` is the most common
implementation mistake. So is using mixed-case hex (some "checksum
address" libraries default to that). EIP-181 requires lowercase.

This is what gives every address `0xABC...` a unique reverse node:

```
reverseNode(addr) = keccak256(reverseAddrParentNode() || keccak256(lowerHex(addr)))
```

We'll come back to reverse resolution in detail when we discuss the
resolver, but the namehash side of it lives here.

<details>
<summary>▸ 한국어로 보기</summary>

## 역방향 해결 namehash

EIP-181은 특별한 부모 노드 `addr.reverse`를 도입합니다. 그 아래에 각 주소가
소문자 16진 형태에서 도출된 결정적 자식 노드를 가집니다.

주소는 `0x` 없이 소문자 16진 40 ASCII 바이트로 렌더됩니다. `0x`를 빼먹는 게
가장 흔한 구현 실수입니다. mixed-case(일부 "checksum address" 라이브러리의
기본값)도 안 됩니다. EIP-181은 소문자를 요구합니다.

이렇게 해서 모든 주소 `0xABC...`가 고유한 역방향 노드를 가집니다.

리졸버 얘기를 할 때 역방향 해결을 자세히 다시 다루겠지만, namehash 쪽은
여기 살고 있습니다.

</details>

---

## Practical tips for using namehash

A few things I wish I'd known sooner.

- **Compute parent namehashes once.** `namehash("dex")` is constant
  for your TLD. Compute it during deployment and store it as `immutable`.
  ```solidity
  bytes32 public immutable baseNode;  // = namehash("dex")
  ```

- **Subnodes are `keccak256(parent || labelhash)`, not `namehash(label + "." + parent)`.**
  Most APIs that take a "label" inside an existing parent expect the
  raw `keccak256(label)`, not a full namehash. Pay attention to this
  in interface signatures.

- **For string inputs, `bytes32(0)` is `namehash("")`.** This is the
  root. Don't accept `""` as a registrable label.

- **Reading from off-chain libraries.** `ethers.js`, `viem`, and the
  Polygon SDKs all expose `namehash()` functions that produce the same
  output as your Solidity implementation. Test that they agree on
  representative inputs before shipping.

<details>
<summary>▸ 한국어로 보기</summary>

## namehash 사용 실전 팁

진작 알았으면 좋았을 것들.

- **부모 namehash는 한 번만 계산.** TLD에 대한 `namehash("dex")`는 상수입니다.
  배포 시 계산해서 `immutable`로 저장하세요.

- **서브노드는 `keccak256(parent || labelhash)`이지 `namehash(label + "." + parent)`가
  아닙니다.** 기존 부모 안에서 "라벨"을 받는 대부분의 API는 전체 namehash가
  아닌 raw `keccak256(label)`을 기대합니다. 인터페이스 시그니처에서 주의.

- **문자열 입력에서 `bytes32(0)`은 `namehash("")`.** 루트입니다. `""`를
  등록 가능한 라벨로 받지 마세요.

- **오프체인 라이브러리에서 읽기.** `ethers.js`, `viem`, Polygon SDK들이
  모두 같은 출력을 만드는 `namehash()` 함수를 제공합니다. 대표 입력값으로
  일치를 검증한 뒤 배포하세요.

</details>

---

## Try it yourself

Pop open a node REPL:

```javascript
const { namehash } = require('viem/ens');

namehash('');                 // 0x0000...0000
namehash('dex');              // 0x????
namehash('alice.dex');        // 0x????
namehash('foo.alice.dex');    // 0x????
```

If your Solidity `DXNamehash.namehash("alice.dex")` returns the same
value as `viem`'s `namehash('alice.dex')`, you're EIP-137 compliant.

<details>
<summary>▸ 한국어로 보기</summary>

## 직접 해보기

node REPL을 열어서:

```javascript
const { namehash } = require('viem/ens');
namehash('alice.dex');
```

Solidity의 `DXNamehash.namehash("alice.dex")`가 `viem`의 결과와 같다면
EIP-137 호환입니다.

</details>

---

*Previous: [Part 1 — Why DEXignation](./01-why-dexignation.md)*
*Next: [Part 3 — An ERC-721 with Fully On-Chain SVG](./03-onchain-svg-nft.md)*
