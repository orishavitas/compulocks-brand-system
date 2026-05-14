---
name: design-system
description: Access the Compulocks design system: list stable components, get tokens, file design requests, approve components. Run before any frontend task.
---

# /design-system Skill

Interacts with the Compulocks Design System MCP server (`compulocks-design`).

## Usage

`/design-system` - List all stable components and a token summary
`/design-system request` - File a design request for a missing component
`/design-system status` - Show all components with their status (human only)
`/design-system approve <Name>` - Approve a draft component (human only)
`/design-system refresh` - Rebuild and sync vault (human only)

## Behavior

**No argument:**
1. Call `list_components` and display the stable component table.
2. Call `get_tokens` and summarize key token groups: colors, spacing, type scale.
3. Print the vault last-updated timestamp from `~/.compulocks/design/.last-updated`.

**`request <description>`:**
1. Parse component name and context from the description.
2. Call `request_component({ name, reason, usage_context, requested_by: "claude-code-session" })`.
3. Confirm the request was logged and instruct the agent to park the blocked work.

**`status` (human only):**
1. Call `get_requests({ contributor_id })`; prompt for `contributor_id` if not set.
2. Display the open requests table.
3. List all components grouped by status: stable, draft, deprecated.

**`approve <Name>` (human only):**
1. Read `COMPULOCKS_CONTRIBUTOR` from the environment or prompt for it.
2. Call `approve_component({ name: Name, contributor_id })`.
3. Confirm approval and note that all agents now have access.

**`refresh` (human only):**
1. Read `COMPULOCKS_CONTRIBUTOR` from the environment or prompt for it.
2. Call `refresh({ contributor_id })`.
3. Confirm the vault is updated.

## Hard Rules

- Never hardcode design values; always use CSS custom properties from token names.
- Never use a component not returned by `list_components`.
- If a component is missing, use the `request` sub-command and park the blocked work.
