import PageShell from '../components/layout/PageShell';

export default function HistoryPage() {
  return (
    <PageShell title="History">
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-4)' }}>
        History
      </h1>
      <p style={{ color: 'var(--color-on-surface-variant, var(--color-neutral-500))' }}>
        Momentum heatmap and habit breakdowns coming in Phase C.
      </p>
    </PageShell>
  );
}
