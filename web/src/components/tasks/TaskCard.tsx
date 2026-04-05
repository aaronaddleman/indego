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
}

export default function TaskCard({ task, depth = 0, subtaskCount = 0 }: Props) {
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
            <span className={styles.subtaskCount}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>account_tree</span>
              {subtaskCount}
            </span>
          )}
          {task.dueDate && (
            <span className={styles.dueDate}>{task.dueDate}</span>
          )}
        </div>
      </div>
    </div>
  );
}
