# Security Policy — dexignation-docs / 보안 정책

This repository contains documentation only — no on-chain code, no user
data, no secrets. Security issues here are usually low-impact compared
to the contracts or backend, but we still take them seriously.

본 저장소는 문서만 포함합니다 — 온체인 코드 없음, 사용자 데이터 없음, 시크릿
없음. 보안 이슈의 영향은 일반적으로 컨트랙트나 백엔드보다 낮지만 진지하게
다룹니다.

---

## Reporting / 제보

**Do not open public GitHub issues for security vulnerabilities.**

**보안 취약점은 공개 GitHub 이슈로 올리지 마세요.**

- **Email**: `security@dexignation.io`
- **Website**: https://dexignation.com

---

## In scope / 범위 내

- Cross-site scripting (XSS) in MDX content or custom components
- Build / deploy pipeline issues that could leak secrets or allow
  unauthorised content injection
- Misleading documentation that could cause users to lose funds
  (e.g. wrong integration examples that send funds to dead addresses)
- Phishing or impersonation via the docs site

---

## Out of scope / 범위 외

- Typos and broken links (open a normal issue or PR)
- Smart contract vulnerabilities — report at
  [`dexignation-contracts`](https://github.com/DEXignation/dexignation-contracts/security)
- API vulnerabilities — report at
  [`dexignation-api`](https://github.com/DEXignation/dexignation-api/security)
