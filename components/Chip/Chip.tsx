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
