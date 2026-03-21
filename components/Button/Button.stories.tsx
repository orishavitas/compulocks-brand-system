import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost'] },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { variant: 'primary', children: 'Button' },
};

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'Button' },
};

export const Ghost: Story = {
  args: { variant: 'ghost', children: 'Button' },
};

export const Disabled: Story = {
  args: { variant: 'primary', children: 'Button', disabled: true },
};

export const Loading: Story = {
  args: { variant: 'primary', children: 'Button', loading: true },
};
