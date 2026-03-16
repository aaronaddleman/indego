import styles from './MonthPicker.module.css';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface Props {
  selectedMonth: number;
  onSelect: (month: number) => void;
}

export default function MonthPicker({ selectedMonth, onSelect }: Props) {
  return (
    <div className={styles.grid}>
      {MONTHS.map((name, i) => (
        <button
          key={name}
          className={`${styles.item} ${i === selectedMonth ? styles.selected : ''}`}
          onClick={() => onSelect(i)}
        >
          {name.slice(0, 3)}
        </button>
      ))}
    </div>
  );
}
