import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './Card';

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  argTypes: {
    variant: { control: 'select', options: ['default', 'elevated'] },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: { variant: 'default', children: 'Card content goes here' },
};

export const Elevated: Story = {
  args: { variant: 'elevated', children: 'Card content goes here' },
};
