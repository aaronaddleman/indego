import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { CREATE_TASK, UPDATE_TASK, DELETE_TASK } from '../../graphql/mutations';
import ConfirmDialog from '../common/ConfirmDialog';
import styles from './TaskForm.module.css';

interface Task {
  id: string;
  title: string;
  description?: string | null;
  listId: string;
  priority: string;
  dueDate?: string | null;
}

interface Props {
  task?: Task;
  listId?: string;
  parentId?: string;
  onClose: () => void;
}

const PRIORITIES = [
  { value: 'P1', label: 'P1 — Critical' },
  { value: 'P2', label: 'P2 — High' },
  { value: 'P3', label: 'P3 — Medium' },
  { value: 'P4', label: 'P4 — Low' },
];

export default function TaskForm({ task, listId, parentId, onClose }: Props) {
  const isEdit = !!task;
  const navigate = useNavigate();
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [priority, setPriority] = useState(task?.priority ?? 'P4');
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '');
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const refetchQueries = ['GetTasks', 'GetTaskLists', 'GetTask'];
  const [createTask, { loading: creating }] = useMutation(CREATE_TASK, { refetchQueries });
  const [updateTask, { loading: updating }] = useMutation(UPDATE_TASK, { refetchQueries });
  const [deleteTask, { loading: deleting }] = useMutation(DELETE_TASK, { refetchQueries });

  const loading = creating || updating || deleting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = title.trim();
    if (!trimmed) { setError('Title is required'); return; }

    const input: Record<string, unknown> = {
      title: trimmed,
      description: description || null,
      priority,
      dueDate: dueDate || null,
    };

    try {
      if (isEdit) {
        await updateTask({ variables: { id: task.id, input } });
      } else {
        if (listId) input.listId = listId;
        if (parentId) input.parentId = parentId;
        await createTask({ variables: { input } });
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>{isEdit ? 'Edit Task' : 'New Task'}</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            Title
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={styles.input}
              required
              autoFocus
            />
          </label>

          <label className={styles.label}>
            Description (Markdown)
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={styles.textarea}
              rows={5}
              placeholder="Add notes, links, details..."
            />
          </label>

          <label className={styles.label}>
            Priority
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className={styles.input}
            >
              {PRIORITIES.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </label>

          <label className={styles.label}>
            Due Date
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={styles.input}
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Save' : 'Create'}
            </button>
          </div>

          {isEdit && (
            <button
              type="button"
              className={styles.deleteBtn}
              onClick={() => setShowDeleteConfirm(true)}
              disabled={loading}
            >
              Delete Task
            </button>
          )}
        </form>

        {showDeleteConfirm && task && (
          <ConfirmDialog
            title="Delete Task"
            message={`Delete "${task.title}" and all its subtasks? This cannot be undone.`}
            onConfirm={async () => {
              await deleteTask({ variables: { id: task.id } });
              onClose();
              navigate('/tasks');
            }}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}
      </div>
    </div>
  );
}
