# Tech Stack — Compulocks Design System Distribution Layer
**Date:** 2026-05-14

---

## Guiding Principles

1. **Extend, don't replace** — the repo already has Style Dictionary v5, TypeScript, Node.js, and a working build pipeline. Everything new must plug into that.
2. **No new runtime dependencies in consumers** — agents read from the MCP server or vault. No npm install required in every repo.
3. **Standard protocols** — MCP is the transport layer. HTTP is the fallback. No proprietary agent SDKs.
4. **Single language** — TypeScript throughout. Compiled to JavaScript for Node.js runtime.

---

## Stack

### MCP Server

| Layer | Choice | Reason |
|-------|--------|--------|
| Runtime | Node.js 20+ | Already used in repo. No new runtime. |
| Language | TypeScript | Consistent with existing codebase. |
| MCP SDK | `@modelcontextprotocol/sdk` | Official SDK — handles stdio + HTTP transports, tool definitions, schema validation. |
| HTTP transport | MCP SDK built-in HTTP server | Port 3333 by default, configurable via `COMPULOCKS_MCP_PORT` env var. |
| File watching | `chokidar` | Hot-reload manifest + tokens on file change without restart. Already in ecosystem. |
| Auth | Plain JSON (`contributors.json`) read on every write call | No auth library needed. Append-only audit log via `fs.appendFile`. |
| Build | `tsup` | Already used in repo for component library. Reuse same config pattern. |

### Living HTML Generator

| Layer | Choice | Reason |
|-------|--------|--------|
| Runtime | Node.js script (`generate-living-html.mjs`) | Same pattern as existing `build-tokens.mjs`. |
| Templating | Template literals (no framework) | Zero dependencies. Self-contained output. HTML already uses Barlow/Barlow Condensed from CDN. |
| Component rendering | Static HTML from story metadata + token values | No headless browser needed — components are described in stories; we render token-driven specimens directly. |
| Output | Single `.html` file with all CSS inlined | No external deps at open time. Committed to repo. |

### Vault Sync

| Layer | Choice | Reason |
|-------|--------|--------|
| Script | `scripts/sync-vault.mjs` | Node.js `fs` — no deps. Copies 3 files to `~/.compulocks/design/`. Cross-platform path via `os.homedir()`. |
| Trigger | Called at end of `npm run build` | Zero friction — happens automatically on every approved build. |

### Approval CLI

| Layer | Choice | Reason |
|-------|--------|--------|
| Script | `scripts/approve.mjs` | Reads `component-manifest.json`, finds component by name, flips status, writes back, triggers build. |
| Auth check | Reads `contributors.json`, checks `COMPULOCKS_CONTRIBUTOR` env var or prompts for ID | Same auth logic as server — consistent enforcement. |
| Audit | Appends to `design-audit.log` | Plain text, append-only, committed to git. |

### Skill (Claude Code)

| Layer | Choice | Reason |
|-------|--------|--------|
| Format | Markdown skill file (`.claude/skills/design-system.md`) | Standard Claude Code skill format — no code execution at skill definition time. |
| Execution | Instructs Claude to call MCP tools | The MCP server is registered in `.claude/settings.json` — tools are natively available in session. |

### UX-Prep Agent Persona

| Layer | Choice | Reason |
|-------|--------|--------|
| Format | Markdown agent persona (`agents/ux-prep.md`) | Compatible with Claude Code agent dispatch system already in this repo. |
| Tool calls | MCP tools via registered server | Same server, same tools — no separate interface. |

### Design Requests

| Layer | Choice | Reason |
|-------|--------|--------|
| Storage | `design-requests.md` (append-only markdown) | Human-readable, git-tracked, no database. Agents append via `request_component` tool. |
| Format | Structured markdown table row per request | Easy to read, easy to parse programmatically if needed later. |

---

## Dependencies

### New production dependencies (mcp-server only)

```json
{
  "@modelcontextprotocol/sdk": "^1.x",
  "chokidar": "^3.x"
}
```

### No new dependencies in:
- `compulocks-brand-system` root (build scripts use only Node.js built-ins + existing Style Dictionary)
- Consumer repos (read via MCP — no install required)

---

## MCP Server Registration

### Claude Code (terminal)

In `.claude/settings.json` (project-level) or `~/.claude/settings.json` (global):

```json
{
  "mcpServers": {
    "compulocks-design": {
      "command": "node",
      "args": ["C:/Users/OriShavit/Documents/GitHub/compulocks-brand-system/mcp-server/dist/index.js"],
      "env": {
        "COMPULOCKS_MCP_PORT": "3333"
      }
    }
  }
}
```

### Codex

In `~/.codex/AGENTS.md`:
```
MCP server: compulocks-design
Command: node ~/Documents/GitHub/compulocks-brand-system/mcp-server/dist/index.js
```

### Claude.ai web / other LLMs

MCP over HTTP — point to `http://localhost:3333`. For remote access, expose via local tunnel (e.g. `ngrok`, `cloudflared`) or LAN IP. API key header `X-Compulocks-Key` checked server-side (env var `COMPULOCKS_API_KEY`).

---

## File Structure

```
compulocks-brand-system/
├── mcp-server/
│   ├── package.json              ← separate package, own deps
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts              ← entry: start stdio + HTTP transports
│   │   ├── auth.ts               ← contributor check + audit log
│   │   ├── data.ts               ← read tokens, manifest, spec from disk
│   │   ├── watcher.ts            ← chokidar hot-reload
│   │   └── tools/
│   │       ├── read.ts           ← get_tokens, get_manifest, get_spec, get_component, list_components
│   │       ├── request.ts        ← request_component
│   │       └── write.ts          ← approve_component, refresh, get_requests
│   └── dist/                     ← compiled output (gitignored)
│
├── scripts/
│   ├── generate-living-html.mjs  ← builds design-system/index.html
│   ├── sync-vault.mjs            ← copies artifacts to ~/.compulocks/design/
│   └── approve.mjs               ← CLI approve command
│
├── design-system/
│   └── index.html                ← generated, committed
│
├── contributors.json             ← write-access whitelist
├── design-requests.md            ← agent-logged gaps
├── design-audit.log              ← write action log (append-only)
│
└── .claude/
    └── skills/
        └── design-system.md      ← /design-system skill
```

---

## Build Pipeline (updated)

```
npm run build
  1. Style Dictionary → build/css/variables.css, build/ts/tokens.ts, build/json/tokens.json
  2. generate-living-html.mjs → design-system/index.html
  3. sync-vault.mjs → ~/.compulocks/design/{tokens.json, manifest.json, SPEC.md, .last-updated}
  4. MCP server hot-reloads (chokidar detects manifest.json change)

npm run approve <ComponentName>
  1. Check COMPULOCKS_CONTRIBUTOR against contributors.json
  2. Flip status in component-manifest.json
  3. Append to design-audit.log
  4. Trigger npm run build (steps 1-4 above)

npm run mcp:start
  Start MCP server (stdio + HTTP on port 3333)

npm run mcp:build
  tsup → mcp-server/dist/
```

---

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `COMPULOCKS_MCP_PORT` | `3333` | HTTP transport port |
| `COMPULOCKS_MCP_HOST` | `127.0.0.1` | HTTP bind address |
| `COMPULOCKS_API_KEY` | — | Required for HTTP write calls from non-local clients |
| `COMPULOCKS_CONTRIBUTOR` | — | Pre-set contributor ID for approve CLI (skips prompt) |
| `COMPULOCKS_VAULT_PATH` | `~/.compulocks/design` | Override vault location |
