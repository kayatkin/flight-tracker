// src/features/sharing/components/JoinSessionForm/JoinSessionForm.tsx
import React, { useState } from 'react';
import { t } from '@shared/i18n';
import { extractShareToken } from '@shared/utils/shareToken';
import styles from './JoinSessionForm.module.css';

interface JoinSessionFormProps {
  onJoin: (token: string) => void;
  onCancel: () => void;
}

const JoinSessionForm: React.FC<JoinSessionFormProps> = ({ onJoin, onCancel }) => {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const resolvedToken = extractShareToken(token) ?? token.trim();

    if (!resolvedToken) {
      setError(t('join.empty'));
      return;
    }

    if (resolvedToken.length < 10) {
      setError(t('join.short'));
      return;
    }

    onJoin(resolvedToken);
  };

  const extractTokenFromUrl = () => {
    const inputValue = token.trim();
    
    if (!inputValue) {
      setError(t('join.needUrl'));
      return;
    }

    const extractedToken = extractShareToken(inputValue);
    
    if (extractedToken) {
      setToken(extractedToken);
      setError('');
    } else {
      setError(t('join.notFound'));
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
          />
          <button 
            type="button" 
            onClick={extractTokenFromUrl}
            className={styles.extractButton}
          >
            {t('join.extract')}
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.buttonGroup}>
          <button type="button" onClick={onCancel} className={styles.cancelButton}>
            {t('join.cancel')}
          </button>
          <button type="submit" className={styles.joinButton}>
            {t('join.submit')}
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