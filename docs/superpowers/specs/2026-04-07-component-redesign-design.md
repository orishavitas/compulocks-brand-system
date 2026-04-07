# Component Redesign — Design Spec
**Date:** 2026-04-07  
**Status:** Approved

## Goal

Align the `compulocks-brand-system` component library to:
1. The official **COMPULOCKS R&D AI Design Kit** (hard truth source of design rules)
2. The live **mrd-producer-webapp** production design language (M3-expressive + Compulocks brand)

The current brand system components use 4px border-radius (sharp/square) and are missing the green accent color. This closes the gap.

---

## Design Kit — Hard Rules (non-negotiable)

From `COMPULOCKS R&D AI Design Kit.txt`:

### Colors
| Token | Value | Use |
|---|---|---|
| `--compulocks-primary` | `#1D1F4A` | Backgrounds, main text, primary actions |
| `--compulocks-light-navy` | `#243469` | Secondary backgrounds, highlights |
| `--compulocks-green-dark` | `#009966` | Primary buttons, success metrics, key data points |
| `--compulocks-green-light` | `#1db274` | Secondary accents, gradients |
| `--compulocks-bg-light` | `#f2f2f2` | Light slide/card backgrounds |
| `--compulocks-white` | `#ffffff` | White surfaces |

### Typography (4-tier hierarchy)
| Class | Font | Size | Weight | Case |
|---|---|---|---|---|
| `.section-heading` | Barlow Condensed | 69px | 500 | capitalize |
| `.slide-title` | Barlow Condensed | 36px | 500 | capitalize |
| `.small-title` | Barlow | 21px | 600 | — |
| `.paragraph-text` | Barlow | 18px | 400 | — |
| `.small-text` | Barlow | 12px | 400 italic | — |

### Card Rule
Cards use `.content-card`: `border-radius: 24px`, `padding: 32px`, `background: #f2f2f2`, `border: 1px solid #e0e0e0`.  
Cards are only for: image+caption groupings, bullet point sections, callout blocks. Not for main layout containers.

---

## Token Changes

### New tokens to add to `tokens/`

**color.json** — add:
- `color.brand.green-dark: #009966`
- `color.brand.green-light: #1db274`
- `color.brand.surface: #f2f2f2`
- `color.brand.white: #ffffff`
- `color.brand.outline: #e0e0e0`

**borderRadius.json** (new file):
- `borderRadius.sm: 6px`
- `borderRadius.md: 8px`
- `borderRadius.lg: 12px`
- `borderRadius.xl: 24px`
- `borderRadius.full: 9999px`

**shadow.json** (new file):
- `shadow.sm: 0 1px 3px rgba(29,31,74,0.10)`
- `shadow.md: 0 4px 12px rgba(29,31,74,0.14)`
- `shadow.lg: 0 10px 15px rgba(29,31,74,0.15)`

**animation.json** (new file):
- `duration.fast: 120ms`
- `duration.normal: 200ms`
- `duration.slow: 350ms`

---

## Component Changes

### Button
- **Variants:** `primary` | `secondary` | `ghost` | `cta` (new)
- **border-radius:** `4px` → `9999px` (pill)
- **CTA variant:** `background: #009966`, white text — for primary call-to-action
- **Hover:** primary darkens to `#243469`; CTA darkens to `#007a52`; secondary fills with primary
- **font-weight:** 500 → 600

### Card
- **Variants:** `default` | `elevated` (unchanged)
- **border-radius:** `8px` → `24px`
- **background:** `#ffffff` → `#f2f2f2`
- **border:** `1px solid var(--color-brand-primary)` → `1px solid #e0e0e0`
- **padding:** `16px` → `32px`
- **shadow:** none (default) | `shadow.sm` (elevated, was `0 4px 16px`)

### Input
- **Variants:** `default` | `error` (unchanged)
- **border-radius:** `4px` → `8px`
- **border:** navy → `1.5px solid #C5C6D0` (neutral outline)
- **background:** transparent → `#FDFBFF`
- **focus ring:** `box-shadow: 0 0 0 2px rgba(36,52,105,0.15)` + border color `#243469`
- **padding:** `8px 12px` → `10px 14px`

### Badge
- Already pill-shaped ✅ — minimal changes
- **success variant:** generic green → `#009966` (brand green) with `rgba(0,153,102,0.12)` bg
- Add **tonal** sub-style: soft bg + brand-colored text (for "live", "beta" etc.)

### Tag
- **border-radius:** `4px` → `9999px` (pill)
- **removable variant:** close button styled as `opacity: 0.7`, separated by `6px` gap

### Chip (NEW component)
New component not in current library — heavily used in mrd-producer-webapp.
- **Variants:** `default` (outlined) | `selected`
- **default:** transparent bg, `1.5px solid #C5C6D0`, `9999px` radius
- **selected:** `background: #DEE1FF`, `border: 1.5px solid #243469`, `font-weight: 600`
- **Props:** `variant`, `children`, `onClick`, `disabled`
- Stories: Default, Selected, Disabled

---

## Typography Utility Classes

Add to Style Dictionary CSS output (as a separate utility stylesheet or appended to `variables.css`):

```css
.section-heading { font-family: Barlow Condensed; font-size: 69px; font-weight: 500; text-transform: capitalize; color: #1D1F4A; }
.slide-title     { font-family: Barlow Condensed; font-size: 36px; font-weight: 500; text-transform: capitalize; color: #1D1F4A; }
.small-title     { font-family: Barlow; font-size: 21px; font-weight: 600; color: #1D1F4A; }
.paragraph-text  { font-family: Barlow; font-size: 18px; font-weight: 400; color: #1D1F4A; }
.small-text      { font-family: Barlow; font-size: 12px; font-weight: 400; font-style: italic; color: #1D1F4A; }
```

---

## What Is NOT Changing

- Token naming convention (`color.brand.*`, `spacing.*`, etc.)
- Style Dictionary v5 build pipeline
- Component file structure (TSX + inline CSSProperties)
- Storybook setup
- Figma plugin functionality
- `component-manifest.json` format

---

## Success Criteria

- `npm run build` produces updated CSS with new tokens
- All 5 existing components visually match the "after" mockup
- New Chip component has stories and is included in manifest
- Typography utility classes are exported in CSS output
- `test-consumer` renders components correctly
- No breaking changes to existing prop APIs (only additions)
