# MEMORY.md

Accumulated context and learnings for the compulocks-brand-system project.

## Design System Distribution Layer (2026-05-14)

- Codex completed task packets T-20260514-ds-01 through T-20260514-ds-07 and wrote matching result files under `.agent-harness/outbox/`.
- `component-manifest.json` now uses `status` for component governance. `scripts/export-manifest.mjs` exports `mergeStatus()` and preserves existing statuses on re-export; new components default to `draft`.
- Root governance files are `contributors.json`, `design-requests.md`, and `design-audit.log`. `ori@compulocks.com` is the owner contributor.
- `scripts/sync-vault.mjs` writes stable agent artifacts to `~/.compulocks/design/`: `tokens.json`, stable-only `manifest.json`, `SPEC.md`, and `.last-updated`.
- `scripts/approve.mjs` is the local approval CLI. It requires `COMPULOCKS_CONTRIBUTOR`, checks `contributors.json`, appends to `design-audit.log`, flips draft components to stable, then runs `npm run build`.
- `scripts/generate-living-html.mjs` reads the flat Style Dictionary output (`ColorBrandPrimary`, `Spacing1`, `FontSizeXs`, etc.) and generates `design-system/index.html`.
- `mcp-server/` is an isolated package. Build with `cd mcp-server && npm run build`; start with `node mcp-server/dist/index.js`.
- MCP exposes 9 tools total: `get_tokens`, `get_manifest`, `list_components`, `get_component`, `get_spec`, `request_component`, `approve_component`, `refresh`, `get_requests`.
- Auth split is intentional: `request_component` has no `contributor_id` and only appends to `design-requests.md`; `approve_component`, `refresh`, and `get_requests` require authorized `contributor_id`.
- Bundled MCP code runs from `mcp-server/dist`, so repo-root resolution in bundled tool code must account for that output location.
- Task 8 pickup added Claude-facing distribution artifacts: `.claude/settings.json` registers `compulocks-design`, `.claude/skills/design-system.md` defines `/design-system`, and `agents/ux-prep.md` defines the frontend prep persona.
- UI-based requests must now load `docs/design-system-distribution/ui-task-intake-sop.md` first. Triggers include HTML review, dashboard, web app, frontend, UI/UX, layout, component, visual review, responsive, mobile, and desktop work. Codex should read local vault artifacts or repo fallbacks; Claude should prefer the `compulocks-design` MCP server.
- Verification passed on 2026-05-14: manifest tests, `npm run build`, design scripts, MCP build, and a mutation smoke test for all 9 tools. Mutation smoke restored audit/request/manifest files afterward to avoid committed test noise.
- Task 8 was committed as `d2d996e` and pushed to `origin/master`; pre-push manifest timestamp commits advanced the final pushed head to `626b522`. Graphify output remained dirty locally after the hook refresh.

## Decisions

- **Style Dictionary v5** chosen as the token engine (ESM, DTCG format support)
- **Build script** is `build-tokens.mjs` (not the v3-style config file) because v5 requires programmatic API
- **Custom TS format** needed because built-in JS formats don't produce nested `as const` exports
- **Text styles** are stored as individual sub-tokens (fontFamily, fontWeight, textTransform) rather than composite `$value` objects — this ensures CSS/SCSS outputs get proper individual variables instead of `[object Object]`
- **Build outputs are gitignored** — consumers run `npm run build` or CI generates them

## Brand Source

Tokens derived from **Compulocks Brand Language 6.2023** (Brand Guidelines 2025).
Reference file: `references/uiref/stlyle_guide_ts.md.txt` in mrd-producer-webapp repo.

## Patterns

- Token references use `{path.to.token}` syntax (DTCG spec)
- All token files use `$value`, `$type`, `$description` fields
- Spacing follows 4px/8px grid: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64

## Cross-Project Usage

- **MRD Producer webapp** (`mrd-producer-webapp` repo) consumes brand tokens as design reference
- `mrd-producer-webapp/app/globals.css` derives a full M3 Expressive tonal palette from brand primary `#1D1F4A` and secondary `#243469`
- `mrd-producer-webapp/lib/style-tokens.ts` contains an expanded version of brand tokens with M3 type scale, shapes, and error colors
- The dashboard (unified homepage with tool cards + documents table) references this repo for styling decisions
- Google Material 3 Expressive design system is the bridge between raw brand tokens and UI components

## Token System (2026-04-08)

- **Full token set**: color (7), borderRadius (5), shadow (3), animation/duration (3), spacing (10), typography
- **Design Kit is hard truth**: `COMPULOCKS R&D AI Design Kit.txt` overrides all prior decisions on colors, typography, card spec
- **Card spec**: `border-radius: 24px`, `padding: 32px`, `background: #f2f2f2`, `border: 1px solid #e0e0e0` — do not deviate
- **Typography hierarchy**: section-heading 69px BC/500 → slide-title 36px BC/500 → small-title 21px B/600 → paragraph 18px B/400 → small-text 12px B/400 italic
- **Green `#009966`** is the primary CTA color — never use teal `#0f766e`
- `build/css/typography.css` contains Design Kit utility classes, auto-generated on `npm run build`

## Component Library (2026-04-08)

- 6 components: Button, Card, Input, Badge, Tag, Chip
- All use inline React CSSProperties — no CSS modules
- All pill-shaped interactive elements (buttons, chips, tags, badges) use `border-radius: 9999px`
- Button has `cta` variant (green), hover states via useState
- Chip is a new controlled component — parent manages selected state via `variant` prop
- `npm run build:components` → `dist/` (CJS + ESM + types)
- `npm run export-manifest` → `component-manifest.json` (6 components)

## Figma Plugin Status (2026-04-08)

- **Pull** = applies design tokens as Figma Variables + Text Styles (works ✅)
- **Push** = reads Figma Variables → sends to n8n (HTTP 500 from n8n, deferred ⚠️)
- **Sync Components** = creates ComponentSet placeholders from manifest (structural scaffolding, not visual ⚠️)
- **Known gap**: Pull/Push moves tokens only, not component visuals. Sync Components shows placeholder boxes.
- **Proposed next**: Expandable sync mode selector (Tokens | Components | Style Guide | All) to make each button's scope explicit and allow component visual rendering

## Consumers

| Project | How it uses tokens |
|---------|-------------------|
| mrd-producer-webapp | M3 tonal palette derived from brand colors in globals.css, style-tokens.ts |
| (future) | Direct CSS/SCSS/TS imports from build/ outputs |

## Figma Plugin Status (2026-02-23)

- Plugin loads in Figma Desktop ✓ — loaded via Plugins → Development → Import plugin from manifest
- UI opens correctly: Pull (blue) + Push (purple) buttons, webhook URL input, status display
- Both buttons validate empty URL before firing ✓
- Push correctly reads Figma variables from document before attempting HTTP call ✓
- `resolveForConsumer({ mode: modeId })` is the API used to read variable values in the push flow
- Font weight is stored in Figma Text Style's `fontName.style` (e.g. "Medium"), not as a numeric value — plugin currently defaults fontWeight to 400 on push, which is a known limitation

## n8n Gotchas (v2.6.4 Community)

- **No `fetch`** — not available in Code nodes
- **No `$http`** — only available in newer versions
- **Use `require('axios')`** — axios is bundled and works in Code nodes
- **No Variables feature** — Community edition lacks Settings → Variables; hardcode values directly in node parameters
- **Parallel branches don't merge** — if Filter node splits to 3 parallel HTTP nodes, they can't all feed into one Code node; consolidate into a single Code node that does all HTTP calls itself
- **Static data persists across executions** — `$getWorkflowStaticData('global')` stores token cache between runs
- **GitHub API returns base64** — file content comes back as `res.content` (base64), decode with `Buffer.from(res.content, 'base64').toString()`
- **Filter Token Changes** — checking `JSON.stringify($json.commits)` for `"tokens/"` doesn't work reliably for empty commits; removed for now, restore later

## Gotchas

- Style Dictionary v5 is ESM-only — build script must be `.mjs` or package must have `"type": "module"`
- Composite token values (objects) don't serialize properly in CSS/SCSS — split into individual sub-tokens instead
- The `json/flat` format handles composite values correctly (outputs nested JSON objects)
- When deriving M3 tonal palettes from brand colors, use Google's Material Theme Builder or manually calculate — don't guess hex values
- Figma plugin `code.js` must be recompiled with `npm run build:plugin` after any change to `code.ts`
- The plugin's `networkAccess.allowedDomains` is set to `["*"]` for development — restrict to n8n domain before shipping
