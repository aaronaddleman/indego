import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { useMutation } from '@apollo/client';
import { auth } from '../config/firebase';
import { UPSERT_USER } from '../graphql/mutations';
import { checkEmailAllowed } from '../hooks/useAllowlist';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [upsertUser] = useMutation(UPSERT_USER);

  const handleSuccess = async (displayName: string) => {
    try {
      await upsertUser({ variables: { displayName } });
    } catch {
      // User may already exist, that's fine
    }
    navigate('/');
  };

  const handleGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      const userEmail = result.user.email || '';

      // Check allowlist before upsertUser
      const allowed = await checkEmailAllowed(userEmail);
      if (!allowed) {
        await auth.signOut();
        navigate('/restricted');
        return;
      }

      await handleSuccess(result.user.displayName || userEmail || 'User');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check allowlist before auth
    const allowed = await checkEmailAllowed(email);
    if (!allowed) {
      navigate('/restricted');
      return;
    }

    try {
      if (isSignUp) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await handleSuccess(result.user.email || 'User');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        navigate('/');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Indago</h1>
        <p className={styles.subtitle}>Track your habits, build streaks.</p>

        <button className={styles.googleBtn} onClick={handleGoogle}>
          Continue with Google
        </button>

        <div className={styles.divider}>
          <span>or</span>
        </div>

        <form onSubmit={handleEmail} className={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
            required
            minLength={6}
          />
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.submitBtn}>
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <button
          className={styles.toggle}
          onClick={() => setIsSignUp(!isSignUp)}
        >
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </button>
      </div>
    </div>
  );
}
