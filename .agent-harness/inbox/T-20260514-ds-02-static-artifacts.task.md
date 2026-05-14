# Task Packet: T-20260514-ds-02-static-artifacts

**Type:** code_implementation
**Sprint:** Design System Distribution Layer — Sprint 1
**Sequence:** 2 of 7 (parallel with T-01, T-03)
**Plan:** docs/superpowers/plans/2026-05-14-design-system-distribution.md — Task 2
**Repo:** compulocks-brand-system
**Branch:** task/T-20260514-ds-02-static-artifacts

## Objective

Create the three static governance artifacts: `contributors.json` (write-access whitelist at repo root), `design-requests.md` (append-only agent request log), and `design-audit.log` (append-only write-action audit log).

## Scope

Three new files. No existing files modified.

### Step 1 — Create contributors.json at repo root

```json
{
  "contributors": [
    { "id": "ori@compulocks.com", "name": "Ori", "role": "owner" }
  ]
}
```

**Important:** File goes in repo root (`contributors.json`), NOT in `mcp-server/`. This is the auditable, PR-controlled write-access source of truth.

### Step 2 — Create design-requests.md at repo root

```markdown
# Design Requests

Append-only log of component gaps filed by agents.
Format: one table row per request. Never delete rows — mark resolved in the Status column.

| Component | Reason | Usage Context | Requested By | Date | Status |
|-----------|--------|---------------|-------------|------|--------|
```

### Step 3 — Create design-audit.log at repo root

```
# Design System Audit Log — append only
# Format: ISO_TIMESTAMP | CONTRIBUTOR_ID | ACTION | DETAIL
```

### Step 4 — Commit

```bash
git add contributors.json design-requests.md design-audit.log
git commit -m "feat(design-system): add contributors whitelist, request log, audit log"
```

## Acceptance Criteria

- [ ] `contributors.json` exists at repo root with `ori@compulocks.com` as owner
- [ ] `design-requests.md` exists at repo root with correct header and empty table
- [ ] `design-audit.log` exists at repo root with comment header
- [ ] All three files committed on branch `task/T-20260514-ds-02-static-artifacts`

## Notes

- These are governance artifacts — keep them simple and exact as specified
- `contributors.json` must be at repo root (not inside any subdirectory) so the MCP server's auth.ts can resolve it via `path.resolve(__dirname, '../..')` from `mcp-server/src/`
- Both `design-requests.md` and `design-audit.log` are append-only by convention — never truncate or overwrite
