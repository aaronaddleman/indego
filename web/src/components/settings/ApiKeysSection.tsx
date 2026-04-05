import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_API_KEYS } from '../../graphql/queries';
import { CREATE_API_KEY, REVOKE_API_KEY } from '../../graphql/mutations';
import styles from './ApiKeysSection.module.css';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export default function ApiKeysSection() {
  const { data, loading } = useQuery(GET_API_KEYS);
  const [createApiKey] = useMutation(CREATE_API_KEY, {
    refetchQueries: [{ query: GET_API_KEYS }],
  });
  const [revokeApiKey] = useMutation(REVOKE_API_KEY, {
    refetchQueries: [{ query: GET_API_KEYS }],
  });

  const [name, setName] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeKeys: ApiKey[] = (data?.apiKeys ?? []).filter(
    (k: ApiKey) => !k.revokedAt
  );

  const handleCreate = async () => {
    if (!name.trim() || !expiresAt) return;
    setCreating(true);
    setError(null);
    try {
      const { data: result } = await createApiKey({
        variables: {
          input: {
            name: name.trim(),
            expiresAt: new Date(expiresAt).toISOString(),
          },
        },
      });
      setCreatedKey(result.createApiKey.key);
      setName('');
      setExpiresAt('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create key');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleRevoke = async (id: string) => {
    try {
      await revokeApiKey({ variables: { id } });
      setRevokeConfirmId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to revoke key');
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>API Keys</h2>

      {/* Key reveal (shown once after creation) */}
      {createdKey && (
        <div className={styles.keyReveal}>
          <div className={styles.keyRevealHeader}>
            <span className="material-symbols-outlined">warning</span>
            <span>Save this key — it won't be shown again</span>
          </div>
          <div className={styles.keyValue}>{createdKey}</div>
          <button className={styles.copyBtn} onClick={handleCopy}>
            <span className="material-symbols-outlined">
              {copied ? 'check' : 'content_copy'}
            </span>
            {copied ? 'Copied!' : 'Copy Key'}
          </button>
          <button
            className={styles.dismissBtn}
            onClick={() => setCreatedKey(null)}
          >
            I've saved it
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className={styles.error}>
          {error}
          <button className={styles.errorDismiss} onClick={() => setError(null)}>
            &times;
          </button>
        </div>
      )}

      {/* Key list */}
      {loading ? (
        <p className={styles.muted}>Loading...</p>
      ) : activeKeys.length === 0 && !createdKey ? (
        <p className={styles.muted}>No API keys yet. Create one to get started.</p>
      ) : (
        <div className={styles.keyList}>
          {activeKeys.map((key: ApiKey) => (
            <div key={key.id} className={styles.keyRow}>
              <div className={styles.keyIcon}>
                <span className="material-symbols-outlined">vpn_key</span>
              </div>
              <div className={styles.keyInfo}>
                <span className={styles.keyName}>{key.name}</span>
                <span className={styles.keyMeta}>
                  {key.keyPrefix}... &middot; expires {formatDate(key.expiresAt)}
                </span>
              </div>
              {revokeConfirmId === key.id ? (
                <div className={styles.revokeConfirm}>
                  <button
                    className={styles.revokeConfirmBtn}
                    onClick={() => handleRevoke(key.id)}
                  >
                    Revoke
                  </button>
                  <button
                    className={styles.revokeCancelBtn}
                    onClick={() => setRevokeConfirmId(null)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  className={styles.revokeBtn}
                  onClick={() => setRevokeConfirmId(key.id)}
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create form (hidden if 2 active keys) */}
      {activeKeys.length >= 2 ? (
        <p className={styles.muted}>Maximum of 2 active keys reached.</p>
      ) : !createdKey && (
        <div className={styles.createForm}>
          <input
            className={styles.input}
            type="text"
            placeholder="Key name (e.g., MCP Server)"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <input
            className={styles.input}
            type="date"
            value={expiresAt}
            onChange={e => setExpiresAt(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
          <button
            className={styles.createBtn}
            onClick={handleCreate}
            disabled={creating || !name.trim() || !expiresAt}
          >
            <span className="material-symbols-outlined">add</span>
            {creating ? 'Creating...' : 'Create Key'}
          </button>
        </div>
      )}
    </section>
  );
}
