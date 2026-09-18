// src/features/sharing/components/JoinSessionForm/JoinSessionForm.tsx
import React, { useState } from 'react';
import { t } from '@shared/i18n';
import { extractShareToken } from '@shared/utils/shareToken';
import styles from './JoinSessionForm.module.css';

export type JoinSessionHandler = (token: string) => Promise<boolean>;

interface JoinSessionFormProps {
  onJoin: JoinSessionHandler;
  onCancel: () => void;
}

const JoinSessionForm: React.FC<JoinSessionFormProps> = ({ onJoin, onCancel }) => {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const resolvedToken = extractShareToken(token);
    if (!resolvedToken) {
      setError(token.trim() ? t('join.short') : t('join.empty'));
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const joined = await onJoin(resolvedToken);
      if (!joined) {
        setError(t('errors.joinFailed'));
      }
    } catch {
      setError(t('errors.joinFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <h3>{t('join.title')}</h3>
      
      <p className={styles.description}>
        {t('join.lead')}
      </p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label htmlFor="token">{t('join.token')}</label>
          <input
            type="text"
            id="token"
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              setError('');
            }}
            placeholder={t('join.placeholder')}
            className={styles.input}
            autoComplete="off"
            disabled={submitting}
          />
        </div>

        {error && <div className={styles.error} role="alert">{error}</div>}

        <p className={styles.leaveHint}>{t('join.leaveHint')}</p>

        <div className={styles.buttonGroup}>
          <button type="button" onClick={onCancel} className={styles.cancelButton} disabled={submitting}>
            {t('join.cancel')}
          </button>
          <button type="submit" className={styles.joinButton} disabled={submitting}>
            {submitting ? t('join.submitting') : t('join.submit')}
          </button>
        </div>
      </form>

      <div className={styles.hint}>
        <strong>{t('join.how')}</strong>
        <ol>
          <li>{t('join.step1')}</li>
          <li>{t('join.step2')}</li>
          <li>{t('join.step3')}</li>
        </ol>
      </div>
    </div>
  );
};

export default JoinSessionForm;
