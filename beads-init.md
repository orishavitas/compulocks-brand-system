# Beads Init Guide — compulocks-brand-system

This file documents how to initialize Beads in this repo and migrate the current in-flight work.

## Step 1: Initialize (run once)

```bash
cd /c/Users/OriShavit/Documents/GitHub/compulocks-brand-system
bd init --stealth
```

`--stealth` keeps `.beads/` local — it won't be committed to the repo.

## Step 2: Create the Sync Platform epic

```bash
bd create "Sync Platform — full implementation" -p 0
# Note the ID returned, e.g. bd-a1b2 — this is the epic
```

## Step 3: Migrate P0 task from sync-platform-session.md

```bash
bd create "Fix capability-aware diff in librarian/diff.ts" -p 0 --parent <epic-id>
# Description: buildSyncRecord() must filter allSources by capabilities.entityTypes before
# computing missing-in vs only-in. Tokens shouldn't show as missing-in Storybook.
```

## Step 4: Migrate P1 task

```bash
bd create "Wire dashboard to real Librarian data" -p 1 --parent <epic-id>
# Description: Replace stub in dashboard/app/api/state/route.ts with real Librarian call.
# import { Librarian } from "../../../../librarian/librarian";
# const librarian = new Librarian();
# return NextResponse.json(await librarian.getState());
```

## Step 5: Migrate P2 task

```bash
bd create "Implement Figma adapter (MCP path)" -p 2 --parent <epic-id>
# Description: FigmaAdapter.fetchAll() using mcp.figma.com.
# Returns Variables as Token entities + Components as Component entities.
# Requires: Figma file key + personal access token.
```

## Step 6: Migrate P3 task

```bash
bd create "Add TokenUsage entity type" -p 3 --parent <epic-id>
# Description: Add TokenUsage to adapters/types.ts + tokenUsages array to SyncState.
# interface TokenUsage { tokenId, componentId, usageContext, source }
# Populate via figma-design-system-extractor MCP tool.
```

## Step 7: Set dependencies

```bash
# P1 (dashboard) is blocked by P0 (diff fix) — fix the data first
bd dep add <p1-id> <p0-id>

# Figma adapter (P2) blocks TokenUsage (P3) — need adapter before linking
bd dep add <p3-id> <p2-id>
```

## Step 8: Verify

```bash
bd ready
# Should show only P0 (capability-aware diff) as immediately workable
```

## After completing this setup

Delete this file — the tasks now live in Beads, not in markdown.
Run `bd ready` at the start of every session to see what to work on next.
