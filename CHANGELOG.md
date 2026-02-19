# CHANGELOG

## v0.1.0 — 2026-02-19

**Session 1: Initial setup**

### v0.1.1 — Initial token system
- Created Style Dictionary v5 project
- Added brand tokens: colors (`primary`, `highlight`), typography (Barlow/Barlow Condensed, 5 text styles), spacing (4px–64px grid)
- Build outputs: CSS variables, SCSS variables, TypeScript constants, flat JSON
- Custom TypeScript format for nested `as const` exports

### v0.1.2 — Project docs
- Added `CLAUDE.md` with project instructions and versioning rules
- Added `MEMORY.md` with decisions, patterns, and gotchas
- Added `CHANGELOG.md` with session-based versioning

### v0.1.3 — AI agent instructions
- Added `AGENTS.md` based on `CLAUDE.md` for broader AI agent support

### v0.1.4 — Figma integration
- Added `FIGMA_SYNC.md` guide for synchronizing JSON tokens with Figma using Tokens Studio plugin

## v0.2.0 — 2026-02-20

**Session 2: Two-way Figma sync system**

### v0.2.1 — Design & planning
- Designed two-way Figma sync architecture: custom Figma plugin + n8n workflows (fully free tier)
- Added design doc: `docs/plans/2026-02-19-figma-two-way-sync-design.md`
- Added implementation plan: `docs/plans/2026-02-19-figma-two-way-sync-plan.md`
- 7 tasks across 5 phases: token guide (HMI), format converters, Figma plugin, n8n workflows, docs
