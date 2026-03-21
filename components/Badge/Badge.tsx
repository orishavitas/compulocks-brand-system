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
