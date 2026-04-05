import { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { GET_TASKS, GET_TASK_LISTS } from '../graphql/queries';
import PageShell from '../components/layout/PageShell';
import ListSelector from '../components/tasks/ListSelector';
import TaskCard from '../components/tasks/TaskCard';
import QuickAdd from '../components/tasks/QuickAdd';
import styles from './TasksPage.module.css';

interface Task {
  id: string;
  title: string;
  description?: string;
  listId: string;
  parentId?: string | null;
  priority: string;
  dueDate?: string | null;
  completed: boolean;
  sortOrder: number;
}

interface TaskNode extends Task {
  children: TaskNode[];
}

interface TaskList {
  id: string;
  name: string;
  isInbox: boolean;
  sortPreference: string;
  taskCount: number;
}

function buildTree(tasks: Task[]): TaskNode[] {
  const map = new Map<string | null, Task[]>();
  for (const task of tasks) {
    const parentId = task.parentId ?? null;
    if (!map.has(parentId)) map.set(parentId, []);
    map.get(parentId)!.push(task);
  }
  function build(parentId: string | null): TaskNode[] {
    return (map.get(parentId) ?? []).map(task => ({
      ...task,
      children: build(task.id),
    }));
  }
  return build(null);
}

function TaskTree({ nodes, depth = 0 }: { nodes: TaskNode[]; depth?: number }) {
  return (
    <>
      {nodes.map(node => (
        <div key={node.id}>
          <TaskCard task={node} depth={depth} />
          {node.children.length > 0 && (
            <TaskTree nodes={node.children} depth={depth + 1} />
          )}
        </div>
      ))}
    </>
  );
}

export default function TasksPage() {
  const { data: listsData } = useQuery(GET_TASK_LISTS);
  const lists: TaskList[] = listsData?.taskLists ?? [];
  const inboxId = lists.find(l => l.isInbox)?.id ?? null;

  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const activeListId = selectedListId ?? inboxId;

  const [showCompleted, setShowCompleted] = useState(false);

  const { data: tasksData, loading } = useQuery(GET_TASKS, {
    variables: activeListId ? { listId: activeListId } : {},
    skip: !activeListId,
  });

  const tasks: Task[] = tasksData?.tasks ?? [];
  const filtered = showCompleted ? tasks : tasks.filter(t => !t.completed);
  const tree = useMemo(() => buildTree(filtered), [filtered]);
  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <PageShell title="Tasks">
      <div className={styles.headerSection}>
        <span className={styles.eyebrow}>Productivity</span>
        <h1 className={styles.pageTitle}>Tasks</h1>
      </div>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <ListSelector
            selectedId={activeListId}
            onSelect={(id) => setSelectedListId(id)}
          />
        </aside>

        <div className={styles.content}>
          {activeListId && (
            <>
              <QuickAdd listId={activeListId} />

              {loading && <p className={styles.status}>Loading tasks...</p>}

              {!loading && tree.length === 0 && completedCount === 0 && (
                <p className={styles.status}>No tasks yet. Type above to add one.</p>
              )}

              <div className={styles.taskList}>
                <TaskTree nodes={tree} />
              </div>

              {completedCount > 0 && (
                <button
                  className={styles.toggleCompleted}
                  onClick={() => setShowCompleted(!showCompleted)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {showCompleted ? 'visibility_off' : 'visibility'}
                  </span>
                  {showCompleted ? 'Hide' : 'Show'} {completedCount} completed
                </button>
              )}
            </>
          )}

          {!activeListId && !loading && (
            <p className={styles.status}>Loading lists...</p>
          )}
        </div>
      </div>
    </PageShell>
  );
}
