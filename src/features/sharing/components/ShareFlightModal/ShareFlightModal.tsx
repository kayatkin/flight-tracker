// src/components/ShareFlightModal.tsx
import React, { useState } from 'react';
import { supabase } from '@shared/lib';
import styles from './ShareFlightModal.module.css';

interface ShareFlightModalProps {
  userId: string;
  onClose: () => void;
  onShareCreated: (token: string) => void;
}

const ShareFlightModal: React.FC<ShareFlightModalProps> = ({ userId, onClose, onShareCreated }) => {
  const [permissions, setPermissions] = useState<'view' | 'edit'>('view');
  const [expiryDays, setExpiryDays] = useState<number>(7);
  const [generatedToken, setGeneratedToken] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const generateToken = () => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };

  const createShareLink = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);

      const { error } = await supabase
        .from('shared_sessions')
        .insert({
          owner_id: userId,
          token: token,
          permissions: permissions,
          expires_at: expiresAt.toISOString(),
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      const url = `${window.location.origin}${window.location.pathname}?token=${token}`;
      setGeneratedToken(token);
      setShareUrl(url);
      onShareCreated(token);
      
    } catch (err: any) {
      setError(err.message || 'Ошибка при создании ссылки');
      console.error('Error creating share link:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl)
      .then(() => alert('Ссылка скопирована!'))
      .catch(err => console.error('Copy failed:', err));
  };

  const deactivateLink = async () => {
    try {
      const { error } = await supabase
        .from('shared_sessions')
        .update({ is_active: false })
        .eq('token', generatedToken);

      if (error) throw error;
      alert('Доступ отозван');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка при отзыве доступа');
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <h3>📤 Поделиться историей перелетов</h3>
        
        {/* ДОБАВЛЕНА ПОДСКАЗКА */}
        <div className={styles.hintBox}>
          <p>Создайте ссылку, чтобы поделиться историей с друзьями</p>
          <p className={styles.hintSubtext}>
            Вы можете дать права только на просмотр или разрешить редактирование
          </p>
        </div>
        
        {!generatedToken ? (
          <>
            <div className={styles.formGroup}>
              <label>Права доступа:</label>
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    value="view"
                    checked={permissions === 'view'}
                    onChange={(e) => setPermissions(e.target.value as 'view' | 'edit')}
                    className={styles.radioInput}
                  />
                  👁️ Только просмотр
                  <span className={styles.radioDescription}>
                    Гость сможет только просматривать вашу историю
                  </span>
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    value="edit"
                    checked={permissions === 'edit'}
                    onChange={(e) => setPermissions(e.target.value as 'view' | 'edit')}
                    className={styles.radioInput}
                  />
                  ✏️ Просмотр и редактирование
                  <span className={styles.radioDescription}>
                    Гость сможет добавлять и удалять перелеты
                  </span>
                </label>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Срок действия ссылки:</label>
              <select
                value={expiryDays}
                onChange={(e) => setExpiryDays(Number(e.target.value))}
                className={styles.select}
              >
                <option value={1}>1 день</option>
                <option value={7}>7 дней (по умолчанию)</option>
                <option value={30}>30 дней</option>
                <option value={365}>1 год (без ограничений)</option>
              </select>
              <p className={styles.selectHint}>
                По истечении этого срока ссылка станет недействительной
              </p>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.buttonGroup}>
              <button onClick={onClose} className={styles.cancelButton}>
                Отмена
              </button>
              <button 
                onClick={createShareLink} 
                className={styles.createButton}
                disabled={loading}
              >
                {loading ? 'Создание...' : 'Создать ссылку'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.successMessage}>
              ✅ Ссылка для совместного доступа создана!
            </div>
            
            <div className={styles.shareInfo}>
              <div className={styles.infoRow}>
                <span className={styles.infoIcon}>🔒</span>
                <div>
                  <strong>Права доступа:</strong> {permissions === 'view' ? 'Только просмотр' : 'Просмотр и редактирование'}
                </div>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoIcon}>📅</span>
                <div>
                  <strong>Срок действия:</strong> до {new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </div>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoIcon}>📋</span>
                <div>
                  <strong>Инструкция:</strong> Отправьте эту ссылку тому, с кем хотите поделиться историей
                </div>
              </div>
            </div>

            <div className={styles.urlContainer}>
              <div className={styles.urlLabel}>Ссылка для доступа:</div>
              <input
                type="text"
                value={shareUrl}
                readOnly
                className={styles.urlInput}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button onClick={copyToClipboard} className={styles.copyButton}>
                📋 Копировать ссылку
              </button>
            </div>

            <div className={styles.finalHint}>
              <p>⚠️ <strong>Важно:</strong> Эта ссылка предоставляет доступ к вашей истории перелетов.</p>
              <p>Делитесь ей только с теми, кому доверяете.</p>
            </div>

            <div className={styles.buttonGroup}>
              <button onClick={deactivateLink} className={styles.deactivateButton}>
                🔒 Отозвать доступ
              </button>
              <button onClick={onClose} className={styles.closeButton}>
                Готово
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ShareFlightModal;