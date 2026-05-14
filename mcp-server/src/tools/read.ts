import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getVaultAge, readSpec, readStableManifest, readTokens } from '../data.js';

export function registerReadTools(server: McpServer): void {
  server.tool('get_tokens', 'Returns all design token values', {}, async () => {
    const tokens = readTokens();
    return { content: [{ type: 'text' as const, text: JSON.stringify(tokens, null, 2) }] };
  });

  server.tool('get_manifest', 'Returns stable components only with variants and states', {}, async () => {
    const manifest = readStableManifest();
    return { content: [{ type: 'text' as const, text: JSON.stringify(manifest, null, 2) }] };
  });

  server.tool('list_components', 'Lists all stable component names with variant count', {}, async () => {
    const { components } = readStableManifest();
    const lines = components.map(c =>
      `${c.name} - variants: ${c.variants.join(', ')} | states: ${c.states.join(', ') || 'none'}`
    );
    return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
  });

  server.tool(
    'get_component',
    'Returns full detail for one stable component by name',
    { name: z.string().describe('Component name, e.g. "Button"') },
    async ({ name }) => {
      const { components } = readStableManifest();
      const comp = components.find(c => c.name.toLowerCase() === name.toLowerCase());
      if (!comp) {
        return { content: [{ type: 'text' as const, text: `Component "${name}" not found or not stable. Available: ${components.map(c => c.name).join(', ')}` }] };
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(comp, null, 2) }] };
    }
  );

  server.tool('get_spec', 'Returns design system usage rules and token reference', {}, async () => {
    const spec = readSpec();
    return { content: [{ type: 'text' as const, text: `${spec}\n\nVault last updated: ${getVaultAge()}` }] };
  });
}
