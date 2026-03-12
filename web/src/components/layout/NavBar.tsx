import { NavLink } from 'react-router-dom';
import styles from './NavBar.module.css';

export default function NavBar() {
  return (
    <nav className={styles.nav}>
      <NavLink to="/" className={({ isActive }) => isActive ? styles.active : styles.link}>
        Habits
      </NavLink>
      <NavLink to="/stats" className={({ isActive }) => isActive ? styles.active : styles.link}>
        Stats
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => isActive ? styles.active : styles.link}>
        Settings
      </NavLink>
    </nav>
  );
}
