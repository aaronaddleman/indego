import PageShell from '../components/layout/PageShell';
import styles from './TasksPage.module.css';

export default function TasksPage() {
  return (
    <PageShell title="Tasks">
      <div className={styles.headerSection}>
        <span className={styles.eyebrow}>Productivity</span>
        <h1 className={styles.pageTitle}>Tasks</h1>
      </div>
      <p className={styles.status}>Task views coming in Phase 3.</p>
    </PageShell>
  );
}
