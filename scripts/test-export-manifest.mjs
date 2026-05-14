#!/usr/bin/env node
import assert from 'node:assert/strict';
import { extractTitle, extractNamedExports, extractArgTypesKeys, computeHash, mergeStatus } from './export-manifest.mjs';

let passed = 0; let failed = 0;
function test(label, fn) {
  try { fn(); console.log(`  PASS  ${label}`); passed++; }
  catch (err) { console.error(`  FAIL  ${label}\n        ${err.message}`); failed++; }
}

const buttonStory = `
const meta = { title: 'Components/Button', component: Button, argTypes: { variant: { control: 'select' }, disabled: { control: 'boolean' }, loading: { control: 'boolean' } } };
export default meta;
export const Primary: Story = { args: { variant: 'primary' } };
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Ghost: Story = { args: { variant: 'ghost' } };
export const Disabled: Story = { args: { variant: 'primary', disabled: true } };
export const Loading: Story = { args: { variant: 'primary', loading: true } };
`;
const cardStory = `
const meta = { title: 'Components/Card', component: Card, argTypes: { variant: { control: 'select' } } };
export default meta;
export const Default: Story = {};
export const Elevated: Story = {};
`;
const noArgTypesStory = `const meta = { title: 'Components/Badge', component: Badge }; export default meta; export const Brand: Story = {}; export const Neutral: Story = {};`;

console.log('\nextractTitle');
test('extracts title from single-quoted string', () => assert.equal(extractTitle(buttonStory), 'Components/Button'));
test('extracts title from double-quoted string', () => assert.equal(extractTitle(`const meta = { title: "Components/Card" };`), 'Components/Card'));
test('extracts title with extra whitespace', () => assert.equal(extractTitle(`const meta = { title  :  'Components/Tag' };`), 'Components/Tag'));
test('returns null when title absent', () => assert.equal(extractTitle('export default {};'), null));

console.log('\nextractNamedExports');
test('extracts all named exports from Button story', () => assert.deepEqual(extractNamedExports(buttonStory), ['Primary','Secondary','Ghost','Disabled','Loading']));
test('extracts named exports from Card story', () => assert.deepEqual(extractNamedExports(cardStory), ['Default','Elevated']));
test('excludes non-export lines', () => assert.deepEqual(extractNamedExports(`const foo=1;\nexport const Alpha: Story = {};\nexport const Beta: Story = {};`), ['Alpha','Beta']));
test('returns empty array when no named exports', () => assert.deepEqual(extractNamedExports('export default meta;'), []));

console.log('\nextractArgTypesKeys');
test('extracts argTypes keys from Button story', () => assert.deepEqual(extractArgTypesKeys(buttonStory), ['variant','disabled','loading']));
test('extracts single key from Card story', () => assert.deepEqual(extractArgTypesKeys(cardStory), ['variant']));
test('returns empty when argTypes absent', () => assert.deepEqual(extractArgTypesKeys(noArgTypesStory), []));

console.log('\ncomputeHash');
test('produces 40-char hex string', () => assert.match(computeHash('Button', ['primary','secondary'], ['default','disabled']), /^[0-9a-f]{40}$/));
test('is deterministic', () => { const h1 = computeHash('Button',['a','b'],['x']); assert.equal(h1, computeHash('Button',['a','b'],['x'])); });
test('order-independent (sorts before hashing)', () => assert.equal(computeHash('Button',['primary','ghost','secondary'],['disabled','default']), computeHash('Button',['secondary','primary','ghost'],['default','disabled'])));
test('differs when name changes', () => assert.notEqual(computeHash('Button',['primary'],['default']), computeHash('Card',['primary'],['default'])));
test('differs when variants change', () => assert.notEqual(computeHash('Button',['primary','secondary'],['default']), computeHash('Button',['primary'],['default'])));

console.log('\nmergeStatus');
test('keeps existing stable status', () => {
  const existing = { version: '1.0.0', generatedAt: '', components: [
    { name: 'Button', variants: ['Primary'], states: [], tokens: [], hash: 'abc', status: 'stable' }
  ] };
  const incoming = { name: 'Button', variants: ['Primary'], states: [], tokens: [], hash: 'abc' };
  const result = mergeStatus(incoming, existing.components);
  assert.equal(result.status, 'stable');
});
test('defaults new component to draft', () => {
  const existing = { version: '1.0.0', generatedAt: '', components: [] };
  const incoming = { name: 'Modal', variants: ['Default'], states: [], tokens: [], hash: 'xyz' };
  const result = mergeStatus(incoming, existing.components);
  assert.equal(result.status, 'draft');
});
test('does not downgrade stable when hash changes', () => {
  const existing = { version: '1.0.0', generatedAt: '', components: [
    { name: 'Card', variants: ['Default'], states: [], tokens: [], hash: 'old', status: 'stable' }
  ] };
  const incoming = { name: 'Card', variants: ['Default', 'Elevated'], states: [], tokens: [], hash: 'new' };
  const result = mergeStatus(incoming, existing.components);
  assert.equal(result.status, 'stable');
});

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
