# PRD — Compulocks Design System Distribution Layer
**Date:** 2026-05-14  
**Owner:** Ori Shavit  
**Status:** Approved

---

## Purpose

Define requirements for the system that distributes the Compulocks design system to all AI agents across all platforms, with human-gated approval as the enforcement mechanism.

---

## User Stories

### Agents (consumers)

**US-01** — As a code agent starting a frontend task, I can retrieve the full token set in one call so I never hardcode design values.

**US-02** — As a code agent, I can retrieve the list of all stable components with their variants and states so I know exactly what's available to use.

**US-03** — As a code agent, I can read usage rules and do/don't guidelines for any component so I use them correctly.

**US-04** — As a code agent, when I need a component that doesn't exist in the stable manifest, I can file a structured design request and receive a clear "parked" status so the gap is visible without me improvising.

**US-05** — As a code agent, I can access the design system from any environment — Claude Code terminal, Codex terminal, Claude.ai web session, or any other LLM — without environment-specific configuration.

**US-06** — As a UX-prep agent, I can analyze a feature brief and produce a UI prep sheet — component map, token variables, design gaps — before any coder agent starts implementation.

### Authorized humans (approvers)

**US-07** — As an authorized contributor, I can visually review any new component in a rendered HTML page before approving it so I'm evaluating the actual output, not code.

**US-08** — As an authorized contributor, I can approve a component with a single command so the time from "looks good" to "available to agents" is under 30 seconds.

**US-09** — As an authorized contributor, I can see all pending design requests logged by agents so I have a prioritized queue of what the team needs next.

**US-10** — As an authorized contributor, I can add or remove contributors by editing a JSON file in a PR so access control is auditable and version-controlled.

**US-11** — As an authorized contributor, I can trigger a full design system refresh — regenerating all artifacts and syncing the vault — with a single command.

### Team / org

**US-12** — As a team lead, I need confidence that no agent has ever approved its own component or modified token values without human sign-off.

**US-13** — As a new team member, I can open one HTML file and immediately understand the entire design system — tokens, components, patterns, icons — without reading code.

---

## Functional Requirements

### FR-01: MCP Server

- MUST expose all tools defined in the architecture doc via MCP protocol
- MUST support both stdio transport (terminal agents) and HTTP transport (web/other LLMs)
- MUST enforce contributor authorization on all write tools before execution
- MUST reject unauthorized write calls with a structured error and log the attempt
- MUST hot-reload manifest and tokens without restart when files change on disk
- MUST return stable-only components from `get_manifest` and `list_components`
- MUST include a `get_component` tool that returns full detail for a single component by name

### FR-02: Authorization

- MUST read `contributors.json` from the repo root on every write call (not cached)
- MUST reject any call where `contributor_id` is absent, empty, or not in the list
- MUST write every write action (approved, rejected) to `design-audit.log` with timestamp, caller, and action
- MUST NOT allow agents to pass a `contributor_id` to bypass auth — write tools available to agents (request_component) do not accept a contributor_id parameter at all

### FR-03: Living HTML

- MUST be generated entirely from `tokens/*.json`, `component-manifest.json`, and component source files — no hand-authoring
- MUST render every component in every variant and every state
- MUST visually distinguish draft components (e.g. warning banner, muted opacity) from stable ones
- MUST display a "last generated" timestamp prominently
- MUST include a sticky approval toolbar listing all draft components with copy-paste approve commands
- MUST be a single self-contained HTML file (no external dependencies at runtime)
- MUST include dark mode section showing all foundation tokens in both modes

### FR-04: Vault

- MUST be populated at `~/.compulocks/design/` on every successful `npm run build`
- MUST contain `tokens.json`, `manifest.json`, `SPEC.md`, and `.last-updated`
- `manifest.json` in vault MUST contain only stable components
- MUST be readable by agents as a fallback when MCP server is unreachable

### FR-05: Component Status

- MUST support three statuses: `draft`, `stable`, `deprecated`
- All existing components in `component-manifest.json` MUST be migrated to `status: stable` as part of initial setup
- New components added via story MUST default to `status: draft`
- `npm run approve <ComponentName>` MUST flip status to stable, trigger rebuild, and sync vault

### FR-06: Design Requests

- `request_component` tool MUST append to `design-requests.md` — never overwrite
- Each entry MUST include: component name, reason, usage context, requesting agent/session, ISO timestamp
- `get_requests` tool MUST return all open (unresolved) requests, sorted by date
- A request is marked resolved when its component reaches `stable` status

### FR-07: Skill

- MUST be invocable as `/design-system` in Claude Code sessions
- MUST wrap MCP tool calls — not reimplement logic
- Write sub-commands MUST pass `contributor_id` from session context and enforce auth via server

### FR-08: UX-Prep Agent

- MUST be invocable as a named role in any agent session
- MUST always call `list_components`, `get_tokens`, and `get_spec` before analyzing a brief
- MUST produce a structured UI prep sheet (component map + token variables + design requests + dark mode + a11y)
- MUST file `request_component` for every identified gap before handing off to coder agent
- MUST NOT proceed to implementation — hand-off only

---

## Non-Functional Requirements

### NFR-01: Performance
- MCP server cold start: under 2 seconds
- `get_tokens`, `get_manifest`, `list_components`: under 100ms response
- `npm run build` (full rebuild + vault sync): under 10 seconds

### NFR-02: Reliability
- Server MUST gracefully handle missing vault files (return structured error, not crash)
- Approve command MUST be idempotent — approving a stable component is a no-op, not an error

### NFR-03: Auditability
- Every write action logged to `design-audit.log` with: timestamp, contributor_id, action, component name
- Log is append-only, committed to git

### NFR-04: Portability
- MCP server MUST run on macOS, Windows, and Linux
- Vault path `~/.compulocks/design/` MUST resolve correctly on all three platforms
- HTTP transport MUST be configurable (port, host) via environment variable

### NFR-05: Offline operation
- Terminal agents MUST be able to read design system data from vault without the MCP server running
- Vault staleness MUST be surfaced (`.last-updated` timestamp) but not block reads

---

## Out of Scope

| Item | Reason |
|------|--------|
| Figma → repo auto-sync | Separate project, depends on Figma API tier |
| Cloud/hosted MCP server | Local-only for now; future when team scales |
| Multi-machine vault sync | Out of scope; vault is per-machine |
| Visual diff of component changes | Nice-to-have, post-v1 |
| Component usage analytics | Post-v1 |

---

## Acceptance Criteria

- [ ] Agent on Claude Code terminal can call `list_components` and receive only stable components
- [ ] Agent on Claude.ai web can call `get_tokens` over HTTP and receive current token values
- [ ] Unauthorized agent call to `approve_component` returns error and is logged
- [ ] `npm run approve Button` flips Button to stable, rebuilds, and vault is updated within 10 seconds
- [ ] `design-system/index.html` renders all components with draft warning on unapproved ones
- [ ] `design-requests.md` receives a new entry when agent calls `request_component`
- [ ] `/design-system` skill works in a Claude Code session without additional configuration
- [ ] UX-prep agent produces a complete prep sheet for a sample feature brief
- [ ] All existing 6 components (`Button`, `Card`, `Input`, `Badge`, `Tag`, `Chip`) are `stable` from day one
