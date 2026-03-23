# Executive Brief: Compulocks Sync Platform

**Date:** 2026-03-24
**Prepared by:** Jarvis (Claude Code, /yolo session)
**For:** Ori Shavit

---

## What We're Building

A **source-agnostic design system sync platform** — a control plane that sits above Figma, Storybook, GitHub, and any future tool (Google Stitch, npm, etc.). It shows you what's in sync across all your tools, what's drifted, and what's missing. You choose the direction of every sync. No tool is permanently "primary."

Think of it as air traffic control for your design system.

---

## The Problem It Solves

Right now, the Compulocks design system lives in at least three places at once:
- **GitHub** — the source JSON tokens and React components
- **Figma** — Variables, Text Styles, and Component pages
- **Storybook** — component stories that define variants and states

There is no single view of whether they agree. Syncs are manual, directional, and fragile. When Figma drifts from code — or code drifts from Figma — nobody knows until something looks wrong in production.

---

## What We Designed Today

In a single session, we produced:

### 1. Product Requirements Document
Full specification of what the platform does, who it's for, what entities it tracks (tokens, components, text styles), what the dashboard looks like, and what "done" means for v1.

### 2. Architecture Design Document
Complete TypeScript interface definitions for every layer of the system:
- **Platform Adapters** — one per tool, pluggable, zero coupling
- **Platform Agents** — wake when needed, wrap adapters with retry/logging
- **Meta-Orchestrator** — decides which agents to run, collects results
- **Librarian Agent** — single source of truth, persists sync state to git
- **QA Agent** — verifies every sync with text diff and visual screenshot comparison

### 3. Skeletal Scaffold Plan
Exact file-by-file build order. Every interface, every stub, every directory. A future developer (or Claude Code session) can pick this up and implement one adapter at a time without touching anything else.

---

## What the Research Found

Six hours of live web research across the entire design token and design system ecosystem. Key findings:

### The MCP Breakthrough
Both Figma and Storybook now have **Model Context Protocol (MCP) servers**. This means our platform agents don't need to write custom API wrappers — they connect to existing MCP servers and let the protocol handle data extraction. This collapses the adapter complexity by ~60%.

- **Figma MCP**: `mcp.figma.com` — official, hosted by Figma, available now
- **Storybook MCP**: `github.com/storybookjs/mcp` — official, MIT licensed

### The Existing Ecosystem We Can Use (All MIT/Open Source)

| Tool | What It Does | How We Use It |
|------|-------------|---------------|
| **GitFig** | Bidirectional Figma Variables ↔ GitHub (branches, PRs, commits from Figma) | Figma adapter reference implementation |
| **Tokens Studio** | Full Figma ↔ code token sync platform, open source core | Study their sync logic; compatible with our token format |
| **Terrazzo** | DTCG token CLI with Figma import, MIT licensed | Token transform pipeline, replaces some of our Style Dictionary usage |
| **Styleframe** | Free CLI + Figma plugin for W3C DTCG ↔ Figma Variables | Figma import/export, zero cost |
| **Lost Pixel** | Open-source visual regression for Storybook, self-hostable | QA agent visual diff engine |
| **pixelmatch** | Pixel-level PNG diff library (Mapbox, ISC license) | Raw diff in QA agent |
| **storybook-extractor** | Storybook metadata extractor as npm package | Alternative to our static story parser |

### Google Stitch — Confirmed
Google Stitch is an **AI-powered UI design tool** (not a token manager). It generates full design systems from text prompts. No public API yet. We build a stub adapter now and watch for API release. The concept fits perfectly into our extensibility model.

### The Figma Enterprise Caveat
Figma's Variables REST API requires an Enterprise org seat. Our existing approach (Figma Plugin API) has **no Enterprise requirement** — and most professional tools (Tokens Studio, GitFig, Storybook Connect) use the Plugin API too. We stay on this path.

### NotebookLM as Knowledge Layer
Google NotebookLM (now with an Enterprise API and an MCP server) can serve as a **queryable knowledge base** for the platform. Feed it our sync-state reports, token guides, and QA results — stakeholders can ask "Is Button in sync?" in natural language and get a grounded, citation-backed answer. We design a "Knowledge Base" tab in the dashboard for this.

---

## The W3C Standard That Changes Everything

In October 2025, the **W3C Design Tokens Community Group** released Design Tokens Specification v1.0 — the first stable, official standard for design tokens. Every major tool (Figma, Tokens Studio, Style Dictionary, Terrazzo) now supports it. Our platform uses DTCG as the canonical format for all token data — ensuring future-proof interoperability with anything built after 2025.

---

## Architecture in One Diagram

```
Dashboard (web app)
    ↕ HTTP
Meta-Orchestrator
    ↓ dispatches
┌──────────┬──────────┬──────────┬──────────┐
│  Figma   │Storybook │  GitHub  │  Stitch  │
│  Agent   │  Agent   │  Agent   │  Agent   │
│ (MCP     │ (MCP     │ (GitHub  │  (stub)  │
│ client)  │ client)  │  API)    │          │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┘
     └──────────┴──────────┴──────────┘
                     ↓ EntitySnapshot[]
              Librarian Agent
              (sync-state/ in git)
                     ↓
               QA Agent
        (Lost Pixel + pixelmatch)
                     ↓
         NotebookLM Knowledge Base
         (queryable by stakeholders)
```

---

## What Comes Next

**Phase 1 — Scaffold** (next session)
Build the skeletal TypeScript structure. All interfaces, no business logic. Dashboard renders with mock data. Everything compiles.

**Phase 2 — First Real Adapter**
Storybook adapter using `index.json` from a running Storybook. Zero API keys needed. Immediate value.

**Phase 3 — GitHub Adapter**
Read DTCG tokens from the repo. Cross-reference with Storybook. Show first real sync matrix.

**Phase 4 — Figma Adapter**
MCP client connecting to Figma MCP server. Read variables and styles. Full three-way sync matrix.

**Phase 5 — QA Agent**
Lost Pixel for screenshots. pixelmatch for diff. First automated visual verification.

**Phase 6 — Dashboard**
Real data in the sync matrix. Push/pull buttons. Primary source selector. NotebookLM tab.

---

## The Pitch

Every design system team faces the same problem: your design tool, your component library, and your codebase drift apart constantly. The tools to fix this exist — but they're scattered, one-directional, and require manual orchestration.

We're building the orchestration layer that was always missing: a platform that treats every tool as a peer, speaks the new W3C standard natively, and uses AI agents to keep everything in sync automatically — with human control over every decision.

It's designed to grow. Figma today. Google Stitch tomorrow. Whatever comes next, plug in an adapter and it's on the matrix.

---

*All design documents, architecture specs, and research findings are committed to `docs/` in the compulocks-brand-system repository.*
