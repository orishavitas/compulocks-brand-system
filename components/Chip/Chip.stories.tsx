import type { Meta, StoryObj } from '@storybook/react';
import { Chip } from './Chip';

const meta: Meta<typeof Chip> = {
  title: 'Components/Chip',
  component: Chip,
  argTypes: {
    variant: { control: 'select', options: ['default', 'selected'] },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Chip>;

export const Default: Story = {
  args: { variant: 'default', children: 'Filter' },
};

export const Selected: Story = {
  args: { variant: 'selected', children: 'Selected' },
};

export const Disabled: Story = {
  args: { variant: 'default', children: 'Disabled', disabled: true },
};
