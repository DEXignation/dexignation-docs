// SPDX-License-Identifier: MIT
//
// Docusaurus configuration for the official DEXignation documentation site.
// Deploys to https://docs.dexignation.com (or wherever you point it).
//
// DEXignation 공식 문서 사이트의 Docusaurus 설정.

import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "DEXignation",
  tagline: "Human-readable names for blockchain addresses on Polygon",
  favicon: "img/favicon.ico",

  url: "https://docs.dexignation.com",
  baseUrl: "/",

  organizationName: "DEXignation",
  projectName: "dexignation-docs",

  onBrokenLinks: "warn",
  onBrokenMarkdownLinks: "warn",

  i18n: {
    defaultLocale: "en",
    locales: ["en", "ko"],
    localeConfigs: {
      en: { label: "English" },
      ko: { label: "한국어" },
    },
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          editUrl:
            "https://github.com/DEXignation/dexignation-docs/edit/main/",
        },
        blog: {
          showReadingTime: true,
          editUrl:
            "https://github.com/DEXignation/dexignation-docs/edit/main/",
          feedOptions: {
            type: ["rss", "atom"],
            xslt: true,
          },
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: "img/social-card.png",
    navbar: {
      title: "DEXignation",
      logo: {
        alt: "DEXignation Logo",
        src: "img/logo.svg",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "tutorialSidebar",
          position: "left",
          label: "Docs",
        },
        { to: "/blog", label: "Blog", position: "left" },
        {
          type: "localeDropdown",
          position: "right",
        },
        {
          href: "https://github.com/DEXignation",
          label: "GitHub",
          position: "right",
        },
        {
          href: "https://dexignation.com",
          label: "Website",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            { label: "Introduction", to: "/docs/intro" },
            { label: "Architecture", to: "/docs/architecture/overview" },
            { label: "Guides", to: "/docs/guides/resolve-a-name" },
          ],
        },
        {
          title: "Code",
          items: [
            { label: "Contracts", href: "https://github.com/DEXignation/dexignation-contracts" },
            { label: "API", href: "https://github.com/DEXignation/dexignation-api" },
            { label: "MetaMask Snap", href: "https://github.com/DEXignation/dexignation-snap" },
          ],
        },
        {
          title: "Project",
          items: [
            { label: "Website", href: "https://dexignation.com" },
            { label: "GitHub", href: "https://github.com/DEXignation" },
            { label: "Security", href: "mailto:security@dexignation.io" },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} DEXignation. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["solidity", "bash", "json", "typescript"],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
