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
  const [focused, setFocused] = React.useState(false);

  const borderColor = variant === 'error'
    ? '#dc2626'
    : focused
      ? 'var(--color-brand-highlight)'
      : '#C5C6D0';

  const boxShadow = focused && variant !== 'error'
    ? '0 0 0 2px rgba(36,52,105,0.15)'
    : 'none';

  return (
    <input
      disabled={disabled}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        fontFamily: 'var(--font-family-secondary)',
        padding: '10px 14px',
        border: `1.5px solid ${borderColor}`,
        borderRadius: 'var(--border-radius-md)',
        fontSize: '14px',
        outline: 'none',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'text',
        width: '100%',
        background: '#FDFBFF',
        color: 'var(--color-brand-primary)',
        boxShadow,
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    />
  );
};
