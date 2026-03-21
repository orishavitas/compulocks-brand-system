import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  argTypes: {
    variant: { control: 'select', options: ['brand', 'neutral', 'success', 'error'] },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Brand: Story = { args: { variant: 'brand', children: 'Brand' } };
export const Neutral: Story = { args: { variant: 'neutral', children: 'Neutral' } };
export const Success: Story = { args: { variant: 'success', children: 'Success' } };
export const Error: Story = { args: { variant: 'error', children: 'Error' } };
