// src/features/sharing/components/JoinSessionForm/JoinSessionForm.tsx
import React, { useState } from 'react';
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
      setError('Введите токен доступа');
      return;
    }

    if (resolvedToken.length < 10) {
      setError('Некорректный формат токена');
      return;
    }

    onJoin(resolvedToken);
  };

  const extractTokenFromUrl = () => {
    const inputValue = token.trim();
    
    if (!inputValue) {
      setError('Сначала вставьте URL с токеном в поле выше');
      return;
    }

    const extractedToken = extractShareToken(inputValue);
    
    if (extractedToken) {
      setToken(extractedToken);
      setError('');
    } else {
      setError('Не удалось найти токен. Вставьте ссылку или сам токен.');
    }
  };

  return (
    <div className={styles.container}>
      <h3>🔗 Присоединиться к истории перелетов</h3>
      
      <p className={styles.description}>
        Введите токен доступа, который вам предоставил владелец истории.
      </p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label htmlFor="token">Токен доступа:</label>
          <input
            type="text"
            id="token"
            value={token}
            onChange={(e) => {
              setToken(e.target.value);
              setError(''); // Очищаем ошибку при изменении
            }}
            placeholder="Введите токен или ссылку с токеном..."
            className={styles.input}
          />
          <button 
            type="button" 
            onClick={extractTokenFromUrl}
            className={styles.extractButton}
          >
            Извлечь из URL
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.buttonGroup}>
          <button type="button" onClick={onCancel} className={styles.cancelButton}>
            Отмена
          </button>
          <button type="submit" className={styles.joinButton}>
            Присоединиться
          </button>
        </div>
      </form>

      <div className={styles.hint}>
        <strong>Как получить доступ?</strong>
        <ol>
          <li>Попросите у владельца истории ссылку для совместного доступа</li>
          <li>Скопируйте токен из ссылки или вставьте полную ссылку</li>
          <li>Нажмите "Извлечь из URL" или введите токен вручную</li>
        </ol>
      </div>
    </div>
  );
};

export default JoinSessionForm;