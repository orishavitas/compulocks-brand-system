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
