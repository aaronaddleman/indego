import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export async function checkEmailAllowed(email: string): Promise<boolean> {
  try {
    const docRef = doc(db, 'allowedEmails', email.toLowerCase());
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  } catch {
    // Fail closed
    return false;
  }
}
