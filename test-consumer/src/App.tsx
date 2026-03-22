import React from 'react';
import { Button, Card, Badge, Tag, Input } from '@compulocks/ui';
import '@compulocks/ui/styles.css';

export default function App() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>@compulocks/ui — Local Consumer Test</h1>
      <section style={{ marginTop: '2rem' }}>
        <h2>Button</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="primary" disabled>Disabled</Button>
        </div>
      </section>
      <section style={{ marginTop: '2rem' }}>
        <h2>Badge</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Badge variant="brand">Brand</Badge>
          <Badge variant="neutral">Neutral</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="error">Error</Badge>
        </div>
      </section>
      <section style={{ marginTop: '2rem' }}>
        <h2>Tag</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Tag>Default Tag</Tag>
          <Tag onRemove={() => alert('removed')}>Removable Tag</Tag>
        </div>
      </section>
      <section style={{ marginTop: '2rem' }}>
        <h2>Input</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '320px' }}>
          <Input placeholder="Default input" />
          <Input placeholder="Error state" variant="error" />
          <Input placeholder="Disabled" disabled />
        </div>
      </section>
      <section style={{ marginTop: '2rem' }}>
        <h2>Card</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Card>Default card content</Card>
          <Card variant="elevated">Elevated card content</Card>
        </div>
      </section>
    </div>
  );
}
