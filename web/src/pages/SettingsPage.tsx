import { useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { auth } from '../config/firebase';
import { GET_VERSION, GET_ME } from '../graphql/queries';
import PageShell from '../components/layout/PageShell';
import { useTheme, type ThemeOption } from '../hooks/useTheme';
import styles from './SettingsPage.module.css';

const THEME_OPTIONS: { value: ThemeOption; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
  { value: 'dracula', label: 'Dracula' },
  { value: 'nord', label: 'Nord' },
  { value: 'solarized', label: 'Solarized' },
  { value: 'monokai', label: 'Monokai' },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { data: meData } = useQuery(GET_ME);
  const { data: versionData } = useQuery(GET_VERSION);
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    await auth.signOut();
    navigate('/login');
  };

  return (
    <PageShell title="Settings">
      <h1 className={styles.title}>Settings</h1>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Appearance</h2>
        <div className={styles.themeSelector}>
          {THEME_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`${styles.themeBtn} ${theme === opt.value ? styles.themeBtnActive : ''}`}
              onClick={() => setTheme(opt.value)}
              aria-pressed={theme === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Account</h2>
        <div className={styles.info}>
          <span className={styles.label}>Email</span>
          <span>{meData?.me?.email || auth.currentUser?.email || '—'}</span>
        </div>
        <div className={styles.info}>
          <span className={styles.label}>Display Name</span>
          <span>{meData?.me?.displayName || '—'}</span>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>About</h2>
        <div className={styles.info}>
          <span className={styles.label}>Version</span>
          <span>{versionData?.version?.commit || 'unknown'}</span>
        </div>
        <div className={styles.info}>
          <span className={styles.label}>Deployed</span>
          <span>{versionData?.version?.deployedAt || 'unknown'}</span>
        </div>
      </div>

      <button className={styles.signOutBtn} onClick={handleSignOut}>
        Sign Out
      </button>
    </PageShell>
  );
}
