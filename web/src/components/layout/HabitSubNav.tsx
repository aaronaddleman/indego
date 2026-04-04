import { NavLink } from 'react-router-dom';
import styles from './HabitSubNav.module.css';

const tabs = [
  { to: '/habits', icon: 'today', label: 'Today' },
  { to: '/habits/history', icon: 'history', label: 'History' },
  { to: '/habits/streaks', icon: 'local_fire_department', label: 'Streaks' },
] as const;

export default function HabitSubNav() {
  return (
    <div className={styles.bar}>
      {tabs.map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/habits'}
          className={({ isActive }) =>
            `${styles.tab} ${isActive ? styles.active : ''}`
          }
        >
          <span className={`material-symbols-outlined ${styles.icon}`}>{icon}</span>
          <span className={styles.label}>{label}</span>
        </NavLink>
      ))}
    </div>
  );
}
