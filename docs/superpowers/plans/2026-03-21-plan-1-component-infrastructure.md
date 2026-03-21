# Component Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add React components + Storybook to the compulocks-brand-system repo, establishing the 5 brand components (Button, Card, Input, Badge, Tag) with variants and states, styled from existing design tokens.

**Architecture:** Components live in `components/` alongside `.stories.tsx` files. Storybook is configured to read CSS custom properties from the built token output. tsup is added as the component build tool but component build (`npm run build:components`) is wired up without publishing yet.

**Tech Stack:** React 18, TypeScript, Storybook 8, tsup, CSS custom properties from Style Dictionary output

---

## File Map

**New files:**
- `components/Button/Button.tsx` — Button component
- `components/Button/Button.stories.tsx` — Button stories (CSF3)
- `components/Button/index.ts` — barrel export
- `components/Card/Card.tsx`
- `components/Card/Card.stories.tsx`
- `components/Card/index.ts`
- `components/Input/Input.tsx`
- `components/Input/Input.stories.tsx`
- `components/Input/index.ts`
- `components/Badge/Badge.tsx`
- `components/Badge/Badge.stories.tsx`
- `components/Badge/index.ts`
- `components/Tag/Tag.tsx`
- `components/Tag/Tag.stories.tsx`
- `components/Tag/index.ts`
- `components/index.ts` — top-level barrel export
- `components/tokens.css` — imports build/css/variables.css for Storybook
- `.storybook/main.ts` — Storybook config
- `.storybook/preview.ts` — global CSS import + token decorator
- `tsup.config.ts` — component build config
- `tsconfig.components.json` — TypeScript config for components

**Modified files:**
- `package.json` — add deps, add `build:components`, `storybook`, `build-storybook` scripts
- `.gitignore` — add `storybook-static/`, `dist/`

---

### Task 1: Install dependencies and configure TypeScript

**Files:**
- Modify: `package.json`
- Create: `tsconfig.components.json`

- [ ] **Step 1: Install React, TypeScript, Storybook, tsup**

```bash
npm install --save-dev react@18 react-dom@18 @types/react@18 @types/react-dom@18 typescript tsup
npx storybook@latest init --type react --builder vite --yes
```

Expected: Storybook installs, creates `.storybook/` and `stories/` (we'll delete the sample stories).

- [ ] **Step 2: Remove Storybook sample stories**

```bash
rm -rf stories/
```

- [ ] **Step 3: Create `tsconfig.components.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "outDir": "dist"
  },
  "include": ["components/**/*"],
  "exclude": ["**/*.stories.tsx", "node_modules", "dist"]
}
```

- [ ] **Step 4: Create `tsup.config.ts`**

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['components/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  outDir: 'dist',
  external: ['react', 'react-dom'],
  injectStyle: false,
});
```

- [ ] **Step 5: Add scripts to `package.json`**

Add to the `"scripts"` section (keep existing scripts untouched):
```json
"build:components": "tsup",
"build:all": "npm run build && npm run build:components",
"storybook": "storybook dev -p 6006",
"build-storybook": "storybook build"
```

- [ ] **Step 6: Update `.gitignore`**

Append:
```
dist/
storybook-static/
```

- [ ] **Step 7: Verify Storybook starts (with no stories yet)**

```bash
npm run storybook
```

Expected: Browser opens at `http://localhost:6006`, shows empty Storybook. Close with Ctrl+C.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json tsconfig.components.json tsup.config.ts .storybook/ .gitignore
git commit -m "chore: add React, Storybook, tsup — component infrastructure"
```

---

### Task 2: Token CSS bridge for Storybook

**Files:**
- Create: `components/tokens.css`
- Modify: `.storybook/preview.ts`

- [ ] **Step 1: Build tokens to ensure CSS output exists**

```bash
npm run build
```

Expected: `build/css/variables.css` exists with CSS custom properties like `--color-brand-primary`.

- [ ] **Step 2: Create `components/tokens.css`**

This file is imported by Storybook so components can use token CSS variables at dev time. It does not get included in the dist package (consumers import their own token CSS).

```css
/* Bridge: imports built token CSS for Storybook dev environment */
/* Do not import this in production — consumers should import build/css/variables.css directly */
@import '../build/css/variables.css';

*, *::before, *::after {
  box-sizing: border-box;
}

body {
  font-family: var(--font-family-primary);
  margin: 0;
}
```

- [ ] **Step 3: Update `.storybook/preview.ts`**

```typescript
import type { Preview } from '@storybook/react';
import '../components/tokens.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
```

- [ ] **Step 4: Commit**

```bash
git add components/tokens.css .storybook/preview.ts
git commit -m "chore: bridge token CSS into Storybook preview"
```

---

### Task 3: Button component

**Files:**
- Create: `components/Button/Button.tsx`
- Create: `components/Button/Button.stories.tsx`
- Create: `components/Button/index.ts`

- [ ] **Step 1: Create `components/Button/Button.tsx`**

```tsx
import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
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
    border: '2px solid var(--color-brand-primary)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-brand-primary)',
    border: 'none',
  },
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  disabled = false,
  loading = false,
  children,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        ...styles[variant],
        fontFamily: 'var(--font-family-secondary)',
        padding: 'var(--spacing-2) var(--spacing-4)',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        borderRadius: '4px',
        fontSize: '14px',
        fontWeight: 500,
        transition: 'opacity 0.15s',
      }}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
};
```

- [ ] **Step 2: Create `components/Button/Button.stories.tsx`**

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost'] },
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

export const Disabled: Story = {
  args: { variant: 'primary', children: 'Button', disabled: true },
};

export const Loading: Story = {
  args: { variant: 'primary', children: 'Button', loading: true },
};
```

- [ ] **Step 3: Create `components/Button/index.ts`**

```typescript
export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonState } from './Button';
```

- [ ] **Step 4: Verify in Storybook**

```bash
npm run storybook
```

Expected: Button appears in sidebar under Components/Button with 5 stories. All variants render correctly using brand colors. Close with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add components/Button/
git commit -m "feat(components): add Button component with primary/secondary/ghost variants"
```

---

### Task 4: Card component

**Files:**
- Create: `components/Card/Card.tsx`
- Create: `components/Card/Card.stories.tsx`
- Create: `components/Card/index.ts`

- [ ] **Step 1: Create `components/Card/Card.tsx`**

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
        background: '#ffffff',
        border: `1px solid var(--color-brand-primary)`,
        borderRadius: '8px',
        padding: 'var(--spacing-4)',
        boxShadow: variant === 'elevated' ? '0 4px 16px rgba(29,31,74,0.12)' : 'none',
        fontFamily: 'var(--font-family-secondary)',
      }}
    >
      {children}
    </div>
  );
};
```

- [ ] **Step 2: Create `components/Card/Card.stories.tsx`**

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './Card';

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  argTypes: {
    variant: { control: 'select', options: ['default', 'elevated'] },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: { variant: 'default', children: 'Card content goes here' },
};

export const Elevated: Story = {
  args: { variant: 'elevated', children: 'Card content goes here' },
};
```

- [ ] **Step 3: Create `components/Card/index.ts`**

```typescript
export { Card } from './Card';
export type { CardProps, CardVariant } from './Card';
```

- [ ] **Step 4: Commit**

```bash
git add components/Card/
git commit -m "feat(components): add Card component with default/elevated variants"
```

---

### Task 5: Input component

**Files:**
- Create: `components/Input/Input.tsx`
- Create: `components/Input/Input.stories.tsx`
- Create: `components/Input/index.ts`

- [ ] **Step 1: Create `components/Input/Input.tsx`**

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
  return (
    <input
      disabled={disabled}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      style={{
        fontFamily: 'var(--font-family-secondary)',
        padding: 'var(--spacing-2) var(--spacing-3)',
        border: `1px solid ${variant === 'error' ? '#dc2626' : 'var(--color-brand-primary)'}`,
        borderRadius: '4px',
        fontSize: '14px',
        outline: 'none',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'text',
        width: '100%',
      }}
    />
  );
};
```

- [ ] **Step 2: Create `components/Input/Input.stories.tsx`**

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
  argTypes: {
    variant: { control: 'select', options: ['default', 'error'] },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: { variant: 'default', placeholder: 'Enter text...' },
};

export const Error: Story = {
  args: { variant: 'error', placeholder: 'Invalid input' },
};

export const Disabled: Story = {
  args: { variant: 'default', placeholder: 'Disabled', disabled: true },
};
```

- [ ] **Step 3: Create `components/Input/index.ts`**

```typescript
export { Input } from './Input';
export type { InputProps, InputVariant } from './Input';
```

- [ ] **Step 4: Commit**

```bash
git add components/Input/
git commit -m "feat(components): add Input component with default/error variants"
```

---

### Task 6: Badge component

**Files:**
- Create: `components/Badge/Badge.tsx`
- Create: `components/Badge/Badge.stories.tsx`
- Create: `components/Badge/index.ts`

- [ ] **Step 1: Create `components/Badge/Badge.tsx`**

```tsx
import React from 'react';

export type BadgeVariant = 'brand' | 'neutral' | 'success' | 'error';

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const colors: Record<BadgeVariant, { bg: string; color: string }> = {
  brand:   { bg: 'var(--color-brand-primary)', color: '#ffffff' },
  neutral: { bg: '#e5e7eb', color: '#374151' },
  success: { bg: '#dcfce7', color: '#166534' },
  error:   { bg: '#fee2e2', color: '#991b1b' },
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
        padding: 'var(--spacing-1) var(--spacing-2)',
        borderRadius: '9999px',
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      {children}
    </span>
  );
};
```

- [ ] **Step 2: Create `components/Badge/Badge.stories.tsx`**

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  argTypes: {
    variant: { control: 'select', options: ['brand', 'neutral', 'success', 'error'] },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Brand: Story = { args: { variant: 'brand', children: 'Brand' } };
export const Neutral: Story = { args: { variant: 'neutral', children: 'Neutral' } };
export const Success: Story = { args: { variant: 'success', children: 'Success' } };
export const Error: Story = { args: { variant: 'error', children: 'Error' } };
```

- [ ] **Step 3: Create `components/Badge/index.ts`**

```typescript
export { Badge } from './Badge';
export type { BadgeProps, BadgeVariant } from './Badge';
```

- [ ] **Step 4: Commit**

```bash
git add components/Badge/
git commit -m "feat(components): add Badge component with brand/neutral/success/error variants"
```

---

### Task 7: Tag component

**Files:**
- Create: `components/Tag/Tag.tsx`
- Create: `components/Tag/Tag.stories.tsx`
- Create: `components/Tag/index.ts`

- [ ] **Step 1: Create `components/Tag/Tag.tsx`**

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
        gap: 'var(--spacing-1)',
        background: 'var(--color-brand-highlight)',
        color: '#ffffff',
        fontFamily: 'var(--font-family-secondary)',
        fontSize: '12px',
        padding: 'var(--spacing-1) var(--spacing-2)',
        borderRadius: '4px',
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

- [ ] **Step 2: Create `components/Tag/Tag.stories.tsx`**

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Tag } from './Tag';

const meta: Meta<typeof Tag> = {
  title: 'Components/Tag',
  component: Tag,
  argTypes: {
    variant: { control: 'select', options: ['default', 'removable'] },
  },
};

export default meta;
type Story = StoryObj<typeof Tag>;

export const Default: Story = { args: { variant: 'default', children: 'Label' } };
export const Removable: Story = { args: { variant: 'removable', children: 'Label' } };
```

- [ ] **Step 3: Create `components/Tag/index.ts`**

```typescript
export { Tag } from './Tag';
export type { TagProps, TagVariant } from './Tag';
```

- [ ] **Step 4: Commit**

```bash
git add components/Tag/
git commit -m "feat(components): add Tag component with default/removable variants"
```

---

### Task 8: Top-level barrel export + component build verification

**Files:**
- Create: `components/index.ts`

- [ ] **Step 1: Create `components/index.ts`**

```typescript
export * from './Button';
export * from './Card';
export * from './Input';
export * from './Badge';
export * from './Tag';
```

- [ ] **Step 2: Verify Storybook shows all 5 components**

```bash
npm run storybook
```

Expected: Sidebar shows Button (5 stories), Card (2), Input (3), Badge (4), Tag (2). All render with correct brand colors. Close with Ctrl+C.

- [ ] **Step 3: Verify component build succeeds**

```bash
npm run build:components
```

Expected: `dist/` directory created with `index.js`, `index.mjs`, `index.d.ts`.

- [ ] **Step 4: Verify build:all works**

```bash
npm run build:all
```

Expected: Style Dictionary outputs regenerated AND component dist rebuilt. No errors.

- [ ] **Step 5: Commit**

```bash
git add components/index.ts
git commit -m "feat(components): wire barrel export, verify full build pipeline"
```
