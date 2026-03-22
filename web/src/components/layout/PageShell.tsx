import type { ReactNode } from 'react';
import BottomNav from './BottomNav';
import styles from './PageShell.module.css';

interface Props {
  title: string;
  children: ReactNode;
}

export default function PageShell({ children }: Props) {
  return (
    <div className={styles.shell}>
      <main className={styles.main}>
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
