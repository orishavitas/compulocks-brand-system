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
