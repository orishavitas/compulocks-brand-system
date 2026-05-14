# UI Task Intake SOP

Use this SOP before any UI-based output or review in this repo. This includes HTML review, dashboard work, web app screens, frontend components, design critique, layout changes, generated mockups, and implementation plans that affect user-facing UI.

## Automatic Trigger

If the user request mentions any of these concepts, run this SOP before answering or editing:

- HTML, page, screen, view, dashboard, web app, frontend, UI, UX, layout, component, card, table, form, modal, button, navigation, sidebar, toolbar, style, visual review, design review, responsive, mobile, desktop.

## Required Intake

1. Read the active project instructions:
   - `AGENTS.md` for Codex.
   - `CLAUDE.md` for Claude Code.

2. Load the design system state through the best available path:
   - Preferred for Claude Code: use the `compulocks-design` MCP server registered in `.claude/settings.json`.
   - Preferred for Codex or shell-only contexts: read `~/.compulocks/design/manifest.json`, `~/.compulocks/design/tokens.json`, and `~/.compulocks/design/SPEC.md`.
   - Repo fallback: read `component-manifest.json`, `build/json/tokens.json`, and `design-system/index.html`.

3. Identify usable components:
   - Stable components only.
   - Do not introduce or reference components that are missing from the stable manifest.
   - If a needed component is missing, create or recommend a `request_component` design request and mark that part blocked.

4. Identify usable tokens:
   - Use token names and CSS variables, not hardcoded brand values.
   - Check color, typography, spacing, radius, shadow, and interaction states.
   - Respect the local design kit constraints recorded in `MEMORY.md`.

5. For frontend implementation, produce or use a compact UI prep sheet before coding:
   - Component map.
   - Token variable map.
   - Design gaps and filed requests.
   - Dark mode notes.
   - Accessibility notes.

6. For reviews, evaluate against the design system before general taste:
   - Component coverage.
   - Token compliance.
   - Visual hierarchy.
   - Responsive behavior.
   - Accessibility.
   - Gaps requiring design requests.

## Hard Rules

- Do not answer a UI request from memory alone when local design system artifacts are available.
- Do not hardcode colors, spacing, typography, radius, or shadows unless explicitly explaining a source token value.
- Do not invent components. File or recommend a design request for gaps.
- Do not treat the MCP server as the only source of truth; if it is unavailable, use the local vault or repo artifacts.
- Keep the UI prep short and actionable unless the user explicitly asks for a full review.
