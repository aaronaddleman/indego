import { NavLink, useLocation } from 'react-router-dom';
import styles from './BottomNav.module.css';

const tabs = [
  { to: '/habits', icon: 'self_improvement', label: 'Habits', match: '/habits' },
  { to: '/tasks', icon: 'task_alt', label: 'Tasks', match: '/tasks' },
  { to: '/settings', icon: 'settings', label: 'Settings', match: '/settings' },
] as const;

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className={styles.nav}>
      {tabs.map(({ to, icon, label, match }) => {
        const isActive = location.pathname === match || location.pathname.startsWith(match + '/');
        return (
          <NavLink
            key={to}
            to={to}
            className={`${styles.tab} ${isActive ? styles.active : ''}`}
          >
            <span className={`material-symbols-outlined ${styles.icon}`}>{icon}</span>
            <span className={styles.label}>{label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
