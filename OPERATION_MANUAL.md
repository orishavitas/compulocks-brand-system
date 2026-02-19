# Compulocks Brand System — Operation Manual

> This manual covers day-to-day use of the brand token system for both designers and developers.
> For initial setup, see `FIGMA_SYNC.md`. For the full token reference, see `token_guide.md`.

---

## For Designers

### What is this system?

The brand system stores all design decisions — colors, fonts, spacing — in a single place. When something changes here, it flows automatically to every app and document that uses the brand. You work in Figma as normal; this system keeps Figma and the codebase in sync.

### The Figma Plugin

The **Compulocks Token Sync** plugin is your interface. It has two buttons:

- **Pull from Repo** — updates your Figma file with the latest approved tokens from the codebase
- **Push to Repo** — sends your Figma changes to the team for review

Open it via: **Plugins → Development → Compulocks Token Sync**

---

### Daily Workflows

#### Someone changed a token in the codebase — update your Figma file

1. Open your Figma design file
2. Run the plugin (Plugins → Development → Compulocks Token Sync)
3. Click **Pull from Repo**
4. Wait for the status message: "Pulled X variables successfully."
5. Your Figma Variables and Text Styles are now up to date

All components using those Variables will update automatically.

---

#### You changed a color or spacing value in Figma — send it to the repo

> Use this when you've made a deliberate brand decision in Figma and want it reflected in the codebase.

1. Make your changes to Figma Variables or Text Styles directly in the Figma file
2. Open the plugin
3. Click **Push to Repo**
4. The plugin reads all your Variables and Styles and sends them to n8n
5. n8n creates a pull request on GitHub — you'll see a PR link in the status message
6. Share that link with the developer so they can review and merge it

Once merged, the codebase updates and the new outputs (CSS, TypeScript, etc.) are generated.

---

### What lives in Figma

| What | Where in Figma | Token |
|------|----------------|-------|
| Compulocks navy | Variables → Brand → color/brand/primary | `color.brand.primary` |
| Brand highlight | Variables → Brand → color/brand/highlight | `color.brand.highlight` |
| 4px unit | Variables → Spacing → spacing/1 | `spacing.1` |
| 8px unit | Variables → Spacing → spacing/2 | `spacing.2` |
| 16px unit | Variables → Spacing → spacing/4 | `spacing.4` |
| Big short headline | Text Styles → Text Styles/bigShortTitle | Barlow Condensed Medium, UPPERCASE |
| Big long headline | Text Styles → Text Styles/bigLongTitle | Barlow Condensed Medium, Title Case |
| Large body text | Text Styles → Text Styles/bigParagraph | Barlow Condensed Regular |
| Small body text | Text Styles → Text Styles/smallParagraph | Barlow Regular |
| Captions / notes | Text Styles → Text Styles/smallText | Barlow Regular Italic |

---

### Reading the Token Guide

`token_guide.md` (in the repo root) is a plain-English reference for every token. Open it on GitHub to see all current values without needing to open Figma or the codebase. It's auto-generated every time the developer runs a build, so it's always current.

---

### What NOT to do

- **Don't edit the Variables or Text Style names** — the sync system matches by name. Renaming breaks the connection.
- **Don't push from Figma without reviewing first** — Pull first, make your changes, then Push. This ensures you're not overwriting someone else's work.
- **Don't change tokens in Figma for one-off design explorations** — use local styles or overrides for exploration. Only push deliberate brand decisions.

---

---

## For Developers

### What is this system?

`tokens/*.json` are the source of truth for the entire brand. Every color, font, and spacing value is defined here in DTCG format and compiled by Style Dictionary into platform-specific outputs: CSS variables, SCSS variables, TypeScript constants, and flat JSON.

### Repo structure

```
tokens/          ← edit these
  color.json
  typography.json
  spacing.json

lib/             ← format converters (used by plugin + n8n)
  dtcg-to-figma.mjs
  figma-to-dtcg.mjs

figma-plugin/    ← load into Figma as a development plugin
  manifest.json
  code.ts / code.js

n8n/             ← import into your n8n instance
  workflow-a-code-to-figma.json
  workflow-b-figma-to-code.json
  README.md

build/           ← auto-generated, do not edit
  css/variables.css
  scss/_variables.scss
  ts/tokens.ts
  json/tokens.json

token_guide.md   ← auto-generated human-readable reference
```

### Commands

```bash
npm run build          # Compile tokens → CSS, SCSS, TS, JSON + regenerate token_guide.md
npm run build:plugin   # Compile figma-plugin/code.ts → code.js
npm run clean          # Delete build/ directory
```

---

### Daily Workflows

#### Add a new color token

1. Open `tokens/color.json`
2. Add your token in DTCG format:
   ```json
   "newColor": {
     "$value": "#FF5533",
     "$type": "color",
     "$description": "What this color is for"
   }
   ```
3. Run `npm run build` — outputs regenerate and `token_guide.md` updates
4. Commit: `git add tokens/color.json && git commit -m "feat: add color.brand.newColor"`
5. Push to GitHub — n8n detects the change and stages it for the next designer Pull

---

#### Edit an existing token value

1. Open the relevant file in `tokens/`
2. Change the `$value` field
3. Run `npm run build` and verify the output in `build/`
4. Commit and push

---

#### Add a new text style

1. Open `tokens/typography.json`
2. Add a new entry under `textStyle`:
   ```json
   "newStyleName": {
     "fontFamily": { "$value": "{font.family.primary}" },
     "fontWeight": { "$value": "{font.weight.medium}" },
     "textTransform": { "$value": "uppercase" },
     "$description": "What this style is for"
   }
   ```
3. Use `{font.family.primary}` or `{font.family.secondary}` as references — don't hardcode font names
4. Run `npm run build`, commit, push

---

#### Review and merge a Figma sync PR

When a designer pushes from Figma, n8n creates a PR titled **"Figma token sync — [date]"**.

1. Open the PR on GitHub
2. Review the diff in `tokens/*.json` — check that changes are intentional brand decisions
3. Check `token_guide.md` diff in the PR for a human-readable summary of what changed
4. If the PR looks right: merge
5. After merging, run `npm run build` locally if you need the outputs immediately (CI will also run it)

---

#### Update the Figma plugin after changing code.ts

```bash
npm run build:plugin
git add figma-plugin/code.js
git commit -m "feat: update plugin ..."
```

The designer then re-loads the plugin in Figma (Plugins → Development → right-click → "Re-import from manifest").

---

### Token format reference

All tokens use [DTCG format](https://design-tokens.github.io/community-group/format/):

```json
{
  "tokenName": {
    "$value": "the value",
    "$type": "color | dimension | fontFamily | fontWeight",
    "$description": "What this is for"
  }
}
```

Reference another token's value with curly braces:
```json
"$value": "{font.family.primary}"
```

Style Dictionary resolves references at build time.

---

### How the sync system works

```
tokens/*.json  →  npm run build  →  build/ outputs
     │
     │  git push
     ▼
  GitHub  →  n8n webhook  →  transform DTCG→Figma  →  stored for plugin
                                                              │
                                                    designer clicks Pull
                                                              │
                                                    Figma Variables update

designer clicks Push
     │
  Figma plugin  →  POST to n8n  →  transform Figma→DTCG  →  create PR
                                                                   │
                                                         developer reviews & merges
```

---

### Troubleshooting

| Problem | Fix |
|---------|-----|
| `npm run build` fails | Check that JSON in `tokens/*.json` is valid. Run through a JSON linter. |
| `npm run build:plugin` fails | Check `figma-plugin/code.ts` for TypeScript errors. Figma type errors are expected if `@figma/plugin-typings` isn't installed — esbuild will still compile. |
| Figma Pull shows "0 variables" | The n8n Workflow A hasn't been triggered yet. Push a commit that touches `tokens/` to trigger it, or manually trigger the workflow in n8n. |
| Figma Push creates no PR | Check the n8n Workflow B execution log. Common causes: invalid GitHub token, wrong branch name, or no changes detected. |
| Token values showing `{font.family.primary}` in token_guide.md | Known cosmetic issue — the raw JSON references are displayed instead of resolved values. The actual build outputs (CSS/TS) resolve them correctly. |
