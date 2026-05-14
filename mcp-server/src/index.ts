import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerReadTools } from './tools/read.js';
import { watchDesignFiles } from './watcher.js';

const server = new McpServer({
  name: 'compulocks-design',
  version: '1.0.0',
});

registerReadTools(server);

watchDesignFiles((_path) => {
  // Tools re-read files on each call.
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[compulocks-design-mcp] Server running on stdio');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
