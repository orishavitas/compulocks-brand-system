# Executive Brief: Design Thinking and AI-Integrated Architecture

**Date:** 2026-03-25
**Audience:** Technical leadership, architect, or engineering director
**Purpose:** Record of design decisions with reasoning — the principles behind the platform and how AI tooling was integrated into the development process itself

---

## The Design Problem

Design systems are multi-source by nature. A mature design system exists simultaneously in Figma (as Variables and Components), in a component library (as React components with variants and states), in a token repository (as JSON files in DTCG format), and in a documentation layer (Storybook). These sources drift apart constantly — not because teams are careless, but because each source has its own editing workflow and no tool mediates between them. A designer updates a color in Figma. An engineer updates the same token in JSON. Three weeks later, a component in Storybook is rendering neither value.

Existing solutions (Tokens Studio, GitFig, Supernova) are one-directional and tightly coupled to a specific source hierarchy. Figma is always primary. Code is always secondary. This locks teams into a power structure that does not reflect how design systems actually evolve. Tokens frequently originate in code during a sprint, then flow to Figma after a design review. Sometimes Figma is ahead by several iterations because the designer is prototyping before the engineer is ready to implement. The primary source changes depending on the phase of work. Hardcoding a hierarchy into the tooling forces teams to work around it.

---

## The Architectural Principle: Sources Are Peers

The central design decision is that no source is permanently primary. Every tool — Figma, Storybook, GitHub, and any future tool — is a peer adapter. The system observes all of them, computes divergence, and presents a sync matrix. The human decides the direction of each sync operation.

This is realized through the `PlatformAdapter` protocol: a thin, uniform interface (`fetchAll`, `write`, `ping`, `capabilities`) that decouples the orchestration layer from any specific tool's API. Adding a new source means adding one new adapter file. The orchestrator does not change. The librarian does not change. The diff logic does not change. The dashboard does not change. The new adapter registers itself via `registerAllAdapters()` at every entry point, and the rest of the system treats it as a first-class source.

The `PlatformAgent` wrapper adds retry logic and structured logging on top of any adapter without touching the adapter's logic. This separation keeps the adapter implementations clean — they contain only the protocol translation for a specific tool — while the agent layer handles the operational concerns of running in a real environment where APIs fail intermittently.

The `MetaOrchestrator` dispatches all registered agents in parallel via `Promise.all()`. There is no predefined order, no source that is fetched first and used as a baseline. Every source is queried simultaneously. The diff runs on the merged results. This is not just a performance decision — it is an expression of the peer model at the execution layer.

---

## Capability-Aware Diff: Designing Against False Alarms

The most consequential design decision in the diff engine is capability filtering. A naive implementation would compare every entity across every registered source and flag anything missing from any source as a potential problem. This produces a large volume of false alarms that erode trust in the platform. Storybook knows nothing about tokens. GitHub knows nothing about component visual states in the way that Figma does. A token "missing in Storybook" is expected behavior, not a sync issue. Alerting on it is noise.

Each `PlatformAdapter` declares `capabilities.entityTypes[]` — an explicit list of the entity types it can observe. The `capableSources()` function in `librarian/diff.ts` queries the AdapterRegistry to filter the source list before computing `SyncStatus`. Only capable sources participate in status computation. A token that is "only-in" GitHub is not flagged as missing in Storybook — Storybook is simply not a participant in token status computation.

Non-capable sources are not hidden. They appear in the dashboard as `"unmatched"` for any entity type they do not support. This preserves transparency — a human can see that Storybook was present during the sync but does not track tokens — without inflating the problem count.

The principle behind this decision is that a sync platform's core value proposition is the accuracy of its alerts. A platform that generates many false positives will be tuned out. Capability filtering is the mechanism that makes every alert meaningful.

---

## The Librarian Pattern: Git as the Database

Persistence was a deliberate choice: `sync-state/state.json` is committed to git. This is not an interim measure pending a real database — it is the intended architecture.

Design system sync state is not high-frequency write data. A sync runs at most a few times per day, typically triggered by a code push or a Figma save event. The state is small: 37 entities produce a state file measured in kilobytes. What the state needs is auditability — when did an entity go drifted, what was the hash before a push, who set primary source and when. Git provides all of this for free: full history, human-readable diffs, a proven merge model, no operational burden, and no credentials or infrastructure to maintain.

Every `git log -- sync-state/` is a complete audit trail. Every `git diff` on `state.json` shows exactly which entities changed status and which hash values changed. This makes incident investigation trivial. If a token was pushed to Figma and something broke, the pre-push state is in git history. The diff shows exactly what changed.

The Librarian appends to `sync-state/log/activity.jsonl` on every sync, creating an append-only record of operations. Combined with git history on `state.json`, the audit coverage is complete.

---

## The QA Agent: Verification as a First-Class Concern

Most sync tools treat verification as an afterthought — a post-deploy check that runs separately from the sync operation and reports results in a different interface. The QA agent in this platform is a core pipeline step. It runs after every sync operation, before the `SyncResult` is returned to the caller. The orchestrator does not return a result without a `QAReport` attached.

The text diff component is live: it compares `CanonicalEntity` values before and after a sync and produces a structured record of what changed. The visual diff component — Playwright screenshots of Storybook before and after, compared via pixelmatch — is stubbed and targeted for Session G.

The reasoning behind making QA a pipeline step rather than an optional post-process is that it changes the semantics of a sync operation. A sync does not complete when data is written. It completes when the written data has been verified. This distinction matters for the trust model: a user who triggers a push from the dashboard needs to know not just that the write API returned 200, but that the entity in the destination source now matches the expected value.

---

## How AI Tooling Was Integrated

### NotebookLM as a Queryable Knowledge Base

The platform's design documents — the PRD, architecture specification, scaffold plan, research findings, and executive briefs — are loaded into a Google NotebookLM notebook accessible via the `notebooklm-mcp` MCP server. This serves two distinct purposes.

The first is cross-session architectural memory. Design decisions made in one session are queryable in future sessions grounded in the actual source documents, with citations, not in the LLM's training data. A session working on the Figma adapter can ask "what did we decide about Figma Enterprise requirements?" and receive a grounded answer citing the specific section of the architecture document that addressed it. This prevents architectural drift across sessions.

The second is the long-term plan for a dashboard "Knowledge Base" tab where product stakeholders can ask natural language questions grounded in `sync-state/state.json`. "Is Button in sync?" "What tokens does the Tag component use?" These questions have deterministic answers in the sync state, and the combination of structured state data and natural language querying makes those answers accessible to non-technical stakeholders without requiring them to read JSON files.

In practice, the NotebookLM knowledge base caught an architectural inconsistency during the first sync run. The run produced 37 entities all showing `only-in` status. The naive interpretation was that something was wrong with the diff. A query to the knowledge base returned a citation from the architecture document describing the expected behavior: all entities show `only-in` until at least two capable sources have data for the same entity type. The query also returned a reference to the capability-aware diff design — which, at that point, had not been fully implemented. The mismatch between the architectural intent documented in the notebook and the actual implementation triggered the fix to `capableSources()` in `librarian/diff.ts`.

### Claude Code as Orchestrator

The entire platform — from initial design through TypeScript implementation to the first sync run — was built in Claude Code sessions using structured skills and autonomous execution mode. Each session follows a defined ritual: read `CLAUDE.md` for current implementation status, run `bd ready` in the Beads task graph to identify unblocked work, claim a task atomically before starting, and close completed tasks with follow-up tasks created for discoveries. The NotebookLM notebook is updated with new architectural decisions after each major session, so the knowledge base grows with the project.

This creates a feedback loop that mirrors the design of the platform itself. The platform is source-agnostic and capability-aware — it does not assume which source is authoritative. The development process applies the same principle: no single session is authoritative. Architectural decisions are committed to a queryable knowledge base. The state of in-flight work is committed to a persistent task graph (Beads) that survives context compression. Both the product and the process are designed for continuity across session boundaries.

The design system synchronization problem and the multi-session AI development problem share the same structural challenge: multiple sources of truth that drift apart over time. The solutions applied to each are structurally identical.

---

## What This Architecture Is Designed to Become

The current implementation covers Phases 1 through 4 of an 8-phase build plan. The adapter protocol, capability system, and librarian pattern are deliberately over-specified for the current source set of two (Storybook and GitHub). This is intentional: the right time to establish clean abstractions is before the complexity arrives, not after.

The next forcing function is the Figma adapter. Connecting to the Figma MCP server will produce the first three-way sync matrix. At that point, `in-sync`, `drifted`, and `missing-in` entities will appear for the first time. A color token that exists in both GitHub (as DTCG JSON) and Figma (as a Variable) with matching values will show `in-sync`. The same token with differing values will show `drifted`. A component that exists in Storybook but not yet in Figma will show `missing-in` for Figma as a capable source.

This transition — from 37 `only-in` entities to a populated sync matrix with real status variation — is the point at which the platform becomes an actionable tool rather than data collection infrastructure. The architecture was designed to make that transition a configuration change, not a rewrite.
