import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { figmaRgbToHex, pxToRem, figmaToTokenFiles } from './figma-to-dtcg.mjs';

describe('figmaRgbToHex', () => {
  it('converts Figma RGBA to hex string', () => {
    assert.strictEqual(figmaRgbToHex({ r: 0.114, g: 0.122, b: 0.29, a: 1 }), '#1D1F4A');
  });

  it('converts white', () => {
    assert.strictEqual(figmaRgbToHex({ r: 1, g: 1, b: 1, a: 1 }), '#FFFFFF');
  });
});

describe('pxToRem', () => {
  it('converts px number to rem string', () => {
    assert.strictEqual(pxToRem(16), '1rem');
    assert.strictEqual(pxToRem(4), '0.25rem');
    assert.strictEqual(pxToRem(64), '4rem');
  });
});

describe('figmaToTokenFiles', () => {
  it('reconstructs color.json from Figma variables', () => {
    const figmaData = {
      collections: [{
        name: 'Brand',
        variables: [{
          name: 'color/brand/primary',
          type: 'COLOR',
          value: { r: 0.114, g: 0.122, b: 0.29, a: 1 },
          description: 'Navy'
        }]
      }]
    };
    const result = figmaToTokenFiles(figmaData);
    assert.strictEqual(result['color.json'].color.brand.primary['$value'], '#1D1F4A');
    assert.strictEqual(result['color.json'].color.brand.primary['$type'], 'color');
    assert.strictEqual(result['color.json'].color.brand.primary['$description'], 'Navy');
  });

  it('reconstructs spacing.json from Figma variables', () => {
    const figmaData = {
      collections: [{
        name: 'Spacing',
        variables: [{
          name: 'spacing/4',
          type: 'FLOAT',
          value: 16,
          description: '16px'
        }]
      }]
    };
    const result = figmaToTokenFiles(figmaData);
    assert.strictEqual(result['spacing.json'].spacing['4']['$value'], '1rem');
    assert.strictEqual(result['spacing.json'].spacing['4']['$type'], 'dimension');
  });
});
