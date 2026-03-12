import { useMutation } from '@apollo/client';
import { LOG_COMPLETION, UNDO_COMPLETION } from '../../graphql/mutations';
import styles from './CompletionToggle.module.css';

interface Props {
  habitId: string;
  date: string;
  completed: boolean;
}

export default function CompletionToggle({ habitId, date, completed }: Props) {
  const [logCompletion, { loading: logging }] = useMutation(LOG_COMPLETION);
  const [undoCompletion, { loading: undoing }] = useMutation(UNDO_COMPLETION);

  const loading = logging || undoing;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;

    if (completed) {
      await undoCompletion({ variables: { habitId, date } });
    } else {
      await logCompletion({ variables: { habitId, date } });
    }
  };

  return (
    <button
      className={`${styles.toggle} ${completed ? styles.completed : ''}`}
      onClick={handleClick}
      disabled={loading}
      aria-label={completed ? 'Undo completion' : 'Mark as complete'}
    >
      {completed ? '✓' : ''}
    </button>
  );
}
