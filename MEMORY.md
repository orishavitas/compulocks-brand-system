# MEMORY.md

Accumulated context and learnings for the compulocks-brand-system project.

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

## Gotchas

- Style Dictionary v5 is ESM-only — build script must be `.mjs` or package must have `"type": "module"`
- Composite token values (objects) don't serialize properly in CSS/SCSS — split into individual sub-tokens instead
- The `json/flat` format handles composite values correctly (outputs nested JSON objects)
