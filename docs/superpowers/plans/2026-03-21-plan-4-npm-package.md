# Plan 4 of 4 — npm Package

**Goal:** Configure `@compulocks/ui` for publishing to the npm registry. Set correct package.json fields, wire CSS delivery, add a local consumer test that proves the package installs and renders correctly, exclude development noise via `.npmignore`, and document the publish workflow in `CLAUDE.md`.

**Architecture:** tsup produces `dist/` (CJS + ESM + types). A `styles.css` at `dist/styles.css` re-exports all token CSS custom properties. Consumers import components and styles from the package name only — no deep path knowledge required except `/styles.css`.

**Tech Stack:** tsup (build), Vite + React (consumer test), npm (publish target)

**Assumes:** Plans 1–3 complete — `components/` exists, Storybook runs, `npm run build:components` produces a valid `dist/` directory.

---

## File Map

```
compulocks-brand-system/
├── package.json                          # MODIFIED — publishing fields added
├── tsup.config.ts                        # MODIFIED — add styles.css copy step
├── styles.css                            # NEW — re-exports build/css/variables.css content
├── .npmignore                            # NEW — excludes dev files from published tarball
├── dist/                                 # Built output (gitignored)
│   ├── index.js                          # CJS entry
│   ├── index.mjs                         # ESM entry
│   ├── index.d.ts                        # Type declarations
│   └── styles.css                        # Token CSS custom properties
├── test-consumer/                        # NEW — local install test
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       └── App.tsx
└── CLAUDE.md                             # MODIFIED — Publishing section added
```

---

## Task 1 — Configure package.json for publishing

**Time estimate:** 3 min

Open `package.json`. Replace the current contents with the version below. Every existing field is preserved; publishing fields are added around them.

File: `package.json`

```json
{
  "name": "@compulocks/ui",
  "version": "0.1.0",
  "description": "Compulocks brand design tokens and React component library",
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./styles.css": "./dist/styles.css"
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "node build-tokens.mjs",
    "build:plugin": "npx esbuild figma-plugin/code.ts --bundle --outfile=figma-plugin/code.js --target=es6",
    "build:components": "tsup",
    "build:all": "npm run build && npm run build:components",
    "clean": "rm -rf build/ dist/",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  },
  "keywords": ["design-system", "compulocks", "react", "design-tokens"],
  "author": "Compulocks",
  "license": "MIT",
  "type": "commonjs",
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18"
  },
  "dependencies": {
    "style-dictionary": "^5.3.1"
  },
  "devDependencies": {
    "esbuild": "^0.27.3",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "tsup": "^8.0.0",
    "typescript": "^5.4.0"
  }
}
```

**Key decisions:**
- `"name"` is the scoped package name consumers install with `npm install @compulocks/ui`
- `"version"` starts at `0.1.0` — bump to `1.0.0` only when the API is considered stable
- `"main"` / `"module"` / `"types"` are legacy fields for older bundlers that don't read `exports`
- `"exports"` is the modern entrypoint map — bundlers that support it use this exclusively
- `"./styles.css"` export lets consumers write `import '@compulocks/ui/styles.css'` without knowing the `dist/` path
- `"files": ["dist"]` is the whitelist — only the `dist/` directory goes into the tarball; everything else is excluded unless listed in `.npmignore` negation patterns
- `"peerDependencies"` declares react ≥ 18 as the consumer's responsibility — the package does not bundle React

**Verify:**
```bash
cat package.json
```
Expected: JSON with `"name": "@compulocks/ui"` and all fields above.

**Commit:**
```bash
git add package.json
git commit -m "chore(npm): configure package.json for @compulocks/ui publishing"
```

---

## Task 2 — Create styles.css source file

**Time estimate:** 2 min

This file is the source-side CSS that gets copied into `dist/styles.css` during the tsup build. Its content is the full `build/css/variables.css` output from Style Dictionary — all token CSS custom properties under `:root`.

First, check what `build/css/variables.css` looks like so you copy the right structure:

```bash
cat build/css/variables.css
```

Then create `styles.css` at the repo root. This file is a thin wrapper that documents its origin and re-exports the variables. The tsup build step (Task 3) will copy this file into `dist/`.

File: `styles.css` (repo root)

```css
/**
 * Compulocks Design Token CSS Custom Properties
 *
 * Auto-generated from tokens/*.json via Style Dictionary v5.
 * Do NOT edit this file directly — run `npm run build` to regenerate,
 * then `npm run build:components` to copy into dist/.
 *
 * Consumer usage:
 *   import '@compulocks/ui/styles.css';
 */

/* paste the full contents of build/css/variables.css here */
```

**Important:** After running `npm run build` (which regenerates `build/css/variables.css`), replace the comment placeholder above with the actual `:root { ... }` block from that file. The content of `build/css/variables.css` at the time Plan 4 is executed is the correct value to paste.

The practical workflow for keeping `styles.css` in sync:
1. Edit tokens in `tokens/*.json`
2. Run `npm run build` — regenerates `build/css/variables.css`
3. Copy the `:root` block from `build/css/variables.css` into `styles.css`
4. Run `npm run build:components` — tsup copies `styles.css` into `dist/styles.css`

A future improvement (not in scope for Plan 4) would be to automate step 3 via a postbuild script.

**Verify:**
```bash
head -5 styles.css
```
Expected: The comment header.

**Commit:**
```bash
git add styles.css
git commit -m "chore(npm): add styles.css source for token CSS custom properties"
```

---

## Task 3 — Update tsup.config.ts to copy styles.css into dist/

**Time estimate:** 3 min

tsup handles JS/TS compilation but does not automatically copy CSS files. Add an `onSuccess` hook that copies `styles.css` → `dist/styles.css` after the JS build completes.

File: `tsup.config.ts` (full replacement — assumes Plan 1 created this file)

```typescript
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
    // Copy token CSS custom properties into dist/ so consumers can import
    // '@compulocks/ui/styles.css' without knowing the internal build path.
    mkdirSync(resolve(__dirname, 'dist'), { recursive: true });
    copyFileSync(
      resolve(__dirname, 'styles.css'),
      resolve(__dirname, 'dist/styles.css')
    );
    console.log('styles.css → dist/styles.css');
  },
});
```

**Key decisions:**
- `external: ['react', 'react-dom']` prevents React from being bundled into the output — consumers provide their own React via peerDependencies
- `dts: true` generates `.d.ts` declaration files for TypeScript consumers
- `clean: true` clears `dist/` before each build — prevents stale files accumulating
- `onSuccess` runs after tsup finishes; `copyFileSync` is synchronous so no async issues
- `__dirname` is available in tsup config (CommonJS context)

**Run the build and verify output:**
```bash
npm run build:components
```

Expected output:
```
CJS  dist/index.js
ESM  dist/index.mjs
DTS  dist/index.d.ts
styles.css → dist/styles.css
```

Then verify the files exist:
```bash
ls dist/
```

Expected:
```
index.d.ts  index.js  index.mjs  styles.css
```

**Commit:**
```bash
git add tsup.config.ts
git commit -m "chore(npm): copy styles.css into dist/ via tsup onSuccess hook"
```

---

## Task 4 — Write the local consumer test

**Time estimate:** 10 min

Create a minimal Vite + React app in `test-consumer/` that installs the package locally via `file:../` and proves the components render and styles load correctly.

### Step 4a — Create test-consumer directory and files

Create all files below. Do not run `npm install` yet — that happens in Step 4b.

**File: `test-consumer/package.json`**

```json
{
  "name": "test-consumer",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@compulocks/ui": "file:../",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.4.0",
    "vite": "^5.4.0"
  }
}
```

The `"file:../"` dependency tells npm to symlink the local package — changes to `dist/` are reflected immediately after rebuilding without re-installing.

**File: `test-consumer/vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
```

**File: `test-consumer/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true
  },
  "include": ["src"]
}
```

**File: `test-consumer/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>@compulocks/ui — consumer test</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**File: `test-consumer/src/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**File: `test-consumer/src/App.tsx`**

```tsx
import React from 'react';
import { Button, Card, Badge, Tag, Input } from '@compulocks/ui';
import '@compulocks/ui/styles.css';

export default function App() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>@compulocks/ui — Local Consumer Test</h1>
      <p>
        If you can see styled components below, the package is wired correctly.
      </p>

      <section style={{ marginTop: '2rem' }}>
        <h2>Button</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="primary" disabled>Disabled</Button>
        </div>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Badge</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Badge variant="brand">Brand</Badge>
          <Badge variant="neutral">Neutral</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="error">Error</Badge>
        </div>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Tag</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Tag>Default Tag</Tag>
          <Tag onRemove={() => alert('removed')}>Removable Tag</Tag>
        </div>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Input</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '320px' }}>
          <Input placeholder="Default input" />
          <Input placeholder="Error state" variant="error" />
          <Input placeholder="Disabled" disabled />
        </div>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Card</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Card>Default card content</Card>
          <Card variant="elevated">Elevated card content</Card>
        </div>
      </section>
    </div>
  );
}
```

### Step 4b — Install and run

```bash
cd test-consumer && npm install
```

Expected: npm resolves `@compulocks/ui` from `file:../` and installs Vite + React dev deps. No errors.

```bash
npm run dev
```

Expected output:
```
  VITE v5.x.x  ready in Xms

  ➜  Local:   http://localhost:5173/
```

Open `http://localhost:5173/` in a browser. You should see:
- The heading "@ compulocks/ui — Local Consumer Test"
- All five component sections rendering without errors
- Buttons using the brand primary color (`#1D1F4A` or the token value)
- No console errors about missing modules or unresolved imports

If you see `Cannot find module '@compulocks/ui'`, ensure `npm run build:components` was run first (dist/ must exist before npm install resolves the file: link).

If you see `Cannot find module '@compulocks/ui/styles.css'`, check that `dist/styles.css` exists and that `package.json` has the `"./styles.css": "./dist/styles.css"` entry in `exports`.

### Step 4c — Commit

```bash
cd ..
git add test-consumer/
git commit -m "test(npm): add local consumer app to verify @compulocks/ui import + styles"
```

---

## Task 5 — Add .npmignore

**Time estimate:** 2 min

The `"files": ["dist"]` field in package.json already whitelists only `dist/`. However, `.npmignore` provides a second layer of protection and explicitly documents what is excluded, which is valuable for maintainers.

File: `.npmignore` (repo root)

```
# Source files — not needed by consumers
components/
tokens/
lib/
figma-plugin/
n8n/
scripts/
docs/
.storybook/
test-consumer/

# Build artifacts that are not the npm output
build/
storybook-static/

# Config and tooling
*.config.ts
*.config.mjs
*.config.js
tsconfig*.json
.eslintrc*
.prettierrc*
build-tokens.mjs

# Source maps (reduce tarball size; consumers get types via .d.ts)
dist/*.map
dist/**/*.map

# Dev and CI files
.github/
.env*
*.log
node_modules/

# Documentation (kept in repo but not needed in the package)
CHANGELOG.md
FIGMA_SYNC.md
MEMORY.md
token_guide.md
*.md

# Editor
.vscode/
.idea/
```

**Note on interaction with `"files"` field:** When `"files"` is set in package.json, npm uses it as a whitelist — only listed paths are included. `.npmignore` then trims from that whitelist. With `"files": ["dist"]`, the `.npmignore` mainly protects against accidental inclusions (e.g., if `files` is ever broadened) and documents intent explicitly.

**Verify what would be published without actually publishing:**
```bash
npm pack --dry-run
```

Expected output lists only:
```
dist/index.js
dist/index.mjs
dist/index.d.ts
dist/styles.css
package.json
README.md        (if it exists)
```

No `components/`, `tokens/`, `test-consumer/`, `.storybook/`, or `build/` entries should appear.

**Commit:**
```bash
git add .npmignore
git commit -m "chore(npm): add .npmignore to exclude dev files from published tarball"
```

---

## Task 6 — Document publish workflow in CLAUDE.md

**Time estimate:** 3 min

Add a "Publishing" section to `CLAUDE.md`. Insert it after the existing "Key Rules" section (at the end of the file).

Append the following to `CLAUDE.md`:

```markdown
## Publishing

### Package identity
- **npm package name:** `@compulocks/ui`
- **Registry:** public npm (`registry.npmjs.org`)
- **Scope:** `@compulocks` — requires npm org or user account with that scope

### Pre-publish checklist
1. Run `npm run build:all` — both Style Dictionary outputs and dist/ must be current
2. Run `npm pack --dry-run` — verify only `dist/` files appear in the tarball
3. Verify `dist/styles.css` exists and contains the `:root { ... }` token variables
4. Check `package.json` version is bumped appropriately (see Versioning section)
5. Confirm `test-consumer/` app runs without errors (`cd test-consumer && npm run dev`)

### Version bump process
Follow the existing versioning rules (see Versioning section above):
- **Patch** (`0.0.X`) — bug fixes, token value corrections, style tweaks
- **Minor** (`0.X.0`) — new components, new token groups, new exports
- **Major** (`X.0.0`) — breaking API changes (rename/remove exports, peer dep bump)

Bump command:
```bash
npm version patch   # or minor / major
```

This updates `package.json` and creates a git tag automatically.

### Publishing (manual)
```bash
# First publish (requires npm login with @compulocks scope access)
npm login
npm publish --access public

# Subsequent publishes
npm version patch    # bump version
npm publish          # publishes current dist/ to registry
git push --follow-tags
```

### What gets included
Only the `dist/` directory is published (enforced by `"files": ["dist"]` in package.json):
- `dist/index.js` — CommonJS build for Node/older bundlers
- `dist/index.mjs` — ESM build for modern bundlers (Vite, webpack 5, Rollup)
- `dist/index.d.ts` — TypeScript declarations
- `dist/styles.css` — Token CSS custom properties (`:root` block)

Source files, Storybook, test-consumer, n8n configs, and build/ are excluded.

### Consumer usage (after install)
```bash
npm install @compulocks/ui
```

```tsx
import { Button, Card, Badge, Tag, Input } from '@compulocks/ui';
import '@compulocks/ui/styles.css';
```

### What NOT to do
- Do NOT publish without running `npm run build:all` first — dist/ may be stale
- Do NOT `npm publish` from the `test-consumer/` directory
- Do NOT manually edit files in `dist/` — they are overwritten on every build
```

**Commit:**
```bash
git add CLAUDE.md
git commit -m "docs(npm): add Publishing section to CLAUDE.md"
```

---

## Final Verification

Run the full sequence end-to-end to confirm everything is wired:

```bash
# 1. Rebuild all outputs from source
npm run build:all
```

Expected: Style Dictionary runs (tokens → build/), tsup runs (components → dist/), styles.css copied to dist/.

```bash
# 2. Inspect the dist/ output
ls dist/
```

Expected: `index.d.ts  index.js  index.mjs  styles.css`

```bash
# 3. Check styles.css has actual CSS content
head -20 dist/styles.css
```

Expected: Comment header followed by `:root {` with CSS custom properties like `--color-brand-primary`.

```bash
# 4. Dry-run the publish to confirm tarball contents
npm pack --dry-run
```

Expected: Only dist/ files listed. No source, no storybook, no test-consumer.

```bash
# 5. Run the consumer test
cd test-consumer && npm install && npm run dev
```

Expected: Vite starts at `http://localhost:5173/`. Components render with brand styles. No console errors.

---

## Commit Summary

Each task produces one atomic commit:

| Task | Commit message |
|------|----------------|
| 1 | `chore(npm): configure package.json for @compulocks/ui publishing` |
| 2 | `chore(npm): add styles.css source for token CSS custom properties` |
| 3 | `chore(npm): copy styles.css into dist/ via tsup onSuccess hook` |
| 4 | `test(npm): add local consumer app to verify @compulocks/ui import + styles` |
| 5 | `chore(npm): add .npmignore to exclude dev files from published tarball` |
| 6 | `docs(npm): add Publishing section to CLAUDE.md` |

After all tasks pass, the package is publish-ready. Run `npm publish --access public` when you want to release to the registry.
