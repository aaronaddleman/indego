import { NavLink } from 'react-router-dom';
import styles from './BottomNav.module.css';

const tabs = [
  { to: '/', icon: 'today', label: 'Today' },
  { to: '/history', icon: 'history', label: 'History' },
  { to: '/streaks', icon: 'local_fire_department', label: 'Streaks' },
  { to: '/settings', icon: 'settings', label: 'Settings' },
] as const;

export default function BottomNav() {
  return (
    <nav className={styles.nav}>
      {tabs.map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `${styles.tab} ${isActive ? styles.active : ''}`
          }
        >
          <span className={`material-symbols-outlined ${styles.icon}`}>{icon}</span>
          <span className={styles.label}>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
