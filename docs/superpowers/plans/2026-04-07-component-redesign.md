# Component Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align all brand system tokens and components to the Compulocks AI Design Kit spec — pill-shaped buttons/tags/chips, 24px cards, green CTA, new Chip component, and typography utility classes.

**Architecture:** Tokens first (Style Dictionary JSON sources), then component TSX updates (inline CSSProperties, no breaking API changes), then new Chip component, then verify with `npm run build` and `npm run build:components`.

**Tech Stack:** Style Dictionary v5, React 18, TypeScript, tsup, Storybook 10, Vitest

---

## File Map

| Action | File | What changes |
|---|---|---|
| Modify | `tokens/color.json` | Add green-dark, green-light, surface, white, outline |
| Create | `tokens/borderRadius.json` | New border-radius scale |
| Create | `tokens/shadow.json` | New shadow scale |
| Create | `tokens/animation.json` | Duration tokens |
| Modify | `build-tokens.mjs` | Read new token files in token guide generator |
| Modify | `build/css/variables.css` | Auto-regenerated — do not edit |
| Modify | `components/Button/Button.tsx` | Pill radius, cta variant, hover, weight 600 |
| Modify | `components/Button/Button.stories.tsx` | Add CTA story, update argTypes |
| Modify | `components/Card/Card.tsx` | 24px radius, #f2f2f2 bg, soft border+shadow |
| Modify | `components/Input/Input.tsx` | 8px radius, neutral border, cream bg, focus ring |
| Modify | `components/Badge/Badge.tsx` | Success → brand green, add tonal variant |
| Modify | `components/Badge/Badge.stories.tsx` | Add Tonal story |
| Modify | `components/Tag/Tag.tsx` | Pill radius, removable gap fix |
| Create | `components/Chip/Chip.tsx` | New component |
| Create | `components/Chip/Chip.stories.tsx` | Default, Selected, Disabled stories |

---

## Task 1: Expand color tokens

**Files:**
- Modify: `tokens/color.json`

- [ ] **Step 1: Update color.json**

Replace the entire file with:

```json
{
  "color": {
    "brand": {
      "primary": {
        "$value": "#1D1F4A",
        "$type": "color",
        "$description": "Main brand color — Compulocks navy blue"
      },
      "highlight": {
        "$value": "#243469",
        "$type": "color",
        "$description": "Secondary brand highlight — lighter navy"
      },
      "green-dark": {
        "$value": "#009966",
        "$type": "color",
        "$description": "Primary CTA green — buttons, success metrics, key data points"
      },
      "green-light": {
        "$value": "#1db274",
        "$type": "color",
        "$description": "Secondary accent green — gradients, hover states"
      },
      "surface": {
        "$value": "#f2f2f2",
        "$type": "color",
        "$description": "Light background — card surfaces, slide backgrounds"
      },
      "white": {
        "$value": "#ffffff",
        "$type": "color",
        "$description": "White surface"
      },
      "outline": {
        "$value": "#e0e0e0",
        "$type": "color",
        "$description": "Subtle border color for cards and dividers"
      }
    }
  }
}
```

- [ ] **Step 2: Verify build reads the new tokens**

```bash
cd C:\Users\OriShavit\Documents\GitHub\compulocks-brand-system
npm run build
```

Expected: build succeeds, `build/css/variables.css` now contains `--color-brand-green-dark`, `--color-brand-green-light`, `--color-brand-surface`, `--color-brand-white`, `--color-brand-outline`.

```bash
grep "green-dark" build/css/variables.css
```

Expected: `--color-brand-green-dark: #009966;`

- [ ] **Step 3: Commit**

```bash
git add tokens/color.json build/
git commit -m "feat(tokens): add green, surface, white, outline color tokens"
```

---

## Task 2: Add borderRadius, shadow, and animation tokens

**Files:**
- Create: `tokens/borderRadius.json`
- Create: `tokens/shadow.json`
- Create: `tokens/animation.json`

- [ ] **Step 1: Create tokens/borderRadius.json**

```json
{
  "borderRadius": {
    "sm": {
      "$value": "6px",
      "$type": "dimension",
      "$description": "Small radius — minor elements"
    },
    "md": {
      "$value": "8px",
      "$type": "dimension",
      "$description": "Medium radius — inputs, outlined fields"
    },
    "lg": {
      "$value": "12px",
      "$type": "dimension",
      "$description": "Large radius — containers"
    },
    "xl": {
      "$value": "24px",
      "$type": "dimension",
      "$description": "Extra large radius — cards (Design Kit standard)"
    },
    "full": {
      "$value": "9999px",
      "$type": "dimension",
      "$description": "Full pill radius — buttons, chips, tags, badges"
    }
  }
}
```

- [ ] **Step 2: Create tokens/shadow.json**

```json
{
  "shadow": {
    "sm": {
      "$value": "0 1px 3px rgba(29,31,74,0.10)",
      "$type": "shadow",
      "$description": "Subtle shadow — elevated cards"
    },
    "md": {
      "$value": "0 4px 12px rgba(29,31,74,0.14)",
      "$type": "shadow",
      "$description": "Medium shadow — popovers, elevated containers"
    },
    "lg": {
      "$value": "0 10px 15px rgba(29,31,74,0.15)",
      "$type": "shadow",
      "$description": "Large shadow — modals, deep elevation"
    }
  }
}
```

- [ ] **Step 3: Create tokens/animation.json**

```json
{
  "duration": {
    "fast": {
      "$value": "120ms",
      "$type": "duration",
      "$description": "Snappy micro-interactions"
    },
    "normal": {
      "$value": "200ms",
      "$type": "duration",
      "$description": "Default state transitions"
    },
    "slow": {
      "$value": "350ms",
      "$type": "duration",
      "$description": "Slower, prominent animations"
    }
  }
}
```

- [ ] **Step 4: Build and verify new CSS variables**

```bash
npm run build
grep "border-radius\|shadow\|duration" build/css/variables.css
```

Expected output includes:
```
--border-radius-sm: 6px;
--border-radius-md: 8px;
--border-radius-xl: 24px;
--border-radius-full: 9999px;
--shadow-sm: 0 1px 3px rgba(29,31,74,0.10);
--duration-fast: 120ms;
```

- [ ] **Step 5: Update build-tokens.mjs token guide generator to include new token files**

In `build-tokens.mjs`, find the `generateTokenGuide()` function (line ~82). After the existing file reads, add reads for the new token files. Replace the `generateTokenGuide` function body opening with:

```js
function generateTokenGuide() {
  const colorTokens = JSON.parse(readFileSync('tokens/color.json', 'utf-8'));
  const typographyTokens = JSON.parse(readFileSync('tokens/typography.json', 'utf-8'));
  const spacingTokens = JSON.parse(readFileSync('tokens/spacing.json', 'utf-8'));
  const borderRadiusTokens = JSON.parse(readFileSync('tokens/borderRadius.json', 'utf-8'));
  const shadowTokens = JSON.parse(readFileSync('tokens/shadow.json', 'utf-8'));
  const animationTokens = JSON.parse(readFileSync('tokens/animation.json', 'utf-8'));
```

Then at the end of `generateTokenGuide()`, before `writeFileSync`, append sections for the new tokens:

```js
  // Border Radius section
  markdown += `\n## Border Radius\n\n| Token | Value | Description |\n|-------|-------|-------------|\n`;
  Object.entries(borderRadiusTokens.borderRadius).forEach(([key, val]) => {
    markdown += `| \`borderRadius.${key}\` | \`${val.$value}\` | ${val.$description || ''} |\n`;
  });

  // Shadow section
  markdown += `\n## Shadows\n\n| Token | Value | Description |\n|-------|-------|-------------|\n`;
  Object.entries(shadowTokens.shadow).forEach(([key, val]) => {
    markdown += `| \`shadow.${key}\` | \`${val.$value}\` | ${val.$description || ''} |\n`;
  });

  // Animation section
  markdown += `\n## Animation Durations\n\n| Token | Value | Description |\n|-------|-------|-------------|\n`;
  Object.entries(animationTokens.duration).forEach(([key, val]) => {
    markdown += `| \`duration.${key}\` | \`${val.$value}\` | ${val.$description || ''} |\n`;
  });
```

- [ ] **Step 6: Run build again and verify token_guide.md has new sections**

```bash
npm run build
grep "Border Radius\|Shadows\|Animation" token_guide.md
```

Expected: all three headings appear in `token_guide.md`.

- [ ] **Step 7: Commit**

```bash
git add tokens/borderRadius.json tokens/shadow.json tokens/animation.json build-tokens.mjs build/ token_guide.md
git commit -m "feat(tokens): add borderRadius, shadow, and animation duration tokens"
```

---

## Task 3: Update Button component

**Files:**
- Modify: `components/Button/Button.tsx`
- Modify: `components/Button/Button.stories.tsx`

- [ ] **Step 1: Rewrite Button.tsx**

```tsx
import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'cta';
export type ButtonState = 'default' | 'disabled' | 'loading';

export interface ButtonProps {
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

const styles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'var(--color-brand-primary)',
    color: '#ffffff',
    border: 'none',
  },
  secondary: {
    background: 'transparent',
    color: 'var(--color-brand-primary)',
    border: '1.5px solid var(--color-brand-primary)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-brand-primary)',
    border: 'none',
  },
  cta: {
    background: 'var(--color-brand-green-dark)',
    color: '#ffffff',
    border: 'none',
  },
};

const hoverStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: { background: 'var(--color-brand-highlight)' },
  secondary: { background: 'var(--color-brand-primary)', color: '#ffffff' },
  ghost: { background: 'rgba(29,31,74,0.06)' },
  cta: { background: '#007a52' },
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  disabled = false,
  loading = false,
  children,
  onClick,
}) => {
  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...styles[variant],
        ...(hovered && !disabled && !loading ? hoverStyles[variant] : {}),
        fontFamily: 'var(--font-family-secondary)',
        padding: 'var(--spacing-2) var(--spacing-4)',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        borderRadius: 'var(--border-radius-full)',
        fontSize: '14px',
        fontWeight: 600,
        letterSpacing: '0.04em',
        transition: 'background 0.15s, color 0.15s, border-color 0.15s',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
};
```

- [ ] **Step 2: Update Button.stories.tsx**

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'cta'] },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { variant: 'primary', children: 'Button' },
};

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Button' },
};

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'Button' },
};

export const CTA: Story = {
  args: { variant: 'cta', children: 'Get Started' },
};

export const Disabled: Story = {
  args: { variant: 'primary', children: 'Button', disabled: true },
};

export const Loading: Story = {
  args: { variant: 'primary', children: 'Button', loading: true },
};
```

- [ ] **Step 3: Build components and verify no TypeScript errors**

```bash
npm run build:components 2>&1 | tail -20
```

Expected: exits 0, no type errors.

- [ ] **Step 4: Commit**

```bash
git add components/Button/
git commit -m "feat(Button): pill radius, cta variant, hover states, weight 600"
```

---

## Task 4: Update Card component

**Files:**
- Modify: `components/Card/Card.tsx`

- [ ] **Step 1: Rewrite Card.tsx**

```tsx
import React from 'react';

export type CardVariant = 'default' | 'elevated';

export interface CardProps {
  variant?: CardVariant;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ variant = 'default', children }) => {
  return (
    <div
      style={{
        background: 'var(--color-brand-surface)',
        border: '1px solid var(--color-brand-outline)',
        borderRadius: 'var(--border-radius-xl)',
        padding: '32px',
        boxShadow: variant === 'elevated' ? 'var(--shadow-sm)' : 'none',
        fontFamily: 'var(--font-family-secondary)',
      }}
    >
      {children}
    </div>
  );
};
```

- [ ] **Step 2: Build and verify**

```bash
npm run build:components 2>&1 | tail -10
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add components/Card/Card.tsx
git commit -m "feat(Card): 24px radius, #f2f2f2 surface, soft border+shadow per Design Kit"
```

---

## Task 5: Update Input component

**Files:**
- Modify: `components/Input/Input.tsx`

- [ ] **Step 1: Rewrite Input.tsx**

```tsx
import React from 'react';

export type InputVariant = 'default' | 'error';

export interface InputProps {
  variant?: InputVariant;
  disabled?: boolean;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Input: React.FC<InputProps> = ({
  variant = 'default',
  disabled = false,
  placeholder,
  value,
  onChange,
}) => {
  const [focused, setFocused] = React.useState(false);

  const borderColor = variant === 'error'
    ? '#dc2626'
    : focused
      ? 'var(--color-brand-highlight)'
      : '#C5C6D0';

  const boxShadow = focused && variant !== 'error'
    ? '0 0 0 2px rgba(36,52,105,0.15)'
    : 'none';

  return (
    <input
      disabled={disabled}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        fontFamily: 'var(--font-family-secondary)',
        padding: '10px 14px',
        border: `1.5px solid ${borderColor}`,
        borderRadius: 'var(--border-radius-md)',
        fontSize: '14px',
        outline: 'none',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'text',
        width: '100%',
        background: '#FDFBFF',
        color: 'var(--color-brand-primary)',
        boxShadow,
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    />
  );
};
```

- [ ] **Step 2: Build and verify**

```bash
npm run build:components 2>&1 | tail -10
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add components/Input/Input.tsx
git commit -m "feat(Input): 8px radius, neutral outline, cream bg, focus ring"
```

---

## Task 6: Update Badge component

**Files:**
- Modify: `components/Badge/Badge.tsx`
- Modify: `components/Badge/Badge.stories.tsx`

- [ ] **Step 1: Rewrite Badge.tsx**

```tsx
import React from 'react';

export type BadgeVariant = 'brand' | 'neutral' | 'success' | 'error' | 'tonal';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const colors: Record<BadgeVariant, { bg: string; color: string }> = {
  brand:   { bg: 'var(--color-brand-primary)', color: '#ffffff' },
  neutral: { bg: '#e5e7eb', color: '#374151' },
  success: { bg: 'rgba(0,153,102,0.12)', color: 'var(--color-brand-green-dark)' },
  error:   { bg: '#fee2e2', color: '#991b1b' },
  tonal:   { bg: 'rgba(29,31,74,0.08)', color: 'var(--color-brand-primary)' },
};

export const Badge: React.FC<BadgeProps> = ({ variant = 'brand', children }) => {
  const { bg, color } = colors[variant];
  return (
    <span
      style={{
        background: bg,
        color,
        fontFamily: 'var(--font-family-secondary)',
        fontSize: '11px',
        fontWeight: 500,
        padding: '3px 10px',
        borderRadius: '9999px',
        display: 'inline-flex',
        alignItems: 'center',
        letterSpacing: '0.02em',
      }}
    >
      {children}
    </span>
  );
};
```

- [ ] **Step 2: Update Badge.stories.tsx**

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  argTypes: {
    variant: { control: 'select', options: ['brand', 'neutral', 'success', 'error', 'tonal'] },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Brand: Story = { args: { variant: 'brand', children: 'Brand' } };
export const Neutral: Story = { args: { variant: 'neutral', children: 'Neutral' } };
export const Success: Story = { args: { variant: 'success', children: 'Live' } };
export const Error: Story = { args: { variant: 'error', children: 'Error' } };
export const Tonal: Story = { args: { variant: 'tonal', children: 'Beta' } };
```

- [ ] **Step 3: Build and verify**

```bash
npm run build:components 2>&1 | tail -10
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add components/Badge/
git commit -m "feat(Badge): brand green success variant, add tonal variant"
```

---

## Task 7: Update Tag component

**Files:**
- Modify: `components/Tag/Tag.tsx`

- [ ] **Step 1: Rewrite Tag.tsx**

```tsx
import React from 'react';

export type TagVariant = 'default' | 'removable';

export interface TagProps {
  variant?: TagVariant;
  children: React.ReactNode;
  onRemove?: () => void;
}

export const Tag: React.FC<TagProps> = ({ variant = 'default', children, onRemove }) => {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: 'var(--color-brand-highlight)',
        color: '#ffffff',
        fontFamily: 'var(--font-family-secondary)',
        fontSize: '12px',
        fontWeight: 500,
        padding: variant === 'removable' ? '4px 8px 4px 12px' : '4px 12px',
        borderRadius: '9999px',
      }}
    >
      {children}
      {variant === 'removable' && (
        <button
          onClick={onRemove}
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            padding: '0',
            lineHeight: 1,
            fontSize: '14px',
            opacity: 0.7,
            display: 'inline-flex',
            alignItems: 'center',
          }}
          aria-label="Remove"
        >
          ×
        </button>
      )}
    </span>
  );
};
```

- [ ] **Step 2: Build and verify**

```bash
npm run build:components 2>&1 | tail -10
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add components/Tag/Tag.tsx
git commit -m "feat(Tag): pill radius, tighter removable close button"
```

---

## Task 8: Create Chip component

**Files:**
- Create: `components/Chip/Chip.tsx`
- Create: `components/Chip/Chip.stories.tsx`

- [ ] **Step 1: Create components/Chip/Chip.tsx**

```tsx
import React from 'react';

export type ChipVariant = 'default' | 'selected';

export interface ChipProps {
  variant?: ChipVariant;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

const styles: Record<ChipVariant, React.CSSProperties> = {
  default: {
    background: 'transparent',
    color: 'var(--color-brand-primary)',
    border: '1.5px solid #C5C6D0',
  },
  selected: {
    background: '#DEE1FF',
    color: 'var(--color-brand-primary)',
    border: '1.5px solid var(--color-brand-highlight)',
    fontWeight: 600,
  },
};

export const Chip: React.FC<ChipProps> = ({
  variant = 'default',
  disabled = false,
  children,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={variant === 'selected'}
      style={{
        ...styles[variant],
        fontFamily: 'var(--font-family-secondary)',
        fontSize: '13px',
        fontWeight: variant === 'selected' ? 600 : 500,
        padding: '5px 14px',
        borderRadius: '9999px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        transition: 'background 0.15s, border-color 0.15s',
        lineHeight: 1.4,
      }}
    >
      {children}
    </button>
  );
};
```

- [ ] **Step 2: Create components/Chip/Chip.stories.tsx**

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Chip } from './Chip';

const meta: Meta<typeof Chip> = {
  title: 'Components/Chip',
  component: Chip,
  argTypes: {
    variant: { control: 'select', options: ['default', 'selected'] },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Chip>;

export const Default: Story = {
  args: { variant: 'default', children: 'Filter' },
};

export const Selected: Story = {
  args: { variant: 'selected', children: 'Selected' },
};

export const Disabled: Story = {
  args: { variant: 'default', children: 'Disabled', disabled: true },
};
```

- [ ] **Step 3: Build and verify**

```bash
npm run build:components 2>&1 | tail -10
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add components/Chip/
git commit -m "feat(Chip): new filter chip component with default and selected variants"
```

---

## Task 9: Add typography utility classes to CSS output

**Files:**
- Modify: `build-tokens.mjs`

- [ ] **Step 1: Append typography utility class generation to build-tokens.mjs**

At the very end of `build-tokens.mjs`, after `generateTokenGuide()` is called and before `console.log('Build complete...')`, add:

```js
// Generate typography utility classes
// (writeFileSync is already imported at the top of the file)
const typographyUtilities = `/* Compulocks Typography Utility Classes */
/* Auto-generated from COMPULOCKS R&D AI Design Kit — do not edit */

.section-heading {
  font-family: 'Barlow Condensed', 'Arial Narrow', Arial, sans-serif;
  font-size: 69px;
  font-weight: 500;
  text-transform: capitalize;
  color: var(--color-brand-primary);
}

.slide-title {
  font-family: 'Barlow Condensed', 'Arial Narrow', Arial, sans-serif;
  font-size: 36px;
  font-weight: 500;
  text-transform: capitalize;
  color: var(--color-brand-primary);
}

.small-title {
  font-family: 'Barlow', 'Segoe UI', Arial, sans-serif;
  font-size: 21px;
  font-weight: 600;
  color: var(--color-brand-primary);
}

.paragraph-text {
  font-family: 'Barlow', 'Segoe UI', Arial, sans-serif;
  font-size: 18px;
  font-weight: 400;
  color: var(--color-brand-primary);
}

.small-text {
  font-family: 'Barlow', 'Segoe UI', Arial, sans-serif;
  font-size: 12px;
  font-weight: 400;
  font-style: italic;
  color: var(--color-brand-primary);
}
`;

writeFileSync('build/css/typography.css', typographyUtilities, 'utf-8');
console.log('Typography utilities generated → build/css/typography.css');
```

Note: `writeFileSync` is already imported at the top of the file — do not add a second import.

- [ ] **Step 2: Run build and verify**

```bash
npm run build
cat build/css/typography.css
```

Expected: file exists with all 5 classes (`.section-heading`, `.slide-title`, `.small-title`, `.paragraph-text`, `.small-text`).

- [ ] **Step 3: Commit**

```bash
git add build-tokens.mjs build/css/typography.css
git commit -m "feat(tokens): generate typography utility classes to build/css/typography.css"
```

---

## Task 10: Regenerate component manifest and verify test-consumer

**Files:**
- Run: `npm run export-manifest`
- Check: `component-manifest.json`
- Check: `test-consumer/`

- [ ] **Step 1: Export manifest**

```bash
npm run export-manifest
```

Expected: `component-manifest.json` updated with 6 components (Button, Card, Input, Badge, Tag, Chip). Check:

```bash
node -e "const m = require('./component-manifest.json'); console.log(m.components.map(c => c.name))"
```

Expected: `[ 'Button', 'Card', 'Input', 'Badge', 'Tag', 'Chip' ]`

- [ ] **Step 2: Run full build**

```bash
npm run build:all
```

Expected: exits 0, no errors.

- [ ] **Step 3: Check test-consumer compiles**

```bash
cd test-consumer && npm install && npm run build 2>&1 | tail -20
```

Expected: exits 0. If there are import errors for `Chip`, check that `test-consumer` imports from `@compulocks/ui` — the new Chip export needs to be in the tsup entry point.

- [ ] **Step 4: Check tsup entry exports Chip**

Read `tsup.config.ts`. If it has an explicit `entry` array pointing to component files, add `components/Chip/Chip.tsx`. If it uses a glob or index file, the new component may already be included — verify by checking `dist/index.d.ts` for `Chip` after build.

```bash
grep "Chip" dist/index.d.ts
```

Expected: `export { Chip, ChipProps, ChipVariant } from './...';`

If missing, read `tsup.config.ts` and add Chip to the entry.

- [ ] **Step 5: Commit final state**

```bash
git add component-manifest.json dist/ tsup.config.ts
git commit -m "chore: regenerate manifest with Chip, verify dist exports"
```

---

## Task 11: Final verification

- [ ] **Step 1: Full clean build**

```bash
npm run clean && npm run build:all
```

Expected: exits 0.

- [ ] **Step 2: Verify all CSS variables present**

```bash
grep -E "green-dark|green-light|brand-surface|border-radius-full|border-radius-xl|shadow-sm|duration-fast" build/css/variables.css
```

Expected: all 7 tokens appear.

- [ ] **Step 3: Verify typography.css exists**

```bash
cat build/css/typography.css | grep "font-size"
```

Expected: 5 different font-size values (69px, 36px, 21px, 18px, 12px).

- [ ] **Step 4: Verify Chip in manifest**

```bash
node -e "const m = require('./component-manifest.json'); console.log(JSON.stringify(m.components.map(c=>c.name)))"
```

Expected: `["Button","Card","Input","Badge","Tag","Chip"]`

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: component redesign complete — tokens, components, Chip, typography utils"
```
