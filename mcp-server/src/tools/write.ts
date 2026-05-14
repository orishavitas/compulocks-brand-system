import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { z } from 'zod';
import { auditLog, requireAuth } from '../auth.js';
import { readManifest } from '../data.js';

const REPO_ROOT = resolve(__dirname, '../..');
const MANIFEST_PATH = join(REPO_ROOT, 'component-manifest.json');
const REQUESTS_PATH = join(REPO_ROOT, 'design-requests.md');

export function registerWriteTools(server: McpServer): void {
  server.tool(
    'approve_component',
    'Approve a draft component by flipping status to stable and triggering rebuild plus vault sync. Requires authorized contributor_id.',
    {
      name: z.string().describe('Component name to approve'),
      contributor_id: z.string().describe('Your contributor ID (email) from contributors.json'),
    },
    async ({ name, contributor_id }) => {
      const auth = requireAuth(contributor_id, 'APPROVE', name);
      if (!auth.authorized) {
        return { content: [{ type: 'text' as const, text: `Authorization failed: ${auth.error}` }] };
      }

      const manifest = readManifest();
      const comp = manifest.components.find(c => c.name.toLowerCase() === name.toLowerCase());

      if (!comp) {
        return { content: [{ type: 'text' as const, text: `Component "${name}" not found. Available: ${manifest.components.map(c => c.name).join(', ')}` }] };
      }

      if (comp.status === 'stable') {
        return { content: [{ type: 'text' as const, text: `"${name}" is already stable - no-op.` }] };
      }

      comp.status = 'stable';
      writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
      auditLog(contributor_id, 'APPROVED', name);

      try {
        execSync('npm run build', { cwd: REPO_ROOT, stdio: 'pipe' });
      } catch {
        return { content: [{ type: 'text' as const, text: `"${name}" approved in manifest, but build failed. Run npm run build manually.` }] };
      }

      return { content: [{ type: 'text' as const, text: `"${name}" approved -> stable. Build complete. All agents can now use this component.` }] };
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
        return { content: [{ type: 'text' as const, text: `Authorization failed: ${auth.error}` }] };
      }

      auditLog(contributor_id, 'REFRESH', 'triggered');
      try {
        execSync('npm run build', { cwd: REPO_ROOT, stdio: 'pipe' });
      } catch {
        return { content: [{ type: 'text' as const, text: 'Build failed. Check npm run build output manually.' }] };
      }

      return { content: [{ type: 'text' as const, text: 'Design system rebuilt and vault synced successfully.' }] };
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
        return { content: [{ type: 'text' as const, text: `Authorization failed: ${auth.error}` }] };
      }

      if (!existsSync(REQUESTS_PATH)) {
        return { content: [{ type: 'text' as const, text: 'No design requests file found.' }] };
      }

      const content = readFileSync(REQUESTS_PATH, 'utf8');
      const openRows = content.split('\n')
        .filter(l => l.startsWith('|') && l.includes('| open |'));

      if (openRows.length === 0) {
        return { content: [{ type: 'text' as const, text: 'No open design requests.' }] };
      }

      return { content: [{ type: 'text' as const, text: `Open design requests (${openRows.length}):\n\n${openRows.join('\n')}` }] };
    }
  );
}
