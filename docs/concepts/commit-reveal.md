---
sidebar_position: 2
title: Commit-Reveal Registration
---

# Commit-Reveal Registration

DEXignation protects names from **front-running** with the commit-reveal
pattern. Registration is split into two transactions:

DEXignation은 이름 등록을 **commit-reveal** 두 단계로 분리하여
프론트러닝을 방어합니다.

1. **Commit** — submit a hash that depends on (label, owner, secret).
2. **Wait** — at least `minCommitmentAge` (30 seconds by default).
3. **Reveal/register** — submit the actual label and secret; the
   contract verifies the hash matches.

A bot watching the mempool sees only the opaque hash, not the label,
so it can't front-run.

봇이 멤풀에서 볼 수 있는 것은 불투명한 해시뿐. 라벨을 못 보므로 가로채기
불가.

---

## API

```solidity
function makeCommitment(string calldata name, address owner, bytes32 secret)
    external pure returns (bytes32);

function commit(bytes32 commitment) external;

function register(
    string calldata label,
    address owner,
    uint256 duration,
    address resolver,
    bytes32 secret
) external payable;
```

---

## Time windows / 시간 윈도우

| Parameter | Default | Purpose |
|---|---|---|
| `minCommitmentAge` | 30 seconds | Security floor — bot can't catch up |
| `maxCommitmentAge` | 1 hour | UX ceiling — stale commits expire |

Owner can tune via `setCommitmentAgeSettings(minAge, maxAge)`.

오너가 `setCommitmentAgeSettings`로 조정 가능.

---

## Full deep-dive

→ [Blog: Stopping front-running with commit-reveal](/blog/commit-reveal)
