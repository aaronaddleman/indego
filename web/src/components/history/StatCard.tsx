import styles from './StatCard.module.css';

interface Props {
  icon: string;
  value: string | number;
  label: string;
  color?: 'primary' | 'tertiary';
}

export default function StatCard({ icon, value, label, color = 'primary' }: Props) {
  return (
    <div className={styles.card}>
      <div className={`${styles.iconWrap} ${styles[color]}`}>
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
          {icon}
        </span>
      </div>
      <div>
        <h3 className={styles.value}>{value}</h3>
        <p className={styles.label}>{label}</p>
      </div>
    </div>
  );
}
