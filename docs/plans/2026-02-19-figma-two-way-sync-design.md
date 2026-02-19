# Two-Way Figma Sync — Design Document

> Date: 2026-02-19
> Status: Approved
> Approach: Custom Figma Plugin + n8n Workflows (fully free)

## Problem

The `tokens/*.json` files are the source of truth for the Compulocks brand system, but there is no automated bridge between this repo and Figma. Designers must manually import/export files. The JSON files themselves are not readable for non-technical stakeholders.

## Goals

1. **Code → Figma:** When tokens change in the repo, designers can pull updates into Figma with one click.
2. **Figma → Code:** When designers change tokens in Figma, they can push changes that create a PR for review.
3. **Human-readable layer:** Auto-generated `token_guide.md` that serves as a dictionary and usage guide for the token system.

## Architecture

```
┌─────────────────┐         ┌──────────────┐         ┌─────────────┐
│   GitHub Repo   │◄───────►│     n8n      │◄───────►│ Figma Plugin│
│  tokens/*.json  │         │  (webhooks + │         │  (read/write│
│                 │         │   workflows) │         │   Variables)│
└─────────────────┘         └──────────────┘         └─────────────┘
        │                          │
        ▼                          ▼
   npm run build            Format translation
   (Style Dictionary)       (DTCG ↔ Figma)
```

## Component 1: Figma Plugin

### Overview

A custom TypeScript plugin that runs inside Figma. Free to develop and use — no paid plan required. Two actions: Pull (code→Figma) and Push (Figma→code).

### Structure

```
figma-plugin/
├── manifest.json       # Plugin metadata, permissions (network access)
├── code.ts             # Main thread — reads/writes Figma Variables & Styles
└── ui.html             # UI iframe — Pull/Push buttons + status display
```

### Pull (Code → Figma)

1. User clicks "Pull from repo"
2. Plugin UI sends GET request to n8n webhook URL
3. n8n returns tokens pre-transformed into Figma-friendly format
4. Plugin main thread creates/updates:
   - **Color Variables** in a "Brand" collection (e.g. `color/brand/primary`)
   - **Number Variables** in a "Spacing" collection (e.g. `spacing/4` = 16)
   - **Text Styles** via the Styles API for typography (font family, weight)

### Push (Figma → Code)

1. User clicks "Push to repo"
2. Plugin main thread reads all Variables from document + Text Styles
3. Serializes into structured JSON payload
4. Plugin UI posts payload to n8n webhook URL (POST)
5. n8n handles transformation and PR creation

### Figma Token Mapping

| Token Type | Figma Feature | Collection/Group |
|------------|--------------|-----------------|
| `color.*` | Variables (COLOR) | "Brand" collection |
| `spacing.*` | Variables (FLOAT) | "Spacing" collection |
| `font.family.*` | Text Styles | "Typography" group |
| `font.weight.*` | Text Styles | "Typography" group |
| `textStyle.*` | Text Styles | "Text Styles" group |

### Typography Note

Figma Variables don't support typography yet. Font families and text styles are handled via the older **Styles API**, which allows creating/updating native Text Styles that designers can apply to text layers. `textTransform` is a CSS concept — stored in the style description only.

## Component 2: n8n Workflows

### Workflow A: Code → Figma

```
Trigger: GitHub webhook (push to main branch)
    │
    ▼
Filter: Check if tokens/*.json files changed
    │ yes
    ▼
Fetch: GET raw JSON files from GitHub API
    (color.json, typography.json, spacing.json)
    │
    ▼
Transform: DTCG → Figma format (Code node)
    - Hex → Figma RGB {r, g, b, a} with 0-1 range
    - rem → px (multiply by 16)
    - Nested paths → slash-separated names
    - Resolve $value references
    │
    ▼
Store: Save transformed JSON (available at GET webhook endpoint)
```

The plugin pulls from the GET endpoint on demand. n8n just keeps the latest transformed tokens ready.

Optional: Send a Slack/email notification saying "Tokens updated — open the plugin to pull."

### Workflow B: Figma → Code

```
Trigger: Webhook POST from Figma plugin
    │
    ▼
Transform: Figma format → DTCG (Code node)
    - Figma RGB → hex strings
    - px → rem (divide by 16)
    - Slash-separated names → nested JSON keys
    - Reconstruct color.json, typography.json, spacing.json
    │
    ▼
Diff: Fetch current token files from GitHub API, compare
    │ changes exist
    ▼
Create branch: figma-sync/YYYY-MM-DD-HHMMSS
    │
    ▼
Commit: Updated token files to the new branch
    │
    ▼
Open PR: Title "Figma token sync — [date]"
    Body includes list of changed tokens
    │
    ▼
(GitHub Action runs npm run build to validate tokens compile)
```

### Why a PR (not direct commit)

Safety. Every Figma change gets reviewed before hitting the main branch. The PR description lists exactly which tokens changed, and the auto-generated `token_guide.md` diff makes changes readable.

## Component 3: Format Translation

Deterministic mappings built into n8n Code nodes. No AI required for core translation.

### DTCG → Figma

```
Color:  "#1D1F4A" → { r: 0.114, g: 0.122, b: 0.29, a: 1 }
Spacing: "1rem"   → 16 (float, px)
Path:   color.brand.primary → "color/brand/primary"
Refs:   "{font.family.primary}" → resolved to actual value
```

### Figma → DTCG

```
Color:  { r: 0.114, g: 0.122, b: 0.29, a: 1 } → "#1D1F4A"
Spacing: 16 → "1rem"
Path:   "color/brand/primary" → { color: { brand: { primary: { ... } } } }
Type:   Inferred from collection name (Brand→color, Spacing→dimension)
```

## Component 4: Token Guide (HMI Layer)

### Overview

`token_guide.md` — auto-generated during `npm run build`. A human-readable dictionary of every token in the system. Serves as the interface between non-technical people and the raw JSON.

### Output Format

```markdown
# Compulocks Brand Token Guide
> Auto-generated — do not edit directly

## Colors
| Token | Value | Description |
|-------|-------|-------------|
| color.brand.primary | #1D1F4A | Main brand color — Compulocks navy |

## Typography
### Font Families
| Token | Value | Description |
|-------|-------|-------------|
| font.family.primary | Barlow Condensed | Primary brand font — headlines |

### Text Styles
| Style | Font | Weight | Transform | Use for |
|-------|------|--------|-----------|---------|
| bigShortTitle | Barlow Condensed | 500 | UPPERCASE | Large short headlines |

## Spacing Scale
| Token | rem | px |
|-------|-----|-----|
| spacing.1 | 0.25rem | 4px |
| spacing.4 | 1rem | 16px |
```

### Generation

A new step in `build-tokens.mjs` reads all resolved tokens after Style Dictionary processes them and writes `token_guide.md` to the project root.

### Role in Figma Sync

Included in PRs created by the Figma→Code workflow. Reviewers see a human-readable diff of what changed instead of parsing raw JSON.

## Cost

Everything is free:

| Component | Cost |
|-----------|------|
| Figma Plugin API | Free (development plugins) |
| n8n | Free (self-hosted or free cloud tier) |
| GitHub webhooks + API | Free |
| Style Dictionary | Free (open source) |

## Data Flow Summary

```
Designer changes in Figma
    → clicks Push in plugin
    → n8n transforms & creates PR
    → developer reviews & merges
    → npm run build generates CSS/SCSS/TS/JSON + token_guide.md

Developer changes tokens/*.json via CLI
    → pushes to GitHub
    → n8n webhook transforms & stages for plugin
    → designer clicks Pull in plugin
    → Figma Variables/Styles update
```
