import { defineConfig } from 'tsup';
import { copyFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
  entry: ['components/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  external: ['react', 'react-dom'],
  outDir: 'dist',
  onSuccess: async () => {
    mkdirSync(resolve(__dirname, 'dist'), { recursive: true });
    copyFileSync(resolve(__dirname, 'styles.css'), resolve(__dirname, 'dist/styles.css'));
    console.log('styles.css → dist/styles.css');
  },
});
