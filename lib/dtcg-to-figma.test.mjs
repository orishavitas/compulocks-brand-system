import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hexToFigmaRgb, remToPx, dtcgToFigmaVariables, dtcgToFigmaTextStyles } from './dtcg-to-figma.mjs';

describe('hexToFigmaRgb', () => {
  it('converts 6-digit hex to Figma RGBA', () => {
    const result = hexToFigmaRgb('#1D1F4A');
    assert.deepStrictEqual(result, { r: 0.114, g: 0.122, b: 0.29, a: 1 });
  });

  it('handles lowercase hex', () => {
    const result = hexToFigmaRgb('#ffffff');
    assert.deepStrictEqual(result, { r: 1, g: 1, b: 1, a: 1 });
  });
});

describe('remToPx', () => {
  it('converts rem string to px number', () => {
    assert.strictEqual(remToPx('1rem'), 16);
    assert.strictEqual(remToPx('0.25rem'), 4);
    assert.strictEqual(remToPx('4rem'), 64);
  });
});

describe('dtcgToFigmaVariables', () => {
  it('converts color tokens to Figma variable format', () => {
    const colorJson = {
      color: {
        brand: {
          primary: { '$value': '#1D1F4A', '$type': 'color', '$description': 'Navy' }
        }
      }
    };
    const result = dtcgToFigmaVariables({ color: colorJson });
    assert.ok(result.collections.find(c => c.name === 'Brand'));
    const brandVars = result.collections.find(c => c.name === 'Brand').variables;
    assert.strictEqual(brandVars[0].name, 'color/brand/primary');
    assert.strictEqual(brandVars[0].type, 'COLOR');
    assert.deepStrictEqual(brandVars[0].value, { r: 0.114, g: 0.122, b: 0.29, a: 1 });
  });

  it('converts spacing tokens to Figma variable format', () => {
    const spacingJson = {
      spacing: {
        '4': { '$value': '1rem', '$type': 'dimension', '$description': '16px' }
      }
    };
    const result = dtcgToFigmaVariables({ spacing: spacingJson });
    const spacingVars = result.collections.find(c => c.name === 'Spacing').variables;
    assert.strictEqual(spacingVars[0].name, 'spacing/4');
    assert.strictEqual(spacingVars[0].type, 'FLOAT');
    assert.strictEqual(spacingVars[0].value, 16);
  });
});

describe('dtcgToFigmaTextStyles', () => {
  it('converts text style tokens to Figma text style format', () => {
    const typographyJson = {
      font: {
        family: { primary: { '$value': "'Barlow Condensed', sans-serif" } },
        weight: { medium: { '$value': '500' } }
      },
      textStyle: {
        bigShortTitle: {
          fontFamily: { '$value': '{font.family.primary}' },
          fontWeight: { '$value': '{font.weight.medium}' },
          textTransform: { '$value': 'uppercase' },
          '$description': 'Large short headlines'
        }
      }
    };
    const result = dtcgToFigmaTextStyles(typographyJson);
    assert.strictEqual(result[0].name, 'Text Styles/bigShortTitle');
    assert.strictEqual(result[0].fontFamily, 'Barlow Condensed');
    assert.strictEqual(result[0].fontWeight, 500);
    assert.strictEqual(result[0].description, 'Large short headlines | textTransform: uppercase');
  });
});
