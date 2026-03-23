import styles from './MotivationalBanner.module.css';

interface Props {
  currentStreak: number;
}

export default function MotivationalBanner({ currentStreak }: Props) {
  const weeks = Math.floor(currentStreak / 7);
  const message = currentStreak >= 7
    ? `You've maintained this flow for over ${weeks} ${weeks === 1 ? 'week' : 'weeks'}. One small step today keeps the momentum alive.`
    : 'Keep showing up every day. Small steps build big results.';

  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        <h3 className={styles.title}>Don't break the chain!</h3>
        <p className={styles.message}>{message}</p>
      </div>
      <span className={`material-symbols-outlined ${styles.bgIcon}`}>link</span>
    </div>
  );
}
