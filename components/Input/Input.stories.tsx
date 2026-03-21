import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
  argTypes: {
    variant: { control: 'select', options: ['default', 'error'] },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: { variant: 'default', placeholder: 'Enter text...' },
};

export const Error: Story = {
  args: { variant: 'error', placeholder: 'Invalid input' },
};

export const Disabled: Story = {
  args: { variant: 'default', placeholder: 'Disabled', disabled: true },
};
