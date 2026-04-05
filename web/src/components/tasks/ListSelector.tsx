import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_TASK_LISTS } from '../../graphql/queries';
import { CREATE_TASK_LIST } from '../../graphql/mutations';
import styles from './ListSelector.module.css';

interface TaskList {
  id: string;
  name: string;
  isInbox: boolean;
  taskCount: number;
}

interface Props {
  selectedId: string | null;
  onSelect: (listId: string) => void;
}

export default function ListSelector({ selectedId, onSelect }: Props) {
  const { data } = useQuery(GET_TASK_LISTS);
  const [createList] = useMutation(CREATE_TASK_LIST, {
    refetchQueries: [{ query: GET_TASK_LISTS }],
  });
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');

  const lists: TaskList[] = data?.taskLists ?? [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    const result = await createList({ variables: { name: trimmed } });
    setNewName('');
    setShowNew(false);
    if (result.data?.createTaskList) {
      onSelect(result.data.createTaskList.id);
    }
  };

  return (
    <div className={styles.selector}>
      {lists.map((list) => (
        <button
          key={list.id}
          className={`${styles.item} ${selectedId === list.id ? styles.active : ''}`}
          onClick={() => onSelect(list.id)}
        >
          <span className={`material-symbols-outlined ${styles.icon}`}>
            {list.isInbox ? 'inbox' : 'list'}
          </span>
          <span className={styles.name}>{list.name}</span>
          <span className={styles.count}>{list.taskCount}</span>
        </button>
      ))}
      {showNew ? (
        <form className={styles.newForm} onSubmit={handleCreate}>
          <input
            className={styles.newInput}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="List name"
            autoFocus
          />
          <button type="submit" className={styles.newSubmit}>
            <span className="material-symbols-outlined">check</span>
          </button>
          <button type="button" className={styles.newCancel} onClick={() => setShowNew(false)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </form>
      ) : (
        <button className={styles.addBtn} onClick={() => setShowNew(true)}>
          <span className={`material-symbols-outlined ${styles.icon}`}>add</span>
          <span className={styles.name}>New List</span>
        </button>
      )}
    </div>
  );
}
