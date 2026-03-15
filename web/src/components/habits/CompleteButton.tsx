import styles from './CompleteButton.module.css';

interface Props {
  completed: boolean;
  onToggle: () => void;
  loading?: boolean;
}

export default function CompleteButton({ completed, onToggle, loading }: Props) {
  return (
    <button
      className={styles.button}
      data-completed={completed || undefined}
      onClick={onToggle}
      disabled={loading}
      aria-label={completed ? 'Undo completion for today' : 'Mark as complete for today'}
    >
      {loading ? 'Saving...' : completed ? '✓ Completed' : 'Complete'}
    </button>
  );
}
