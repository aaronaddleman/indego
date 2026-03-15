import { useNavigate } from 'react-router-dom';
import { auth } from '../config/firebase';
import styles from './RestrictedPage.module.css';

export default function RestrictedPage() {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await auth.signOut();
    navigate('/login');
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Access Restricted</h1>
        <p className={styles.message}>
          Access is currently restricted.
        </p>
        <button className={styles.button} onClick={handleSignOut}>
          Sign Out
        </button>
      </div>
    </div>
  );
}
