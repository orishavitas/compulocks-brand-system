import type { Meta, StoryObj } from '@storybook/react';
import { Tag } from './Tag';

const meta: Meta<typeof Tag> = {
  title: 'Components/Tag',
  component: Tag,
  argTypes: {
    variant: { control: 'select', options: ['default', 'removable'] },
  },
};

export default meta;
type Story = StoryObj<typeof Tag>;

export const Default: Story = { args: { variant: 'default', children: 'Label' } };
export const Removable: Story = { args: { variant: 'removable', children: 'Label' } };
