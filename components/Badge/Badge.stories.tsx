import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  argTypes: {
    variant: { control: 'select', options: ['brand', 'neutral', 'success', 'error', 'tonal'] },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Brand: Story = { args: { variant: 'brand', children: 'Brand' } };
export const Neutral: Story = { args: { variant: 'neutral', children: 'Neutral' } };
export const Success: Story = { args: { variant: 'success', children: 'Live' } };
export const Error: Story = { args: { variant: 'error', children: 'Error' } };
export const Tonal: Story = { args: { variant: 'tonal', children: 'Beta' } };
