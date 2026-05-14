# Task Packet: T-20260514-ds-01-manifest-status

**Type:** code_implementation
**Sprint:** Design System Distribution Layer — Sprint 1
**Sequence:** 1 of 7 (parallel with T-02, T-03)
**Plan:** docs/superpowers/plans/2026-05-14-design-system-distribution.md — Task 1
**Repo:** compulocks-brand-system
**Branch:** task/T-20260514-ds-01-manifest-status

## Objective

Add `status: "stable"` to all 6 existing components in `component-manifest.json`, then update `scripts/export-manifest.mjs` to preserve status on re-export (never wipe approvals).

## Scope

Implement exactly Task 1 from the plan. Two files changed, one test file extended.

### Step 1 — Add status field to component-manifest.json

Read `component-manifest.json`. For each of the 6 components (Badge, Button, Card, Chip, Input, Tag), add `"status": "stable"` after the `"hash"` field.

### Step 2 — Write failing tests for status preservation

In `scripts/test-export-manifest.mjs`, add three tests at the end (before any final `console.log`):

```js
// Test: preserveStatus — keeps existing status
{
  const existing = { version: '1.0.0', generatedAt: '', components: [
    { name: 'Button', variants: ['Primary'], states: [], tokens: [], hash: 'abc', status: 'stable' }
  ]};
  const incoming = { name: 'Button', variants: ['Primary'], states: [], tokens: [], hash: 'abc' };
  const result = mergeStatus(incoming, existing.components);
  console.assert(result.status === 'stable', 'FAIL preserveStatus: should keep stable');
  console.log('PASS preserveStatus: keeps stable status');
}

// Test: preserveStatus — defaults new component to draft
{
  const existing = { version: '1.0.0', generatedAt: '', components: [] };
  const incoming = { name: 'Modal', variants: ['Default'], states: [], tokens: [], hash: 'xyz' };
  const result = mergeStatus(incoming, existing.components);
  console.assert(result.status === 'draft', 'FAIL preserveStatus: new component should default to draft');
  console.log('PASS preserveStatus: new component defaults to draft');
}

// Test: preserveStatus — never downgrades stable to draft
{
  const existing = { version: '1.0.0', generatedAt: '', components: [
    { name: 'Card', variants: ['Default'], states: [], tokens: [], hash: 'old', status: 'stable' }
  ]};
  const incoming = { name: 'Card', variants: ['Default', 'Elevated'], states: [], tokens: [], hash: 'new' };
  const result = mergeStatus(incoming, existing.components);
  console.assert(result.status === 'stable', 'FAIL preserveStatus: hash change should not downgrade stable');
  console.log('PASS preserveStatus: hash change does not downgrade stable');
}
```

### Step 3 — Run tests, expect FAIL

```bash
node scripts/test-export-manifest.mjs 2>&1 | tail -10
```
Expected: `ReferenceError: mergeStatus is not defined`

### Step 4 — Implement mergeStatus and wire into export-manifest.mjs

In `scripts/export-manifest.mjs`, add after the `computeHash` function:

```js
export function mergeStatus(incoming, existingComponents) {
  const existing = existingComponents.find(c => c.name === incoming.name);
  return {
    ...incoming,
    status: existing?.status ?? 'draft',
  };
}
```

Then in the main manifest-building section, before the `for (const filePath of storyFiles)` loop:

```js
let existingComponents = [];
try {
  const raw = readFileSync(OUTPUT_PATH, 'utf8');
  existingComponents = JSON.parse(raw).components ?? [];
} catch { /* file doesn't exist yet — fine */ }
```

And change `components.push({ name, variants, states, tokens, hash })` to:

```js
components.push(mergeStatus({ name, variants, states, tokens, hash }, existingComponents));
```

### Step 5 — Run tests, expect all PASS

```bash
node scripts/test-export-manifest.mjs 2>&1 | tail -15
```
Expected: all existing tests + 3 new status preservation tests PASS.

### Step 6 — Commit

```bash
git add component-manifest.json scripts/export-manifest.mjs scripts/test-export-manifest.mjs
git commit -m "feat(manifest): add status field + preserve status on re-export"
```

## Acceptance Criteria

- [ ] All 6 components in `component-manifest.json` have `"status": "stable"`
- [ ] `node scripts/test-export-manifest.mjs` — all tests pass including 3 new status preservation tests
- [ ] Re-running `npm run export-manifest` does NOT overwrite existing status values
- [ ] New components default to `"draft"` on export
- [ ] Changes committed on branch `task/T-20260514-ds-01-manifest-status`

## Notes

- Read `scripts/export-manifest.mjs` and `scripts/test-export-manifest.mjs` before editing — understand the existing structure first
- The `OUTPUT_PATH` variable in export-manifest.mjs points to `component-manifest.json`
- `mergeStatus` must be exported so the test file can import it
- Do not change any existing test logic — only add the 3 new tests at the end
