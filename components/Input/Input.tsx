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
