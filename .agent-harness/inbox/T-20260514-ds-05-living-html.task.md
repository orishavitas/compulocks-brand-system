# Task Packet: T-20260514-ds-05-living-html

**Type:** code_implementation
**Sprint:** Design System Distribution Layer — Sprint 2
**Sequence:** 5 of 7 (parallel with T-06, T-07 — depends on T-01 through T-04 merged)
**Plan:** docs/superpowers/plans/2026-05-14-design-system-distribution.md — Task 5
**Repo:** compulocks-brand-system
**Branch:** task/T-20260514-ds-05-living-html

## Objective

Create `scripts/generate-living-html.mjs` which generates `design-system/index.html` — a self-contained static design specimen page for human visual review and component approval. This is the human approval console for the design governance loop.

## Dependencies

Requires T-01 through T-04 merged. Pull from master before starting.

```bash
git checkout master && git pull && git checkout -b task/T-20260514-ds-05-living-html
```

## Scope

One new script, one generated HTML file, one README. v1 rendering contract: static HTML specimens styled with CSS custom properties — not React-rendered. Sufficient for human approval of token values, colors, spacing, and component shape.

### Step 1 — Create design-system/ directory

```bash
mkdir -p design-system
```

Create `design-system/README.md`:
```markdown
# generated — do not edit
```

### Step 2 — Create scripts/generate-living-html.mjs

The full script is specified in the plan at `docs/superpowers/plans/2026-05-14-design-system-distribution.md` — Task 5, Step 2. Implement it exactly as written there.

Key behavior:
- Reads `build/json/tokens.json` and `component-manifest.json`
- Generates a single self-contained HTML file at `design-system/index.html`
- Renders: color swatches, type scale, spacing bars, component specimens for all 6 components
- Draft components show a warning banner and muted opacity
- Sticky toolbar at top lists any draft components with copy-paste `npm run approve <Name>` commands
- Header shows version, generated date, stable component count
- All CSS custom properties defined inline in `<style>` — no external CSS dependencies at runtime
- Google Fonts loaded via `<link>` (Barlow Condensed + Barlow) — acceptable external dependency

### Step 3 — Run and verify

```bash
npm run build
```

Expected output includes:
```
[generate-living-html] Written: ...design-system/index.html
[generate-living-html] 6 stable, 0 draft
[sync-vault] Vault updated at ...
```

Open `design-system/index.html` in a browser and verify:
- Header shows version and generated date
- Color swatches render with correct Compulocks brand colors
- Type scale renders with Barlow Condensed specimens
- Spacing bars render as green bars proportional to token values
- All 6 component specimens render (Button variants, Badge variants, Card, Chip, Input, Tag)
- No draft toolbar visible (all stable)
- All component cards show green `stable` badge

### Step 4 — Commit

```bash
git add scripts/generate-living-html.mjs design-system/index.html design-system/README.md
git commit -m "feat(living-html): add design specimen page generator — design-system/index.html"
```

## Acceptance Criteria

- [ ] `npm run build` generates `design-system/index.html` without errors
- [ ] HTML file is self-contained (opens in browser with no server)
- [ ] All 6 components render as specimens with variant labels
- [ ] Draft components (if any) show warning banner + approve command
- [ ] Stable components show green `stable` status badge
- [ ] Color swatches, type scale, and spacing bars all render
- [ ] "Last generated" date is shown in header
- [ ] No draft toolbar when all components are stable
- [ ] Committed on branch `task/T-20260514-ds-05-living-html`

## Notes

- v1 rendering contract: static HTML specimens, not React-rendered output. This is intentional — sufficient for human visual approval of the design system. React fidelity is Phase 2.
- The `generate-living-html.mjs` script is already wired into `build-tokens.mjs` by Task 4 — `npm run build` will call it automatically once the file exists
- If `build/json/tokens.json` does not exist, run `npm run build` once first (before the wiring) to generate it, then run again with the new script in place
- The HTML must work on Windows (file paths use backslashes in console output but the HTML itself uses no paths — it is self-contained)
