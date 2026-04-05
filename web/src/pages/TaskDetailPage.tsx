import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import Markdown from 'react-markdown';
import { GET_TASK, GET_TASKS } from '../graphql/queries';
import { COMPLETE_TASK, UNCOMPLETE_TASK } from '../graphql/mutations';
import PageShell from '../components/layout/PageShell';
import PriorityBadge from '../components/tasks/PriorityBadge';
import TaskForm from '../components/tasks/TaskForm';
import QuickAdd from '../components/tasks/QuickAdd';
import TaskCard from '../components/tasks/TaskCard';
import styles from './TaskDetailPage.module.css';

interface Task {
  id: string;
  title: string;
  description?: string | null;
  listId: string;
  parentId?: string | null;
  priority: string;
  dueDate?: string | null;
  completed: boolean;
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showEdit, setShowEdit] = useState(false);

  const { data, loading, error } = useQuery(GET_TASK, { variables: { id } });
  const { data: tasksData } = useQuery(GET_TASKS);

  const task: Task | null = data?.task ?? null;
  const allTasks = tasksData?.tasks ?? [];
  const subtasks = allTasks.filter((t: Task) => t.parentId === id);

  const refetchQueries = ['GetTask', 'GetTasks', 'GetTaskLists'];
  const [completeTask] = useMutation(COMPLETE_TASK, { refetchQueries });
  const [uncompleteTask] = useMutation(UNCOMPLETE_TASK, { refetchQueries });

  const handleToggle = async () => {
    if (!task) return;
    if (task.completed) {
      await uncompleteTask({ variables: { id: task.id } });
    } else {
      await completeTask({ variables: { id: task.id } });
    }
  };

  return (
    <PageShell title="Task">
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate('/tasks')}>
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        {task && (
          <button className={styles.editBtn} onClick={() => setShowEdit(true)}>
            <span className="material-symbols-outlined">edit</span>
          </button>
        )}
      </div>

      {loading && <p className={styles.status}>Loading...</p>}
      {error && <p className={styles.status}>Task not found.</p>}

      {task && (
        <>
          <div className={styles.header}>
            <div className={styles.titleRow}>
              <button
                className={`${styles.checkbox} ${task.completed ? styles.checked : ''}`}
                onClick={handleToggle}
              >
                {task.completed && (
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>check</span>
                )}
              </button>
              <h1 className={`${styles.taskTitle} ${task.completed ? styles.titleDone : ''}`}>
                {task.title}
              </h1>
            </div>
            <div className={styles.meta}>
              <PriorityBadge priority={task.priority} />
              {task.dueDate && (
                <span className={styles.dueDate}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>calendar_today</span>
                  {task.dueDate}
                </span>
              )}
            </div>
          </div>

          {task.description && (
            <div className={styles.description}>
              <Markdown>{task.description}</Markdown>
            </div>
          )}

          {subtasks.length > 0 && (
            <section className={styles.subtasksSection}>
              <h2 className={styles.sectionTitle}>Subtasks</h2>
              <div className={styles.subtaskList}>
                {subtasks.map((st: Task) => (
                  <TaskCard key={st.id} task={st} />
                ))}
              </div>
            </section>
          )}

          <div className={styles.addSubtask}>
            <QuickAdd listId={task.listId} parentId={task.id} placeholder="Add subtask..." />
          </div>
        </>
      )}

      {showEdit && task && (
        <TaskForm task={task} onClose={() => setShowEdit(false)} />
      )}
    </PageShell>
  );
}
