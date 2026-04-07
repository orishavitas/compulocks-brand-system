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
