// src/features/sharing/components/JoinSessionForm/JoinSessionForm.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './JoinSessionForm.module.css';

interface JoinSessionFormProps {
  onJoin: (token: string) => void;
  onCancel: () => void;
}

const JoinSessionForm: React.FC<JoinSessionFormProps> = ({ onJoin, onCancel }) => {
  const { t } = useTranslation();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token.trim()) {
      setError(t('join.errorEmpty'));
      return;
    }

    if (token.length < 10) {
      setError(t('join.errorFormat'));
      return;
    }

    onJoin(token.trim());
  };

  const extractTokenFromUrl = () => {
    const inputValue = token.trim();
    
    if (!inputValue) {
      setError(t('join.errorPasteUrl'));
      return;
    }

    const tokenRegex = /(?:[?&]token=|\btoken=)([^&]+)/i;
    const match = inputValue.match(tokenRegex);
    
    if (match && match[1]) {
      const extractedToken = match[1];
      setToken(extractedToken);
      setError('');
    } else {
      const isLikelyToken = /^[a-zA-Z0-9_-]+$/.test(inputValue) && inputValue.length >= 10;
      
      if (isLikelyToken) {
        setError(t('join.errorLooksLikeToken'));
      } else {
        setError(t('join.errorNotFound'));
      }
    }
  };

  return (
    <div className={styles.container}>
      <h3>🔗 {t('join.title')}</h3>
      
      <p className={styles.description}>
        {t('join.description')}
      </p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label htmlFor="token">{t('join.tokenLabel')}</label>
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
            {t('common.cancel')}
          </button>
          <button type="submit" className={styles.joinButton}>
            {t('join.join')}
          </button>
        </div>
      </form>

      <div className={styles.hint}>
        <strong>{t('join.howToTitle')}</strong>
        <ol>
          <li>{t('join.howTo1')}</li>
          <li>{t('join.howTo2')}</li>
          <li>{t('join.howTo3')}</li>
        </ol>
      </div>
    </div>
  );
};

export default JoinSessionForm;
