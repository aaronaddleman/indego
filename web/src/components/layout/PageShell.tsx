import type { ReactNode } from 'react';
import BottomNav from './BottomNav';
import styles from './PageShell.module.css';

interface Props {
  title: string;
  children: ReactNode;
  subNav?: ReactNode;
}

export default function PageShell({ children, subNav }: Props) {
  return (
    <div className={styles.shell}>
      <main className={styles.main}>
        {subNav}
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
