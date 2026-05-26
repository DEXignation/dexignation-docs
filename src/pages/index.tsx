// SPDX-License-Identifier: MIT
//
// Landing page for the documentation site.
// 문서 사이트의 랜딩 페이지.

import type { ReactNode } from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";

function Hero(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header
      style={{
        padding: "5rem 1rem",
        textAlign: "center",
        background:
          "linear-gradient(180deg, rgba(0,220,130,0.08) 0%, rgba(0,0,0,0) 100%)",
      }}
    >
      <div className="container">
        <h1
          style={{
            fontSize: "3rem",
            fontWeight: 800,
            marginBottom: "1rem",
          }}
        >
          {siteConfig.title}
        </h1>
        <p style={{ fontSize: "1.25rem", marginBottom: "2rem", opacity: 0.85 }}>
          {siteConfig.tagline}
        </p>
        <p style={{ opacity: 0.7, marginBottom: "2rem" }}>
          블록체인 주소를 사람이 읽을 수 있는 이름으로 — Polygon 네이티브 네임 서비스.
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          <Link className="button button--primary button--lg" to="/docs/intro">
            Read the docs →
          </Link>
          <Link
            className="button button--secondary button--lg"
            href="https://github.com/DEXignation"
          >
            GitHub
          </Link>
        </div>
      </div>
    </header>
  );
}

interface FeatureProps {
  title: string;
  description: ReactNode;
  href: string;
}

const FEATURES: FeatureProps[] = [
  {
    title: "ERC-721 ownership",
    description:
      "Every name is a transferable NFT with fully on-chain SVG metadata. No IPFS, no external server.",
    href: "/docs/concepts/onchain-svg",
  },
  {
    title: "Stablecoin payments",
    description:
      "Pay rent in USDC or USDT (or POL). USD-pegged pricing via Chainlink, ceiling-rounded for safety.",
    href: "/docs/concepts/dual-path-oracle",
  },
  {
    title: "Multi-chain resolution",
    description:
      "One .dex name resolves to addresses on Polygon, Ethereum, BNB Chain, Bitcoin, Solana — all at once.",
    href: "/docs/concepts/multichain-resolution",
  },
  {
    title: "Front-running protection",
    description:
      "Commit-reveal registration prevents MEV bots from sniping your name out of the mempool.",
    href: "/docs/concepts/commit-reveal",
  },
];

function FeatureCard({ title, description, href }: FeatureProps): ReactNode {
  return (
    <Link
      to={href}
      className={clsx("card padding--lg", "margin-bottom--md")}
      style={{
        display: "block",
        height: "100%",
        textDecoration: "none",
        border: "1px solid var(--ifm-color-emphasis-300)",
      }}
    >
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <p style={{ marginBottom: 0, opacity: 0.85 }}>{description}</p>
    </Link>
  );
}

function Features(): ReactNode {
  return (
    <section style={{ padding: "4rem 1rem" }}>
      <div className="container">
        <h2 style={{ textAlign: "center", marginBottom: "2rem" }}>
          What makes it different
        </h2>
        <div className="row">
          {FEATURES.map((f) => (
            <div key={f.title} className="col col--6">
              <FeatureCard {...f} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <Hero />
      <main>
        <Features />
      </main>
    </Layout>
  );
}
