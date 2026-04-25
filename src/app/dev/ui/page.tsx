'use client';

import { useState } from 'react';
import {
  Button, Card, Dialog, Badge, Pill, Ring,
} from '@/components/ui';

export default function DevUIPage() {
  const [centerOpen, setCenterOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg-base px-6 py-10 text-text-primary">
      <header className="mb-10">
        <h1 className="text-3xl font-bold">UI Primitives</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Showcase dos 6 componentes base. Cada seção mostra todas as variants.
        </p>
      </header>

      <Section title="Button">
        <Group label="Variants × md">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
        </Group>
        <Group label="Sizes (primary)">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </Group>
        <Group label="States">
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
          <Button variant="secondary" loading>Loading</Button>
        </Group>
      </Section>

      <Section title="Card">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card variant="glass" padding="md">
            <p className="text-sm">Glass card</p>
          </Card>
          <Card variant="solid" padding="md">
            <p className="text-sm">Solid card</p>
          </Card>
          <Card variant="elevated" padding="md">
            <p className="text-sm">Elevated card</p>
          </Card>
          <Card variant="glass" padding="md" glow>
            <p className="text-sm">Glow purple</p>
          </Card>
        </div>
      </Section>

      <Section title="Dialog">
        <Group label="Triggers">
          <Button onClick={() => setCenterOpen(true)}>Open Center</Button>
          <Button variant="secondary" onClick={() => setSheetOpen(true)}>
            Open Sheet
          </Button>
        </Group>
        <Dialog open={centerOpen} onClose={() => setCenterOpen(false)}>
          <h2 className="text-lg font-bold">Center dialog</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Press Esc, click backdrop, or use the button to close.
          </p>
          <Button className="mt-4" onClick={() => setCenterOpen(false)}>
            Close
          </Button>
        </Dialog>
        <Dialog open={sheetOpen} onClose={() => setSheetOpen(false)} variant="sheet">
          <h2 className="text-lg font-bold">Bottom sheet</h2>
          <p className="mt-2 text-sm text-text-secondary">Slides up from bottom.</p>
          <Button className="mt-4" onClick={() => setSheetOpen(false)}>
            Close
          </Button>
        </Dialog>
      </Section>

      <Section title="Badge">
        <Group label="Variants">
          <Badge variant="gold">Gold</Badge>
          <Badge variant="purple">Purple</Badge>
          <Badge variant="cyan">Cyan</Badge>
          <Badge variant="pink">Pink</Badge>
          <Badge variant="neutral">Neutral</Badge>
        </Group>
      </Section>

      <Section title="Pill">
        <Group label="Accent variants">
          <Pill variant="gold">Gold</Pill>
          <Pill variant="purple">Purple</Pill>
          <Pill variant="cyan">Cyan</Pill>
          <Pill variant="pink">Pink</Pill>
          <Pill variant="neutral">Neutral</Pill>
        </Group>
        <Group label="Tone aliases">
          <Pill variant="pragmatico">Pragmático</Pill>
          <Pill variant="provocativo">Provocativo</Pill>
          <Pill variant="protetor">Protetor</Pill>
          <Pill variant="evasivo">Evasivo</Pill>
          <Pill variant="neutro">Neutro</Pill>
        </Group>
      </Section>

      <Section title="Ring">
        <Group label="Values × purple">
          <Ring value={0}    size={48} showValue />
          <Ring value={0.25} size={48} showValue />
          <Ring value={0.5}  size={48} showValue />
          <Ring value={0.75} size={48} showValue />
          <Ring value={1}    size={48} showValue />
        </Group>
        <Group label="Colors (50%)">
          <Ring value={0.5} color="gold"   size={48} showValue />
          <Ring value={0.5} color="purple" size={48} showValue />
          <Ring value={0.5} color="cyan"   size={48} showValue />
          <Ring value={0.5} color="pink"   size={48} showValue />
        </Group>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-lg font-bold uppercase tracking-wider text-text-secondary">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[10px] uppercase tracking-wider text-text-tertiary">{label}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}
