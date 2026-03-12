import styles from './StreakBadge.module.css';

interface Props {
  label: string;
  value: number;
}

export default function StreakBadge({ label, value }: Props) {
  return (
    <div className={styles.badge}>
      <span className={styles.value}>{value}</span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
