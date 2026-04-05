import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { auth } from '../config/firebase';
import { GET_VERSION, GET_ME } from '../graphql/queries';
import PageShell from '../components/layout/PageShell';
import { useTheme, type ThemeOption } from '../hooks/useTheme';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { useCanManageApiKeys } from '../hooks/useCanManageApiKeys';
import ApiKeysSection from '../components/settings/ApiKeysSection';
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
  const isAdmin = useIsAdmin();
  const canManageApiKeys = useCanManageApiKeys();
  const [tokenCopied, setTokenCopied] = useState(false);

  const handleCopyToken = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const token = await user.getIdToken();
    await navigator.clipboard.writeText(token);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 3000);
  };

  const handleSignOut = async () => {
    await auth.signOut();
    navigate('/login');
  };

  const handleClearCache = async () => {
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(name => caches.delete(name)));
    }
    const registrations = await navigator.serviceWorker?.getRegistrations();
    if (registrations) {
      await Promise.all(registrations.map(r => r.unregister()));
    }
    window.location.reload();
  };

  return (
    <PageShell title="Settings">
      <h1 className={styles.pageTitle}>Settings</h1>

      {/* Appearance */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Appearance</h2>
        <div className={styles.themeGrid}>
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
      </section>

      {/* Account */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Account</h2>
        <div className={styles.infoRow}>
          <div className={styles.infoIcon}>
            <span className="material-symbols-outlined">mail</span>
          </div>
          <div className={styles.infoContent}>
            <span className={styles.infoLabel}>Email</span>
            <span className={styles.infoValue}>{meData?.me?.email || auth.currentUser?.email || '—'}</span>
          </div>
        </div>
        <div className={styles.infoRow}>
          <div className={styles.infoIcon}>
            <span className="material-symbols-outlined">person</span>
          </div>
          <div className={styles.infoContent}>
            <span className={styles.infoLabel}>Display Name</span>
            <span className={styles.infoValue}>{meData?.me?.displayName || '—'}</span>
          </div>
        </div>
      </section>

      {/* API Keys (permission-gated) */}
      {canManageApiKeys && <ApiKeysSection />}

      {/* Integrations (placeholders) */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Integrations</h2>
        <button className={styles.integrationBtn} disabled>
          <div className={styles.integrationLeft}>
            <div className={`${styles.integrationIcon} ${styles.iconSecondary}`}>
              <span className="material-symbols-outlined">sync</span>
            </div>
            <div>
              <p className={styles.integrationName}>Sync with Calendar</p>
              <p className={styles.integrationDesc}>Google, iCloud, or Outlook</p>
            </div>
          </div>
          <span className={styles.comingSoon}>Soon</span>
        </button>
        <button className={styles.integrationBtn} disabled>
          <div className={styles.integrationLeft}>
            <div className={styles.integrationIcon}>
              <span className="material-symbols-outlined">download</span>
            </div>
            <div>
              <p className={styles.integrationName}>Export Data</p>
              <p className={styles.integrationDesc}>Download your journey as CSV/JSON</p>
            </div>
          </div>
          <span className={styles.comingSoon}>Soon</span>
        </button>
      </section>

      {/* Version Info */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Version Info</h2>
        <div className={styles.versionGrid}>
          <div className={styles.versionItem}>
            <span className={styles.versionLabel}>API</span>
            <span className={styles.versionValue}>{versionData?.version?.commit?.slice(0, 7) || '—'}</span>
          </div>
          <div className={styles.versionItem}>
            <span className={styles.versionLabel}>Web</span>
            <span className={styles.versionValue}>{__APP_COMMIT__.slice(0, 7)}</span>
          </div>
          <div className={styles.versionItem}>
            <span className={styles.versionLabel}>Branch</span>
            <span className={styles.versionValue}>{__APP_BRANCH__}</span>
          </div>
          <div className={styles.versionItem}>
            <span className={styles.versionLabel}>Deployed</span>
            <span className={styles.versionValue}>{versionData?.version?.deployedAt?.split('T')[0] || '—'}</span>
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className={styles.actions}>
        {isAdmin && (
          <button className={styles.actionBtn} onClick={() => navigate('/admin')}>
            <span className="material-symbols-outlined">admin_panel_settings</span>
            Manage Access
          </button>
        )}
        {isAdmin && (
          <button className={styles.actionBtn} onClick={handleCopyToken}>
            <span className="material-symbols-outlined">key</span>
            {tokenCopied ? 'Token Copied!' : 'Copy Auth Token'}
          </button>
        )}
        <button className={styles.actionBtn} onClick={handleClearCache}>
          <span className="material-symbols-outlined">cached</span>
          Clear Cache & Reload
        </button>
        <button className={styles.signOutBtn} onClick={handleSignOut}>
          <span className="material-symbols-outlined">logout</span>
          Sign Out
        </button>
      </div>
    </PageShell>
  );
}
