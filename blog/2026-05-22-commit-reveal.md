# Stopping Front-Running with Commit-Reveal

*Part 4 of the DEXignation Series. Estimated read time: 7 min.*

> 한국어 본문은 각 섹션 아래 펼치기 영역에 있습니다.

---

You see a great `.dex` name in the mempool of a pending registration.
You copy the transaction, replace the recipient address with yours,
crank the gas price 10%, and submit. Block builder picks the higher-fee
transaction first. You get the name. The original user pays gas for a
failed transaction.

This is the front-running problem in two paragraphs. The standard
mitigation is **commit-reveal**, and DEXignation uses the same pattern
that ENS pioneered. This post explains why the pattern works and how
to use it.

<details>
<summary>▸ 한국어로 보기</summary>

좋은 `.dex` 이름이 등록 펜딩 트랜잭션의 mempool에 떠 있는 걸 봅니다.
트랜잭션을 복사하고, 수신 주소를 내 것으로 바꾸고, gas price를 10% 올려서
제출합니다. 블록 빌더가 더 높은 수수료 트랜잭션을 먼저 선택합니다. 내가
이름을 가져갑니다. 원래 유저는 실패 트랜잭션 가스만 냅니다.

이게 프론트러닝 문제 — 두 문단 요약. 표준 완화책이 **commit-reveal**이고,
DEXignation은 ENS가 정립한 같은 패턴을 사용합니다. 이번 편은 그 패턴이
왜 작동하는지, 어떻게 쓰는지 설명합니다.

</details>

---

## The naive registration is unsafe

Imagine `register("alice", msg.sender, ...)` in one transaction. The
mempool — the public waiting room of pending transactions — exposes
the label "alice" to anyone watching. A bot that sees the value of
that name can:

1. Copy the calldata.
2. Replace the owner with their own address.
3. Multiply the gas price.
4. Submit.

Validators include transactions in order of fee. The bot wins.

This isn't theoretical. ENS launched without commit-reveal in 2017,
and the first month of public registration was a frenzy of bots
sniping desirable names. ENS responded with commit-reveal in 2018,
and it's been the standard ever since.

<details>
<summary>▸ 한국어로 보기</summary>

## 단순한 등록은 안전하지 않다

한 트랜잭션에 `register("alice", msg.sender, ...)`가 있다고 합시다. mempool —
펜딩 트랜잭션의 공개 대기실 — 이 "alice"라는 라벨을 누구든 보는 사람에게
노출합니다. 그 이름의 가치를 알아본 봇이:

1. calldata 복사.
2. owner를 자기 주소로 교체.
3. gas price 곱하기.
4. 제출.

밸리데이터는 수수료 순으로 트랜잭션을 포함합니다. 봇이 이깁니다.

이건 이론이 아닙니다. ENS는 2017년 commit-reveal 없이 런칭했고, 퍼블릭 등록
첫 한 달은 좋은 이름을 가로채는 봇들의 광란이었습니다. ENS는 2018년에
commit-reveal로 대응했고, 이후 표준으로 자리잡았습니다.

</details>

---

## The commit-reveal idea

Split registration into two transactions, separated by time.

**Transaction 1 (commit):** the user submits a *hash* that depends on
the label, owner, and a secret. The hash reveals nothing about any of
the inputs — it's just 32 bytes of randomness from the bot's
perspective.

**Transaction 2 (reveal/register):** the user submits the label, owner,
duration, payment, and the same secret. The contract recomputes the
hash, looks it up, and only proceeds if it was committed at least
`minCommitmentAge` ago and at most `maxCommitmentAge` ago.

The bot can't shortcut this. To register the same name, the bot would
need to first commit *its own* hash, then wait `minCommitmentAge` (30
seconds in DEXignation). The real user, who committed earlier, will
have already revealed by then.

<details>
<summary>▸ 한국어로 보기</summary>

## commit-reveal 아이디어

등록을 두 트랜잭션으로 분리, 시간으로 떨어뜨림.

**트랜잭션 1 (commit):** 사용자가 라벨, owner, secret에 의존하는 *해시*를
제출합니다. 해시는 어떤 입력에 대해서도 아무것도 노출하지 않습니다 — 봇
입장에서는 32바이트 랜덤성에 불과합니다.

**트랜잭션 2 (reveal/register):** 사용자가 라벨, owner, duration, 결제, 같은
secret을 제출합니다. 컨트랙트가 해시를 재계산하고, 조회하고, 최소
`minCommitmentAge` 전에 commit됐고 `maxCommitmentAge` 안에 reveal됐다면 진행.

봇은 이걸 단축할 수 없습니다. 같은 이름을 등록하려면 봇이 *자기* 해시를 먼저
commit하고 `minCommitmentAge`(DEXignation에서 30초) 대기해야 합니다. 먼저
commit한 진짜 사용자가 그 사이에 reveal을 끝낼 겁니다.

</details>

---

## DEXignation's implementation

The commitment hash:

```solidity
function makeCommitment(
  string calldata name,
  address owner,
  bytes32 secret
) public pure override returns (bytes32) {
  return keccak256(abi.encode(name, owner, secret));
}
```

Notice `abi.encode`, not `abi.encodePacked`. With `encodePacked` and
variable-length types like `string`, you can craft collisions across
inputs. `abi.encode` left-pads each field, eliminating that class of
attack.

Storage and the commit transaction:

```solidity
mapping(bytes32 commitment => uint256 timestamp) public commitments;

function commit(bytes32 commitment) public override {
  if (commitments[commitment] + maxCommitmentAge >= block.timestamp) {
    revert UnexpiredCommitmentExists(commitment);
  }
  commitments[commitment] = block.timestamp;
}
```

The check prevents someone from "refreshing" a commitment by
re-submitting it before the previous one has expired (which would
otherwise create a way to chain commitments and bypass the time
window).

The reveal-time consumption:

```solidity
function _consumeCommitment(
  string calldata label,
  address owner,
  bytes32 secret
) internal {
  bytes32 commitment = makeCommitment(label, owner, secret);
  uint256 ts = commitments[commitment];
  if (ts == 0) revert CommitmentNotFound(commitment);
  if (ts + minCommitmentAge > block.timestamp) {
    revert CommitmentTooNew(commitment);
  }
  if (ts + maxCommitmentAge <= block.timestamp) {
    revert CommitmentTooOld(commitment);
  }
  delete commitments[commitment];
}
```

Four checks:

1. **Was there a commit at all?** `ts == 0` ⇒ never committed.
2. **Has enough time passed?** `ts + minCommitmentAge > now` ⇒ too new.
3. **Has too much time passed?** `ts + maxCommitmentAge <= now` ⇒ too old.
4. **One-time use.** `delete commitments[commitment]` ⇒ can't reveal twice.

<details>
<summary>▸ 한국어로 보기</summary>

## DEXignation 구현

commitment 해시. `abi.encode`이지 `abi.encodePacked`가 아닙니다.
`encodePacked`와 `string` 같은 가변 길이 타입을 쓰면 입력 간 충돌을 만들
수 있습니다. `abi.encode`는 각 필드를 left-pad해서 그 종류 공격을 제거합니다.

storage와 commit 트랜잭션. 이 체크는 누군가가 이전 commitment가 만료되기
전에 다시 제출해서 "리프레시"하는 걸 막습니다(그러지 않으면 commitment를
체이닝해서 시간 윈도우를 우회하는 방법이 생깁니다).

reveal 시점 소비 — 네 가지 검증:

1. **commit이 있었나?** `ts == 0` ⇒ commit한 적 없음.
2. **충분히 지났나?** `ts + minCommitmentAge > now` ⇒ 너무 빠름.
3. **너무 지났나?** `ts + maxCommitmentAge <= now` ⇒ 너무 늦음.
4. **일회용.** `delete commitments[commitment]` ⇒ 두 번 reveal 불가.

</details>

---

## Choosing the time windows

DEXignation defaults:

```solidity
uint256 public constant DEFAULT_MIN_COMMITMENT_AGE = 30;       // 30 seconds
uint256 public constant DEFAULT_MAX_COMMITMENT_AGE = 1 hours;  // 3600 seconds
```

The 30-second floor is the security floor: it must be long enough that
a bot can't watch the commit, immediately commit its own, and still
beat the user to reveal. Even on Polygon's ~2 second block times, 30
seconds gives 15 blocks of buffer.

The 1-hour ceiling is mostly UX: a user who walks away from their
browser shouldn't lose their slot indefinitely. After 1 hour they
just commit again.

These can be tuned by owner via `setCommitmentAgeSettings(minAge, maxAge)`,
which also enforces `minAge < maxAge`:

```solidity
function setCommitmentAgeSettings(
  uint256 minAge,
  uint256 maxAge
) external override onlyOwner {
  if (minAge >= maxAge) revert MaxCommitmentAgeTooLow();
  minCommitmentAge = minAge;
  maxCommitmentAge = maxAge;
}
```

<details>
<summary>▸ 한국어로 보기</summary>

## 시간 윈도우 선택

DEXignation 기본값: 최소 30초, 최대 1시간.

30초 하한은 보안 하한입니다. 봇이 commit을 보고 즉시 자기 것을 commit해도
사용자보다 먼저 reveal하지 못할 만큼 길어야 합니다. Polygon의 ~2초 블록
시간에서도 30초면 15블록 버퍼.

1시간 상한은 대부분 UX. 브라우저를 떠난 사용자가 자리를 영원히 잃지
않도록. 1시간 뒤에는 그냥 다시 commit하면 됩니다.

오너가 `setCommitmentAgeSettings(minAge, maxAge)`로 조정 가능하며,
`minAge < maxAge`를 강제합니다.

</details>

---

## Generating the secret

The `secret` should be:

- **Random** — 32 bytes from a CSPRNG, not derived from user input.
- **Single-use** — never reused across registrations.
- **Confidential until reveal** — keep it on the user's device.

In a typical web frontend:

```javascript
import { keccak256, encodeAbiParameters } from 'viem';

// Step 1 — generate locally
const secret = crypto.getRandomValues(new Uint8Array(32));
const secretHex = '0x' + Buffer.from(secret).toString('hex');

// Step 2 — compute commitment
const commitment = keccak256(
  encodeAbiParameters(
    [{ type: 'string' }, { type: 'address' }, { type: 'bytes32' }],
    [label, ownerAddress, secretHex]
  )
);

// Step 3 — send commit transaction
await controller.write.commit([commitment]);

// Step 4 — wait at least 30 seconds
await new Promise(r => setTimeout(r, 35_000));

// Step 5 — reveal
await controller.write.register(
  [label, ownerAddress, duration, resolverAddress, secretHex],
  { value: requiredPol }
);
```

The browser holds the `secret` between the two transactions. If the
user closes the tab without persisting it, they lose their commitment.
For mobile or wallet-app integrations, you'll want to save the secret
to local storage with a short TTL.

<details>
<summary>▸ 한국어로 보기</summary>

## secret 생성

`secret`은:

- **랜덤** — CSPRNG에서 32바이트. 사용자 입력에서 파생하지 않음.
- **일회용** — 등록 간에 재사용 안 함.
- **reveal 전까지 비밀** — 사용자 디바이스에 보관.

일반적인 웹 프론트엔드 예시. 브라우저가 두 트랜잭션 사이에 `secret`을 보관.
탭을 닫고 안 저장했다면 commitment를 잃습니다. 모바일이나 지갑 앱 통합에서는
짧은 TTL로 local storage에 저장하길 권장합니다.

</details>

---

## What commit-reveal does NOT protect against

It's not magic. The pattern stops one specific attack: front-running of
publicly visible registration intent. It does not stop:

- **Bot registration of unclaimed names.** If you want `alice.dex` but
  haven't committed yet, a bot crawling potential names can grab it
  first. Commit-reveal only protects users who have already committed.

- **Social engineering.** "Please send me your secret so I can register
  your name for you." — please don't.

- **Censorship by block proposers.** A determined proposer could
  exclude your commit transaction from blocks. Commit-reveal doesn't
  defend against this; trustless settlement does (eventually your tx
  gets in).

- **Re-org attacks.** On chains with reorgs, a commitment that landed
  in a block can technically be reorged out. Polygon's reorg risk is
  very low compared to L1, but it's not zero. `minCommitmentAge` of
  30 seconds gives enough cushion.

<details>
<summary>▸ 한국어로 보기</summary>

## commit-reveal이 막지 *못* 하는 것

마법이 아닙니다. 패턴은 하나의 특정 공격 — 공개적으로 보이는 등록 의도의
프론트러닝 — 을 막습니다. 막지 못하는 것:

- **봇이 미확보 이름을 선점.** 아직 commit하지 않은 이름은 잠재 이름을
  크롤하는 봇이 먼저 가져갈 수 있습니다. commit-reveal은 이미 commit한
  사용자만 보호합니다.

- **소셜 엔지니어링.** "secret을 보내주시면 제가 등록해드릴게요" — 절대
  하지 마세요.

- **블록 프로포저의 검열.** 결단력 있는 프로포저는 commit 트랜잭션을 블록에서
  제외할 수 있습니다. commit-reveal은 이걸 방어하지 않습니다. 무신뢰 정착이
  방어합니다(결국 트랜잭션이 들어갑니다).

- **재구성 공격.** 재구성이 있는 체인에서 블록에 들어간 commitment가 기술적으로
  재구성에서 빠질 수 있습니다. Polygon의 재구성 위험은 L1보다 매우 낮지만 0은
  아닙니다. `minCommitmentAge` 30초가 충분한 쿠션을 줍니다.

</details>

---

## Gas costs

Two transactions is two transactions. On Polygon:

| Step | Approx gas | Approx cost (30 gwei, POL ~$0.4) |
|---|---:|---:|
| `commit` | ~50,000 | ~$0.0006 |
| `register` | ~280,000 | ~$0.0034 |
| **Total** | **~330,000** | **~$0.004** |

Negligible. The protocol fee dominates ($5+ per name) so the
commit-reveal pattern adds almost nothing to the user's bill.

<details>
<summary>▸ 한국어로 보기</summary>

## 가스 비용

두 트랜잭션은 두 트랜잭션입니다. Polygon에서 총 ~330,000 gas, ~$0.004.
무시 가능. 프로토콜 수수료가 압도적(이름당 $5+)이라 commit-reveal이 사용자
청구액에 거의 영향을 주지 않습니다.

</details>

---

*Previous: [Part 3 — On-Chain SVG NFT](./03-onchain-svg-nft.md)*
*Next: [Part 5 — attoUSD + Chainlink Dual-Path Oracle](./05-dual-path-oracle.md)*
