import PageShell from '../components/layout/PageShell';

export default function StreaksPage() {
  return (
    <PageShell title="Streaks">
      <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-4)' }}>
        Streaks
      </h1>
      <p style={{ color: 'var(--color-on-surface-variant, var(--color-neutral-500))' }}>
        Chain visualization and streak insights coming in Phase D.
      </p>
    </PageShell>
  );
}
