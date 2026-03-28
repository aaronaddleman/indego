import styles from './PermissionWarning.module.css';

interface Props {
  message: string;
}

export default function PermissionWarning({ message }: Props) {
  return (
    <div className={styles.warning}>
      <span className={`material-symbols-outlined ${styles.icon}`}>notifications_off</span>
      <p className={styles.text}>{message}</p>
    </div>
  );
}
