import styles from './YearPicker.module.css';

interface Props {
  selectedYear: number;
  minYear: number;
  onSelect: (year: number) => void;
}

export default function YearPicker({ selectedYear, minYear, onSelect }: Props) {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear; y >= minYear; y--) {
    years.push(y);
  }

  return (
    <div className={styles.list}>
      {years.map(year => (
        <button
          key={year}
          className={`${styles.item} ${year === selectedYear ? styles.selected : ''}`}
          onClick={() => onSelect(year)}
        >
          {year}
        </button>
      ))}
    </div>
  );
}
