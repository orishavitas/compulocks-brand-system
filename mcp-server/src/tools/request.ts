import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { appendFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { z } from 'zod';

const REPO_ROOT = resolve(__dirname, '../..');
const REQUESTS_PATH = join(REPO_ROOT, 'design-requests.md');

function cell(value: string): string {
  return value.replaceAll('|', '/').replace(/\r?\n/g, ' ').trim();
}

export function registerRequestTools(server: McpServer): void {
  server.tool(
    'request_component',
    'Log a design request for a component that does not exist or is not yet stable. Open to all callers; no auth required.',
    {
      name: z.string().describe('Component name needed, e.g. "Modal"'),
      reason: z.string().describe('Why this component is needed'),
      usage_context: z.string().describe('Where in the UI it would be used'),
      requested_by: z.string().optional().describe('Agent or session identifier'),
    },
    async ({ name, reason, usage_context, requested_by }) => {
      if (!existsSync(REQUESTS_PATH)) {
        return { content: [{ type: 'text' as const, text: 'design-requests.md not found - run npm run build first' }] };
      }

      const date = new Date().toISOString();
      const requester = requested_by ?? 'unknown-agent';
      const row = `| ${cell(name)} | ${cell(reason)} | ${cell(usage_context)} | ${cell(requester)} | ${date} | open |\n`;
      appendFileSync(REQUESTS_PATH, row, 'utf8');

      return {
        content: [{
          type: 'text' as const,
          text: `Design request logged for "${name}". Your task is parked until an authorized contributor approves this component. Continue with existing stable components.`,
        }],
      };
    }
  );
}
