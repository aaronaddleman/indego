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
    refetchQueries: ['GetTaskLists'],
  });
  const [showDialog, setShowDialog] = useState(false);
  const [newName, setNewName] = useState('');

  const lists: TaskList[] = data?.taskLists ?? [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    const result = await createList({ variables: { name: trimmed } });
    setNewName('');
    setShowDialog(false);
    if (result.data?.createTaskList) {
      onSelect(result.data.createTaskList.id);
    }
  };

  return (
    <>
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
        <button className={styles.addBtn} onClick={() => setShowDialog(true)}>
          <span className={`material-symbols-outlined ${styles.icon}`}>add</span>
          <span className={styles.name}>New List</span>
        </button>
      </div>

      {showDialog && (
        <div className={styles.overlay} onClick={() => setShowDialog(false)}>
          <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.dialogTitle}>New List</h3>
            <form onSubmit={handleCreate}>
              <input
                className={styles.dialogInput}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="List name"
                autoFocus
              />
              <div className={styles.dialogActions}>
                <button type="button" className={styles.dialogCancel} onClick={() => setShowDialog(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.dialogSubmit}>
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
