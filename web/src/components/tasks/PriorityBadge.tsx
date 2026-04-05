import styles from './PriorityBadge.module.css';

const LABELS: Record<string, string> = { P1: 'P1', P2: 'P2', P3: 'P3', P4: 'P4' };

export default function PriorityBadge({ priority }: { priority: string }) {
  if (priority === 'P4') return null;
  return (
    <span className={`${styles.badge} ${styles[priority]}`}>
      {LABELS[priority]}
    </span>
  );
}
