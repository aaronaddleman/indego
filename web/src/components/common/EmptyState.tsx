import styles from './EmptyState.module.css';

interface Props {
  message: string;
  action?: () => void;
  actionLabel?: string;
}

export default function EmptyState({ message, action, actionLabel }: Props) {
  return (
    <div className={styles.container}>
      <p className={styles.message}>{message}</p>
      {action && actionLabel && (
        <button className={styles.btn} onClick={action}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
