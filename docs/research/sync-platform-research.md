# Compulocks Sync Platform — Deep Research

**Started:** 2026-03-24
**Deadline:** 08:00 GMT+2 (Israel)
**Status:** 🔄 In Progress — Round 1 Complete, continuing

---

## MAJOR ARCHITECTURAL FINDING ⚡

Both Figma AND Storybook now have **MCP servers**. This means our platform agents don't need to write custom API wrappers — they can talk to both tools through the Model Context Protocol. This collapses the adapter layer significantly.

- **Figma MCP Server**: `https://mcp.figma.com/mcp` (official, hosted by Figma)
  - Tools: `get_variable_defs`, `get_design_context`, component extraction, token management
  - Can extract variables, styles, component data directly into AI context
  - Works with Claude Code natively
  - Source: https://help.figma.com/hc/en-us/articles/32132100833559

- **Storybook MCP Server** (official): `github.com/storybookjs/mcp`
  - Also: `github.com/mcpland/storybook-mcp` (community, Playwright-based)
  - Also: `@storybook/addon-mcp` (official Storybook addon)
  - Tools: `getComponentList`, `getComponentsProps`, component screenshots
  - Uses Playwright headless under the hood for prop extraction
  - Source: https://github.com/mcpland/storybook-mcp

**Implication**: Platform agents become MCP clients. The adapter is an MCP connection, not a raw HTTP wrapper.

---

## Google Stitch — Confirmed Identity

Google Stitch is **not** a design token manager — it's an **AI-powered UI design tool** (Google Labs, launched Google I/O 2025).

**What it is:**
- AI-native infinite canvas for UI design
- Generates full design systems (colors, typography, components) from text prompts or screenshots
- "Vibe design" — start from abstract concepts or emotions
- Exports clean front-end code
- URL analysis: paste any URL, extracts the design language
- Voice control for the canvas
- **Free**, available at stitch.withgoogle.com (Google account only)

**Sync implications**: Stitch doesn't have a public API yet. It exports code, not tokens. Our Stitch adapter will likely need to:
1. Parse its exported code for token values
2. Or use its URL analysis feature to extract design language programmatically (if an API becomes available)
3. Mark as **stub for now** — watch for API release

Source: https://stitch.withgoogle.com

---

## Design Token Sync Tools

### 1. Tokens Studio for Figma ⭐ MOST RELEVANT
- **URL**: https://tokens.studio / https://github.com/tokens-studio/figma-plugin
- **License**: Open source core
- **What it does**: Bidirectional sync between Figma Variables/Styles and code repos (GitHub, GitLab, Azure DevOps, URL, etc.)
- **API**: Has a Platform API with API key auth; also direct GitHub sync via JSON files
- **Formats**: W3C DTCG, legacy Tokens Studio format, Style Dictionary
- **Key insight**: Their token storage model (JSON files in a `tokens/` folder) is almost identical to what we already do. We could potentially use Tokens Studio as the Figma adapter directly.
- **Programmatic use**: The plugin syncs to GitHub — meaning our GitHub adapter already picks up what Tokens Studio pushes.

### 2. GitFig ⭐ HIGHLY RELEVANT
- **URL**: https://gitfig.com / https://www.figma.com/community/plugin/1584467274034932618
- **License**: Free Figma plugin (not confirmed open source)
- **What it does**: Bidirectional sync between Figma Variables AND Styles ↔ GitHub. Supports branches, commits, PRs from Figma.
- **Formats**: Auto-detects W3C DTCG, Style Dictionary, Tokens Studio
- **Key insight**: Does exactly what we want for the Figma↔GitHub token layer. Version 1.2.1. Actively maintained.
- **API**: Plugin-based, no standalone API confirmed. But uses GitHub Device Flow for auth.
- **Relevance**: Could be our Figma adapter's reference implementation or inspiration.

### 3. Styleframe
- **URL**: https://www.styleframe.dev/figma
- **License**: Free and open source (CLI + Figma plugin)
- **What it does**: Bidirectional sync of W3C DTCG format JSON with Figma Variables. Full multi-mode support (light/dark). Import DTCG → Figma Variables, export Figma Variables → DTCG JSON.
- **Key insight**: CLI-first, W3C compliant. Could be used directly in our GitHub adapter for the transform step.

### 4. Terrazzo (formerly Cobalt UI) ⭐ RELEVANT
- **URL**: https://terrazzo.app / https://github.com/terrazzoapp/terrazzo
- **License**: MIT
- **What it does**: CLI for DTCG token management and code generation (CSS, Sass, JS/TS, Tailwind, etc.). Supports DTCG 2025.10 spec. Has a `figma import` command.
- **Plugin system**: Extensible via plugins — could write a Terrazzo plugin as part of our token transform pipeline
- **Key insight**: More modern and spec-compliant than Style Dictionary v3. Already in use in ecosystem (Style Dictionary v5 also supports DTCG). MIT licensed.
- **Command**: `npx terrazzo pull` pulls from Figma directly.

### 5. Figma's Official Variables ↔ GitHub Actions ⭐ DIRECTLY USABLE
- **URL**: https://github.com/figma/variables-github-action-example
- **License**: Figma's official example (MIT-style)
- **What it does**: GitHub Actions workflows for bidirectional sync of Figma Variables ↔ DTCG JSON tokens in a repo. Uses Figma Variables REST API.
- **Requirement**: Figma Enterprise org membership for Variables API access
- **Key insight**: This is the canonical reference implementation. We can fork and adapt these actions as our GitHub Agent's sync mechanism.
- **Also**: `github.com/LifewayIT/design-system-sync` — community fork with similar approach

### 6. TokensBrücke (Tokens Bridge)
- **URL**: https://github.com/tokens-bruecke/figma-plugin
- **License**: Open source
- **What it does**: Figma plugin that exports Figma variables → design-tokens JSON (W3C DTCG). Download JSON or push to supported services.
- **Key insight**: Good reference for the Figma→tokens transform logic. Can study their variable extraction code.

### 7. style-dictionary-to-figma
- **URL**: https://github.com/konsalex/style-dictionary-to-figma
- **License**: Open source
- **What it does**: Figma Plugin template to sync Style Dictionary tokens to Figma Variables
- **Key insight**: Shows how to map Style Dictionary format → Figma Variables API — useful for our transformer

---

## Storybook Integration Tools

### 1. Storybook Official MCP Server ⭐ USE THIS
- **URL**: https://github.com/storybookjs/mcp
- **Also**: `@storybook/addon-mcp` (official addon)
- **What it does**: Exposes Storybook component data, props, and screenshots to AI agents via MCP
- **Key insight**: Official. Maintained by Storybook team. Our Storybook agent should be an MCP client connecting to this.

### 2. storybook-mcp by mcpland
- **URL**: https://github.com/mcpland/storybook-mcp
- **What it does**: MCP server with `getComponentList` and `getComponentsProps` tools. Uses Playwright headless to extract prop tables from Storybook docs pages.
- **Config**: Needs `STORYBOOK_URL` env var pointing to `index.json`
- **Key insight**: The `index.json` endpoint (`/index.json` on any running Storybook) is the canonical metadata source. We already parse story files statically — this gives us a live/runtime alternative.

### 3. storybook-extractor
- **URL**: https://github.com/filipdanisko/storybook-extractor
- **What it does**: Storybook metadata extractor — similar to our export-manifest.mjs but as an npm package
- **Key insight**: Study this as an alternative to our static parser. May be more robust.

### 4. mcp-design-system-extractor
- **URL**: https://github.com/freema/mcp-design-system-extractor
- **What it does**: MCP server that interacts with Storybook design systems — extracts component HTML, analyzes styles, helps with design system adoption
- **Key insight**: Goes further than just metadata — extracts rendered HTML and styles. Useful for QA agent.

### 5. story.to.design ⭐ GAME CHANGER (commercial)
- **URL**: https://story.to.design
- **License**: Commercial (free tier available?)
- **What it does**: Generates and syncs a full Figma library FROM Storybook. Imports components into Figma, generates variants automatically, keeps them in sync when code changes. Already supports Storybook 10.
- **Key insight**: This is exactly what our Storybook→Figma sync wants to do. We should study their approach. Their Figma plugin is the reference implementation for Storybook→Figma component sync.
- **Usage**: Could use this as an external service (webhook?) or study for our own implementation.

### 6. Storybook Connect for Figma (official Storybook/Chromatic)
- **URL**: https://storybook.js.org/blog/figma-plugin-for-storybook/
- **What it does**: Links Storybook stories to Figma designs. Embeds live Storybook stories inside Figma. Maintained by Chromatic.
- **Key insight**: This is the "compare design vs implementation" tool. Good for our QA agent — not for sync.

### 7. Storybook REST API (npm package, Dec 2025)
- **URL**: https://medium.com/@hrishikesh41096/transform-your-storybook-into-a-rest-api-introducing-storybook-api-b41803948a90
- **What it does**: Exposes all Storybook component metadata as REST API automatically. Zero config.
- **Key insight**: Alternative to MCP for non-MCP consumers. Check npm for the package name.

### 8. Storybook Indexers API (official)
- **URL**: https://storybook.js.org/docs/api/main-config/main-config-indexers
- **What it does**: Official API to customize how Storybook indexes and parses files. The `/index.json` endpoint exposes the full index.
- **Key insight**: Our current static parser (`export-manifest.mjs`) is a subset of what this does. We should migrate to using `index.json` from a running Storybook instead.

---

## Visual QA Tools

### 1. Lost Pixel ⭐ BEST FIT
- **URL**: https://github.com/lost-pixel/lost-pixel / https://www.lost-pixel.com
- **License**: Open source (MIT)
- **What it does**: Visual regression testing against Storybook, Next.js pages, and Playwright. Self-hostable. Open-source alternative to Percy/Chromatic.
- **CI integration**: Built-in GitHub Actions integration
- **Key insight**: The open-source engine is free. The platform (UI + CI helpers) is commercial. We use just the engine.
- **For our use**: Can screenshot every Storybook story and compare against baselines. We extend baselines to be Figma exports.

### 2. Loki.js
- **URL**: https://loki.js.org / https://github.com/oblador/loki
- **License**: MIT
- **What it does**: Visual regression for Storybook using headless Chromium (via Docker). CLI-based. Generates reference screenshots, diffs against them.
- **Key insight**: Simpler than Lost Pixel. Good for pure Storybook regression. Less suitable for cross-platform (Storybook vs Figma) comparison.

### 3. Argos
- **URL**: (commercial SaaS with open-source SDK)
- **What it does**: Integrates with Playwright, Cypress, Storybook. Cloud-hosted diff UI.
- **Key insight**: Commercial. Skip unless budget allows.

### 4. pixelmatch (npm)
- **URL**: https://github.com/mapbox/pixelmatch
- **License**: ISC (permissive)
- **What it does**: Fast PNG pixel-diff library. Used under the hood by Playwright for visual testing.
- **Key insight**: This is what we use directly in our QA agent's `visual-diff.ts` for programmatic diff without a testing framework.

### 5. Percy AI Visual Review Agent (2025)
- **URL**: Commercial (BrowserStack Percy)
- **What it does**: AI-powered visual review that reduces review time 3x, filters 40% of false positives
- **Key insight**: Good to know exists. Commercial. The open approach (pixelmatch + AI classification) can replicate this.

---

## Agent Orchestration Frameworks

### 1. Mission Control (builderz-labs) ⭐ INTERESTING
- **URL**: https://github.com/builderz-labs/mission-control / https://mc.builderz.dev
- **License**: Open source, self-hosted, SQLite-powered
- **What it does**: Dashboard for AI agent orchestration — Kanban board, task dispatch, cost tracking, multi-agent coordination. Supports CrewAI, LangGraph, AutoGen, Claude SDK, OpenClaw.
- **Key insight**: Could be the UI for our Meta-Orchestrator. We could dispatch our platform agents from Mission Control. But adds significant complexity.

### 2. Figma Dev Mode MCP Server (official, June 2025)
- **URL**: https://www.figma.com/blog/introducing-figma-mcp-server/
- **What it does**: Official Figma MCP server released June 4, 2025. Pulls real design data from Figma into IDE context.
- **Tools**: `get_variable_defs`, `get_design_context`
- **Key insight**: This is how our Figma agent reads tokens and components — through MCP, not raw REST.

### 3. Composio Figma-Claude Integration
- **URL**: https://composio.dev/toolkits/figma/framework/claude-code
- **What it does**: Pre-built toolkit connecting Claude Code to Figma's API
- **Key insight**: Alternative to building our own Figma adapter from scratch

### 4. southleft/figma-console-mcp
- **URL**: https://github.com/southleft/figma-console-mcp
- **License**: Open source
- **What it does**: "Your design system as an API" — connects AI to Figma for extraction, creation, debugging
- **Key insight**: Community MCP server with broader write capabilities than the official one. Useful for our Figma write adapter.

---

## Key GitHub Repos to Study / Fork

| Repo | Purpose | License |
|------|---------|---------|
| `figma/variables-github-action-example` | Official Figma ↔ GitHub Variables sync workflow | MIT-ish |
| `tokens-studio/figma-plugin` | Bidirectional Figma↔code sync, full featured | MIT |
| `storybookjs/mcp` | Official Storybook MCP server | MIT |
| `mcpland/storybook-mcp` | Storybook MCP with Playwright extraction | MIT |
| `lost-pixel/lost-pixel` | Visual regression for Storybook/pages | MIT |
| `terrazzoapp/terrazzo` | DTCG token CLI with Figma import | MIT |
| `tokens-bruecke/figma-plugin` | Figma Variables → DTCG JSON export | Open source |
| `mapbox/pixelmatch` | Pixel diff library | ISC |
| `filipdanisko/storybook-extractor` | Storybook metadata extractor | Check repo |
| `freema/mcp-design-system-extractor` | Storybook MCP with style analysis | Check repo |
| `southleft/figma-console-mcp` | Figma as API via MCP | Open source |
| `builderz-labs/mission-control` | Agent orchestration dashboard | Open source |

---

## Architecture Revisions Implied by Research

### 1. Platform Agents → MCP Clients

Instead of building raw HTTP adapters:
- **Figma Agent** = MCP client → Figma MCP Server (`mcp.figma.com/mcp`)
- **Storybook Agent** = MCP client → Storybook MCP Server (`storybookjs/mcp` or `mcpland/storybook-mcp`)
- **GitHub Agent** = remains as direct GitHub API calls (no MCP server needed)
- **Stitch Agent** = stub (no API yet)

This eliminates the need to reverse-engineer Figma's plugin API or Storybook's internal format.

### 2. Token Format: DTCG 2025.10 is the Standard

The W3C DTCG spec hit v1.0 in October 2025. All major tools (Tokens Studio, Terrazzo, Style Dictionary v5, Figma) now support it. Our canonical `Token` type should be DTCG-native.

### 3. Storybook `index.json` > Static File Parsing

Our `export-manifest.mjs` statically parses `.stories.tsx` files. We should also support reading `/index.json` from a running Storybook (or from a Storybook build output). The MCP server does this automatically.

### 4. Visual QA: Lost Pixel + pixelmatch

For component visual diff:
- Storybook → Lost Pixel or Playwright screenshots each story
- Figma → REST API exports each component frame as PNG
- `pixelmatch` diffs the two PNGs
- No commercial tools needed

### 5. Google Stitch: No API Yet

Stitch is a Google Labs AI design tool with no public API. Mark the Stitch adapter as a stub. Monitor for API release. The design language it generates (colors, typography, spacing) is exportable as code — a future adapter could parse that output.

---

## NotebookLM as a Platform Layer

### Finding: NotebookLM is deeply relevant here

**What it is**: Google's AI research assistant with source-grounding (no hallucinations — answers come only from your uploaded docs). Now has an Enterprise API (Sept 2025, alpha).

**NotebookLM MCP Server** ⭐⭐
- **URL**: https://github.com/PleasePrompto/notebooklm-mcp
- **What it does**: MCP server for NotebookLM — lets Claude Code and other AI agents research documentation directly with citation-backed answers from Gemini. Persistent auth, library management. **Zero hallucinations, just your knowledge base.**
- **Key insight**: Upload our `sync-state/state.json`, component manifest, token guide, and research docs into NotebookLM → Claude Code agents can query the knowledge base with grounded answers.

**notebooklm-py** (unofficial)
- **URL**: https://github.com/teng-lin/notebooklm-py
- **What it does**: Full Python programmatic access to NotebookLM — including capabilities the web UI doesn't expose. Works with Claude Code and other AI agents.

### How NotebookLM fits into our platform

**Option A: Documentation Knowledge Base**
- Feed NotebookLM: design token docs, component guides, Storybook stories, sync-state reports, QA reports
- Result: stakeholders ask "Is the Button component in sync?" and get a grounded answer with citations
- Dashboard has a "Ask the Librarian" chat interface powered by NotebookLM

**Option B: QA Report Viewer**
- After every sync+QA run, the QA report is pushed to NotebookLM as a new source
- Stakeholders can query "What failed last night's QA?" in natural language

**Option C: Change Intelligence**
- Feed all sync-state diffs over time → NotebookLM tracks drift history
- Ask: "Which tokens have drifted most in the last month?" → grounded answer

**Key limitation**: NotebookLM Enterprise API is alpha. Free tier has no programmatic API — only the web UI. The MCP server and Python library appear to use reverse-engineered session auth, not official API.

**Recommendation**: Build the dashboard with a "Knowledge Base" tab that shows NotebookLM embed or chat widget. Add the NotebookLM MCP server as an optional integration for Claude Code users who want to query sync state in natural language. Don't depend on it for core sync logic.

---

## CRITICAL: Figma Variables API Restriction

**Hard truth**: Figma's Variables REST API requires a **full Enterprise org seat**. This affects any tool that uses the REST API (Figma's own GitHub Actions example, GitFig's REST-mode sync, etc.).

**Workarounds**:
1. **Figma Plugin API** — the Plugin API has NO Enterprise requirement. Our existing Figma plugin already uses this. Most Figma sync tools use the Plugin API for read/write access to variables.
2. **Tokens Studio Plugin** — uses Plugin API, not REST API. No Enterprise requirement.
3. **Figma MCP Server** — the MCP server (`mcp.figma.com`) uses the Plugin API internally. No Enterprise requirement confirmed.
4. **Manual export** — user exports Variables JSON from Figma UI (no API needed)

**Conclusion**: Our Figma adapter should use the **Plugin API** (via the existing Figma plugin), not the REST API. The REST API sync is for Enterprise customers only. This is consistent with how we already work.

---

## Research Still Needed

- [ ] `@ai-sdk/mcp` — how to build MCP clients in TypeScript for our agents
- [ ] Figma REST API Variables endpoint — exact shape, auth requirements, Enterprise restriction details
- [ ] Tokens Studio Platform API — is it free? Can we use it without their Figma plugin?
- [ ] Terrazzo CLI Figma import command — does it need Enterprise?
- [ ] Lost Pixel baseline management — how to use Figma exports as baselines
- [ ] story.to.design — is there any API/webhook, or is it purely plugin-based?
- [ ] Mission Control — assess complexity vs. benefit for our meta-orchestrator dashboard
- [ ] DTCG 2025.10 spec — read the actual spec for our canonical Token type

---

## Last Updated
2026-03-24 (Round 1 research complete)
