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
