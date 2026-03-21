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
