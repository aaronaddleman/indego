import { useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { COMPLETE_TASK, UNCOMPLETE_TASK } from '../../graphql/mutations';
import PriorityBadge from './PriorityBadge';
import styles from './TaskCard.module.css';

interface Task {
  id: string;
  title: string;
  priority: string;
  dueDate?: string | null;
  completed: boolean;
  parentId?: string | null;
}

interface Props {
  task: Task;
  depth?: number;
  subtaskCount?: number;
  subtaskCompleted?: number;
  expandable?: boolean;
  expanded?: boolean;
  onToggleExpand?: (e: React.MouseEvent) => void;
}

function SubtaskProgress({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  const r = 6;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <span className={styles.subtaskProgress}>
      <svg width="16" height="16" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r={r} fill="none" stroke="var(--color-surface-highest)" strokeWidth="2" />
        <circle
          cx="8" cy="8" r={r} fill="none"
          stroke={completed === total ? 'var(--color-success)' : 'var(--color-accent)'}
          strokeWidth="2"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 8 8)"
        />
      </svg>
      <span className={styles.subtaskLabel}>{completed}/{total}</span>
    </span>
  );
}

export default function TaskCard({ task, depth = 0, subtaskCount = 0, subtaskCompleted = 0, expandable, expanded, onToggleExpand }: Props) {
  const navigate = useNavigate();
  const [completeTask] = useMutation(COMPLETE_TASK, { refetchQueries: ['GetTasks', 'GetTaskLists'] });
  const [uncompleteTask] = useMutation(UNCOMPLETE_TASK, { refetchQueries: ['GetTasks', 'GetTaskLists'] });

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.completed) {
      await uncompleteTask({ variables: { id: task.id } });
    } else {
      await completeTask({ variables: { id: task.id } });
    }
  };

  const indent = Math.min(depth, 4) * 16;

  return (
    <div
      className={`${styles.card} ${task.completed ? styles.completed : ''}`}
      style={indent ? { marginLeft: indent } : undefined}
      onClick={() => navigate(`/tasks/${task.id}`)}
    >
      {expandable && (
        <button className={`${styles.expandBtn} ${expanded ? styles.expandBtnOpen : ''}`} onClick={onToggleExpand} aria-label={expanded ? 'Collapse' : 'Expand'}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>expand_more</span>
        </button>
      )}
      <button
        className={`${styles.checkbox} ${task.completed ? styles.checked : ''}`}
        onClick={handleToggle}
        aria-label={task.completed ? 'Uncomplete' : 'Complete'}
      >
        {task.completed && (
          <span className={`material-symbols-outlined ${styles.checkIcon}`}>check</span>
        )}
      </button>
      <div className={styles.content}>
        <span className={`${styles.title} ${task.completed ? styles.titleDone : ''}`}>
          {task.title}
        </span>
        <div className={styles.meta}>
          <PriorityBadge priority={task.priority} />
          {subtaskCount > 0 && (
            <SubtaskProgress completed={subtaskCompleted} total={subtaskCount} />
          )}
          {task.dueDate && (
            <span className={styles.dueDate}>{task.dueDate}</span>
          )}
        </div>
      </div>
    </div>
  );
}
