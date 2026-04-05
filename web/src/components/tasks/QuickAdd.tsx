import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { CREATE_TASK } from '../../graphql/mutations';
import { GET_TASKS, GET_TASK_LISTS } from '../../graphql/queries';
import styles from './QuickAdd.module.css';

interface Props {
  listId?: string;
  parentId?: string;
  placeholder?: string;
}

export default function QuickAdd({ listId, parentId, placeholder = 'Add a task...' }: Props) {
  const [title, setTitle] = useState('');
  const [createTask, { loading }] = useMutation(CREATE_TASK, {
    refetchQueries: [{ query: GET_TASKS }, { query: GET_TASK_LISTS }],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || loading) return;

    await createTask({
      variables: {
        input: {
          title: trimmed,
          ...(listId && { listId }),
          ...(parentId && { parentId }),
        },
      },
    });
    setTitle('');
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <span className={`material-symbols-outlined ${styles.icon}`}>add</span>
      <input
        className={styles.input}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={placeholder}
        disabled={loading}
      />
    </form>
  );
}
