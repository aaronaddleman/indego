import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../auth/useAuth';
import { useState, useEffect } from 'react';

export function useCanManageApiKeys(): boolean | null {
  const { user } = useAuth();
  const [canManage, setCanManage] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user?.email) return;

    let cancelled = false;
    const ref = doc(db, 'allowedEmails', user.email.toLowerCase());
    getDoc(ref)
      .then(snap => {
        if (!cancelled) {
          setCanManage(snap.exists() && snap.data()?.canManageApiKeys === true);
        }
      })
      .catch(() => {
        if (!cancelled) setCanManage(false);
      });

    return () => { cancelled = true; };
  }, [user?.email]);

  if (!user?.email && canManage === null) return false;

  return canManage;
}
