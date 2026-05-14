# Task Packet: T-20260514-ds-07-mcp-write

**Type:** code_implementation
**Sprint:** Design System Distribution Layer — Sprint 3
**Sequence:** 7 of 7 (depends on T-06 merged)
**Plan:** docs/superpowers/plans/2026-05-14-design-system-distribution.md — Task 7
**Repo:** compulocks-brand-system
**Branch:** task/T-20260514-ds-07-mcp-write

## Objective

Add auth module and write tools to the MCP server: `request_component` (no auth, agent-safe, appends to design-requests.md), `approve_component`, `refresh`, `get_requests` (all require contributor auth). Update `index.ts` to register all 8 tools.

## Dependencies

Requires T-06 merged. Pull from master before starting.

```bash
git checkout master && git pull && git checkout -b task/T-20260514-ds-07-mcp-write
```

## Scope

3 new files under `mcp-server/src/`, 1 file updated.

**Authorization model — two write classes (not one):**
- `request_component`: no `contributor_id` required — any agent or human may call it — appends to `design-requests.md` only
- `approve_component`, `refresh`, `get_requests`: require `contributor_id` checked against `contributors.json` — hard reject + audit log if not authorized

### Step 1 — Create mcp-server/src/auth.ts

```typescript
import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../..');
const CONTRIBUTORS_PATH = join(REPO_ROOT, 'contributors.json');
const AUDIT_LOG_PATH = join(REPO_ROOT, 'design-audit.log');

export interface Contributor {
  id: string;
  name: string;
  role: string;
}

export function isAuthorized(contributorId: string): boolean {
  if (!existsSync(CONTRIBUTORS_PATH)) return false;
  const { contributors }: { contributors: Contributor[] } = JSON.parse(
    readFileSync(CONTRIBUTORS_PATH, 'utf8')
  );
  return contributors.some(c => c.id === contributorId);
}

export function auditLog(contributorId: string, action: string, detail: string): void {
  const entry = `${new Date().toISOString()} | ${contributorId} | ${action} | ${detail}\n`;
  appendFileSync(AUDIT_LOG_PATH, entry, 'utf8');
}

export function requireAuth(
  contributorId: string | undefined,
  action: string,
  detail: string
): { authorized: true } | { authorized: false; error: string } {
  if (!contributorId) {
    return { authorized: false, error: 'contributor_id is required for this action' };
  }
  if (!isAuthorized(contributorId)) {
    auditLog(contributorId, `${action}_REJECTED`, detail);
    return {
      authorized: false,
      error: `"${contributorId}" is not an authorized contributor. Add via PR to contributors.json.`,
    };
  }
  return { authorized: true };
}
```

### Step 2 — Create mcp-server/src/tools/request.ts

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { appendFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../../..');
const REQUESTS_PATH = join(REPO_ROOT, 'design-requests.md');

export function registerRequestTools(server: McpServer): void {

  server.tool(
    'request_component',
    'Log a design request for a component that does not exist or is not yet stable. Open to all callers — no auth required. Appends to design-requests.md only.',
    {
      name: z.string().describe('Component name needed, e.g. "Modal"'),
      reason: z.string().describe('Why this component is needed'),
      usage_context: z.string().describe('Where in the UI it would be used'),
      requested_by: z.string().optional().describe('Agent or session identifier'),
    },
    async ({ name, reason, usage_context, requested_by }) => {
      const date = new Date().toISOString();
      const requester = requested_by ?? 'unknown-agent';
      const row = `| ${name} | ${reason} | ${usage_context} | ${requester} | ${date} | open |\n`;

      if (!existsSync(REQUESTS_PATH)) {
        return { content: [{ type: 'text', text: 'design-requests.md not found — run npm run build first' }] };
      }

      appendFileSync(REQUESTS_PATH, row, 'utf8');

      return {
        content: [{
          type: 'text',
          text: `Design request logged for "${name}". Your task is parked until an authorized contributor approves this component. Continue with any work that uses existing stable components.`
        }]
      };
    }
  );
}
```

### Step 3 — Create mcp-server/src/tools/write.ts

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { requireAuth, auditLog } from '../auth.js';
import { readManifest } from '../data.js';

const REPO_ROOT = resolve(__dirname, '../../..');
const MANIFEST_PATH = join(REPO_ROOT, 'component-manifest.json');
const REQUESTS_PATH = join(REPO_ROOT, 'design-requests.md');

export function registerWriteTools(server: McpServer): void {

  server.tool(
    'approve_component',
    'Approve a draft component — flips status to stable, triggers rebuild and vault sync. Requires authorized contributor_id.',
    {
      name: z.string().describe('Component name to approve'),
      contributor_id: z.string().describe('Your contributor ID (email) from contributors.json'),
    },
    async ({ name, contributor_id }) => {
      const auth = requireAuth(contributor_id, 'APPROVE', name);
      if (!auth.authorized) {
        return { content: [{ type: 'text', text: `Authorization failed: ${auth.error}` }] };
      }

      const manifest = readManifest();
      const comp = manifest.components.find(c => c.name.toLowerCase() === name.toLowerCase());

      if (!comp) {
        return { content: [{ type: 'text', text: `Component "${name}" not found. Available: ${manifest.components.map(c => c.name).join(', ')}` }] };
      }

      if (comp.status === 'stable') {
        return { content: [{ type: 'text', text: `"${name}" is already stable — no-op.` }] };
      }

      comp.status = 'stable';
      writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
      auditLog(contributor_id, 'APPROVED', name);

      try {
        execSync('npm run build', { cwd: REPO_ROOT, stdio: 'pipe' });
      } catch (e) {
        return { content: [{ type: 'text', text: `"${name}" approved in manifest, but build failed. Run npm run build manually.` }] };
      }

      return { content: [{ type: 'text', text: `"${name}" approved → stable. Build complete. All agents can now use this component.` }] };
    }
  );

  server.tool(
    'refresh',
    'Trigger a full design system rebuild and vault sync. Requires authorized contributor_id.',
    {
      contributor_id: z.string().describe('Your contributor ID (email) from contributors.json'),
    },
    async ({ contributor_id }) => {
      const auth = requireAuth(contributor_id, 'REFRESH', 'full-rebuild');
      if (!auth.authorized) {
        return { content: [{ type: 'text', text: `Authorization failed: ${auth.error}` }] };
      }

      auditLog(contributor_id, 'REFRESH', 'triggered');
      try {
        execSync('npm run build', { cwd: REPO_ROOT, stdio: 'pipe' });
      } catch (e) {
        return { content: [{ type: 'text', text: 'Build failed. Check npm run build output manually.' }] };
      }

      return { content: [{ type: 'text', text: 'Design system rebuilt and vault synced successfully.' }] };
    }
  );

  server.tool(
    'get_requests',
    'Returns all open design requests. Requires authorized contributor_id.',
    {
      contributor_id: z.string().describe('Your contributor ID (email) from contributors.json'),
    },
    async ({ contributor_id }) => {
      const auth = requireAuth(contributor_id, 'GET_REQUESTS', 'read');
      if (!auth.authorized) {
        return { content: [{ type: 'text', text: `Authorization failed: ${auth.error}` }] };
      }

      if (!existsSync(REQUESTS_PATH)) {
        return { content: [{ type: 'text', text: 'No design requests file found.' }] };
      }

      const content = readFileSync(REQUESTS_PATH, 'utf8');
      const openRows = content.split('\n')
        .filter(l => l.startsWith('|') && l.includes('| open |'));

      if (openRows.length === 0) {
        return { content: [{ type: 'text', text: 'No open design requests.' }] };
      }

      return { content: [{ type: 'text', text: `Open design requests (${openRows.length}):\n\n${openRows.join('\n')}` }] };
    }
  );
}
```

### Step 4 — Update mcp-server/src/index.ts to register all tools

Replace the entire file:

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerReadTools } from './tools/read.js';
import { registerRequestTools } from './tools/request.js';
import { registerWriteTools } from './tools/write.js';
import { watchDesignFiles } from './watcher.js';

const server = new McpServer({
  name: 'compulocks-design',
  version: '1.0.0',
});

registerReadTools(server);
registerRequestTools(server);
registerWriteTools(server);

watchDesignFiles((_path) => {
  // tools re-read files on each call — no explicit action needed
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[compulocks-design-mcp] Server running on stdio');
}

main().catch(console.error);
```

### Step 5 — Build and verify all 8 tools

```bash
cd mcp-server && npm run build && cd ..
```

No TypeScript errors expected.

Verify all 8 tools registered:
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node mcp-server/dist/index.js 2>/dev/null
```

Expected: JSON listing all 8 tools: `get_tokens`, `get_manifest`, `list_components`, `get_component`, `get_spec`, `request_component`, `approve_component`, `refresh`, `get_requests`.

### Step 6 — Test auth rejection

```bash
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"approve_component","arguments":{"name":"Button","contributor_id":"notreal@example.com"}}}' | node mcp-server/dist/index.js 2>/dev/null
```

Expected: response text contains `not an authorized contributor`.

Verify audit log entry:
```bash
tail -1 design-audit.log
```
Expected: `... | notreal@example.com | APPROVE_REJECTED | Button`

### Step 7 — Test request_component (no auth)

```bash
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"request_component","arguments":{"name":"Modal","reason":"Need a modal for confirmation dialogs","usage_context":"Delete confirmation in dashboard","requested_by":"test-agent"}}}' | node mcp-server/dist/index.js 2>/dev/null
```

Expected: success response with "Design request logged" message.

Verify design-requests.md:
```bash
tail -1 design-requests.md
```
Expected: row with `Modal` and `open` status.

### Step 8 — Commit

```bash
git add mcp-server/src/
git commit -m "feat(mcp): auth + write tools (request_component, approve_component, refresh, get_requests)"
```

## Acceptance Criteria

- [ ] `cd mcp-server && npm run build` succeeds with no TypeScript errors
- [ ] `tools/list` returns all 8 tools
- [ ] `request_component` appends to `design-requests.md` without any auth parameter
- [ ] `approve_component` with unauthorized `contributor_id` → error response + rejection in `design-audit.log`
- [ ] `approve_component` with `ori@compulocks.com` on a draft component → approves, triggers build, logs to audit
- [ ] `approve_component` on already-stable component → no-op response
- [ ] `refresh` with unauthorized id → error; with authorized id → triggers build
- [ ] `get_requests` with authorized id → returns open requests (or "No open requests")
- [ ] All committed on branch `task/T-20260514-ds-07-mcp-write`

## Notes

- `REPO_ROOT` in `auth.ts` uses `resolve(__dirname, '../..')` — from `mcp-server/src/`, two levels up. Correct.
- `REPO_ROOT` in `tools/request.ts` and `tools/write.ts` uses `resolve(__dirname, '../../..')` — from `mcp-server/src/tools/`, three levels up. Correct.
- `contributors.json` is read on every call (not cached) — this is intentional per FR-02
- `request_component` has NO `contributor_id` parameter — this is intentional. Agents must be able to file requests without auth. Do not add auth to this tool.
- After approve_component succeeds, `npm run build` runs synchronously — this may take a few seconds. That is expected behavior.
