import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { GET_ALLOWED_EMAILS } from '../graphql/queries';
import { ADD_ALLOWED_EMAIL, REMOVE_ALLOWED_EMAIL } from '../graphql/mutations';
import { useAuth } from '../auth/useAuth';
import styles from './AdminPage.module.css';

export default function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, loading, error } = useQuery(GET_ALLOWED_EMAILS);
  const [newEmail, setNewEmail] = useState('');
  const [formError, setFormError] = useState('');

  const [addEmail, { loading: adding }] = useMutation(ADD_ALLOWED_EMAIL, {
    refetchQueries: [{ query: GET_ALLOWED_EMAILS }],
  });
  const [removeEmail, { loading: removing }] = useMutation(REMOVE_ALLOWED_EMAIL, {
    refetchQueries: [{ query: GET_ALLOWED_EMAILS }],
  });

  const mutationLoading = adding || removing;
  const currentEmail = user?.email?.toLowerCase() || '';

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      await addEmail({ variables: { email: newEmail } });
      setNewEmail('');
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to add email');
    }
  };

  const handleRemove = async (email: string) => {
    setFormError('');
    try {
      await removeEmail({ variables: { email } });
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to remove email');
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <p className={styles.loading}>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')}>
          ← Back
        </button>
        <p className={styles.error}>Failed to load allowlist.</p>
      </div>
    );
  }

  const emails: { email: string; isAdmin: boolean }[] = data?.allowedEmails || [];

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate('/settings')} aria-label="Back to settings">
          ←
        </button>
        <h1 className={styles.title}>Manage Access</h1>
        <div className={styles.spacer} />
      </div>

      <form onSubmit={handleAdd} className={styles.addForm}>
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="email@example.com"
          className={styles.input}
          required
          disabled={mutationLoading}
        />
        <button type="submit" className={styles.addBtn} disabled={mutationLoading || !newEmail}>
          Add
        </button>
      </form>

      {formError && <p className={styles.formError}>{formError}</p>}

      <div className={styles.list}>
        {emails.map(({ email, isAdmin }) => {
          const isSelf = email === currentEmail;
          return (
            <div key={email} className={styles.row}>
              <div className={styles.emailInfo}>
                <span className={styles.email}>{email}</span>
                {isAdmin && <span className={styles.adminBadge}>Admin</span>}
                {isSelf && <span className={styles.selfBadge}>you</span>}
              </div>
              {!isSelf && (
                <button
                  className={styles.removeBtn}
                  onClick={() => handleRemove(email)}
                  disabled={mutationLoading}
                  aria-label={`Remove ${email}`}
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
