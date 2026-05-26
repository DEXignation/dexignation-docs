// SPDX-License-Identifier: MIT
//
// Documentation sidebar layout.
// 문서 사이드바 구성.

import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    "intro",
    {
      type: "category",
      label: "Concepts",
      items: [
        "concepts/namehash",
        "concepts/commit-reveal",
        "concepts/onchain-svg",
        "concepts/dual-path-oracle",
        "concepts/multichain-resolution",
      ],
    },
    {
      type: "category",
      label: "Architecture",
      items: [
        "architecture/overview",
        "architecture/registry",
        "architecture/registrar",
        "architecture/resolver",
        "architecture/oracle",
        "architecture/full-architecture",
      ],
    },
    {
      type: "category",
      label: "Guides",
      items: [
        "guides/resolve-a-name",
        "guides/register-a-name",
        "guides/integrate-snap",
      ],
    },
  ],
};

export default sidebars;
