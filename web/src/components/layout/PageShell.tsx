import type { ReactNode } from 'react';
import NavBar from './NavBar';
import styles from './PageShell.module.css';

interface Props {
  title: string;
  children: ReactNode;
}

export default function PageShell({ children }: Props) {
  return (
    <div className={styles.shell}>
      <NavBar />
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
