<div align="center">

# dexignation-docs

**Official documentation site for the DEXignation protocol.**

DEXignation 프로토콜 공식 문서 사이트.

[![Website](https://img.shields.io/badge/Website-dexignation.com-00DC82.svg)](https://dexignation.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Docusaurus](https://img.shields.io/badge/Built%20with-Docusaurus-3578E5.svg)](https://docusaurus.io/)

</div>

---

## What is this? / 이 저장소는?

This is the source for **https://docs.dexignation.com** — the official
docs site for the DEXignation protocol. Built with
[Docusaurus 3](https://docusaurus.io/) and deployed via GitHub Actions.

본 저장소는 **https://docs.dexignation.com**의 소스입니다. [Docusaurus 3](https://docusaurus.io/)
기반이며 GitHub Actions로 배포됩니다.

---

## Content layout / 콘텐츠 구조

```
docs/
├── intro.md                    Landing page entry / 진입점
├── concepts/                   Conceptual overviews (one per topic)
│   ├── namehash.md
│   ├── commit-reveal.md
│   ├── onchain-svg.md
│   ├── dual-path-oracle.md
│   └── multichain-resolution.md
├── architecture/               Implementation-level details
│   ├── overview.md
│   ├── registry.md
│   ├── registrar.md
│   ├── resolver.md
│   ├── oracle.md
│   └── full-architecture.md   Mirrors dexignation-contracts/docs/architecture.md
└── guides/                     How-to recipes
    ├── resolve-a-name.md
    ├── register-a-name.md
    └── integrate-snap.md

blog/                           Long-form posts (Medium-style series)
├── 2026-05-01-why-dexignation.md
├── 2026-05-08-namehash-explained.md
├── 2026-05-15-onchain-svg-nft.md
├── 2026-05-22-commit-reveal.md
├── 2026-05-29-dual-path-oracle.md
├── 2026-06-05-multichain-resolution.md
├── authors.yml
└── tags.yml
```

---

## Development / 개발

### Prerequisites / 사전 요구사항

- Node.js v22+

### Quick start / 빠른 시작

```bash
git clone https://github.com/DEXignation/dexignation-docs
cd dexignation-docs
npm install
npm start
```

The site opens at `http://localhost:3000` with live reload.

`http://localhost:3000`에서 라이브 리로드 함께 열립니다.

### Build / 빌드

```bash
npm run build
npm run serve   # serve the production build locally
```

The static site is generated into `build/`.

`build/`에 정적 사이트가 생성됩니다.

---

## Writing docs / 문서 작성

- **Concepts** — conceptual overviews. Aim for 1–2 screens of text per page.
  Each page links to the deeper blog post.
- **Architecture** — implementation-level details. Cross-link to source
  in `dexignation-contracts` with permalinks.
- **Guides** — task-oriented how-to. Concrete code, copy-pasteable.
- **Blog** — long-form thinking, originally the Medium series.

We maintain **bilingual content** (English first, Korean follows in
the same page). Korean is collapsed in `<details>` blocks where natural,
or interleaved with the English where the page is short.

**이중언어** 유지 (영어 우선, 한국어 동반). 자연스러운 곳에서는 `<details>`
블록으로 접고, 짧은 페이지에서는 영어와 인터리브.

---

## Deployment / 배포

GitHub Actions builds and deploys on every push to `main`. The deploy
target is GitHub Pages with a custom domain.

GitHub Actions가 `main` 푸시마다 빌드·배포. 커스텀 도메인의 GitHub Pages 대상.

To deploy manually:

```bash
GIT_USER=<your-username> npm run deploy
```

---

## Related repositories / 관련 저장소

| Repo | Purpose |
|---|---|
| [`dexignation-contracts`](https://github.com/DEXignation/dexignation-contracts) | Smart contracts |
| [`dexignation-api`](https://github.com/DEXignation/dexignation-api) | Backend services |
| [`dexignation-snap`](https://github.com/DEXignation/dexignation-snap) | MetaMask Snap |
| [`dexignation-docs`](https://github.com/DEXignation/dexignation-docs) | This repo |

---

## License / 라이선스

MIT. See [`LICENSE`](./LICENSE).
