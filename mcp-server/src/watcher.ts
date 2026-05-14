import chokidar from 'chokidar';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../..');

export function watchDesignFiles(onChange: (path: string) => void): void {
  const paths = [
    join(REPO_ROOT, 'component-manifest.json'),
    join(REPO_ROOT, 'build', 'json', 'tokens.json'),
    join(REPO_ROOT, 'token_guide.md'),
  ];
  chokidar.watch(paths, { ignoreInitial: true }).on('change', (path) => {
    console.error(`[mcp] File changed: ${path} - data refreshed`);
    onChange(path);
  });
}
