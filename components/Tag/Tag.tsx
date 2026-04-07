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
