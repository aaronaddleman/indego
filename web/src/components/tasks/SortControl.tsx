import { useMutation } from '@apollo/client';
import { UPDATE_TASK_LIST } from '../../graphql/mutations';
import styles from './SortControl.module.css';

const SORT_OPTIONS = [
  { value: 'MANUAL', label: 'Manual' },
  { value: 'DUE_DATE', label: 'Due Date' },
  { value: 'PRIORITY', label: 'Priority' },
  { value: 'CREATED_AT', label: 'Created' },
] as const;

interface Props {
  listId: string;
  current: string;
}

export default function SortControl({ listId, current }: Props) {
  const [updateList] = useMutation(UPDATE_TASK_LIST, {
    refetchQueries: ['GetTaskLists'],
  });

  const handleChange = (value: string) => {
    updateList({ variables: { id: listId, sortPreference: value } });
  };

  return (
    <div className={styles.control}>
      <span className={`material-symbols-outlined ${styles.icon}`}>sort</span>
      <select
        className={styles.select}
        value={current}
        onChange={(e) => handleChange(e.target.value)}
      >
        {SORT_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
