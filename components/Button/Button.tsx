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
