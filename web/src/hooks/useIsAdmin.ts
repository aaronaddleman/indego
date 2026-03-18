import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../auth/useAuth';
import { useState, useEffect } from 'react';

export function useIsAdmin(): boolean | null {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user?.email) return;

    let cancelled = false;
    const ref = doc(db, 'allowedEmails', user.email.toLowerCase());
    getDoc(ref)
      .then(snap => {
        if (!cancelled) {
          setIsAdmin(snap.exists() && snap.data()?.isAdmin === true);
        }
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });

    return () => { cancelled = true; };
  }, [user?.email]);

  // No email means not admin
  if (!user?.email && isAdmin === null) return false;

  return isAdmin;
}
