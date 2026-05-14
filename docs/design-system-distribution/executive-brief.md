# Executive Brief — Compulocks Design System Distribution
**Date:** 2026-05-14  
**Author:** Ori Shavit  
**Status:** Approved for development

---

## The Problem

Compulocks engineers and AI agents build UI across multiple repositories, terminals, and LLM environments. Every one of them makes micro-decisions about colors, spacing, components, and typography — and without a shared, enforced source of truth, those decisions diverge. The result is inconsistent UI, duplicated effort, and design debt that compounds with every new feature.

The existing `compulocks-brand-system` repo has the right instincts — tokens, a component library, Storybook, a manifest — but none of it is actively connected to the agents doing the work. An agent starting a frontend task today reads nothing. It guesses.

---

## The Solution

A **Design System Distribution Layer** — a local MCP server, a skill, and an agent persona — that makes the Compulocks design system the mandatory first read for any agent touching UI, across every platform the company uses.

Three properties define the system:

**1. Read everywhere, write nowhere (for agents)**  
Any agent on any platform — Claude Code, Codex, Claude.ai web, GPT, Gemini — can read the current token set and stable component library via the MCP server. No agent can modify it.

**2. Human-gated approval**  
A named-contributors whitelist controls all write operations. New components live in `draft` status — invisible to agents — until an authorized human reviews the living HTML reference and explicitly approves. One command. Instant propagation.

**3. Request-and-park, not improvise**  
When an agent needs a component that doesn't exist, it files a structured design request and stops. It does not invent styles. The gap becomes visible, prioritized, and resolved through the human design loop — not papered over with one-off CSS.

---

## Why This Matters

| Without this | With this |
|---|---|
| Agents hardcode colors | Agents use `--color-brand-primary` |
| UI diverges across repos | One token set, everywhere, always current |
| New components invented ad-hoc | Gaps logged, designed properly, approved |
| Design system ignored in practice | Design system is the mandatory starting point |
| Only works in terminal | Works in Claude Code, Codex, Claude.ai, GPT, Gemini |

---

## Scope

This project delivers:
- A local MCP server (`compulocks-design-mcp`) with read + authorized-write tools
- A living HTML design reference (auto-generated, human-reviewable)
- A `ux-prep` agent persona that runs before every frontend task
- A `/design-system` skill for terminal-based sessions
- A contributors whitelist enforcing who can approve
- Vault sync to `~/.compulocks/design/` for offline terminal access

**Out of scope (future):** Figma auto-sync, cloud/hosted MCP, multi-machine vault sync.

---

## Success Criteria

1. Any agent on any supported platform can retrieve current tokens and stable components in one call
2. No agent can approve a component or modify the manifest without being on the contributors list
3. `npm run build` regenerates all artifacts and updates the vault in under 10 seconds
4. A new component goes from "designed" to "available to all agents" with a single `approve` command
5. Design requests logged by agents are visible and actionable within one session
