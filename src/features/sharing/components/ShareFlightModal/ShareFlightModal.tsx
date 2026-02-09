// src/features/sharing/components/ShareFlightModal/ShareFlightModal.tsx
import React, { useState } from 'react';
import { supabase } from '@shared/lib';
import ShareLinkOptions from '../ShareLinkOptions/ShareLinkOptions'; // 🔥 ИМПОРТ
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

      let url: string;
      
      if (permissions === 'edit') {
        url = `https://t.me/my_flight_tracker1_bot?startapp=${token}`;
      } else {
        url = `${window.location.origin}${window.location.pathname}?token=${token}`;
      }
      
      setShareUrl(url);
      setGeneratedToken(token);
      onShareCreated(token);
        
    } catch (err: any) {
      setError(err.message || 'Ошибка при создании ссылки');
      console.error('Error creating share link:', err);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 ОБНОВЛЕННАЯ ФУНКЦИЯ КОПИРОВАНИЯ
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        const hasInstructions = text.includes('КАК ОТКРЫТЬ') || text.includes('Привет!');
        alert(hasInstructions ? 'Ссылка с инструкцией скопирована!' : 'Ссылка скопирована!');
      })
      .catch(err => console.error('Copy failed:', err));
  };

  const deactivateLink = async () => {
    if (!window.confirm('Вы уверены, что хотите отозвать доступ? Это действие нельзя отменить.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('shared_sessions')
        .update({ is_active: false })
        .eq('token', generatedToken);

      if (error) throw error;
      alert('Доступ успешно отозван');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка при отзыве доступа');
    }
  };

  const formatExpiryDate = () => {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);
    return expiryDate.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        
        {!generatedToken ? (
          <>
            {/* ЭКРАН СОЗДАНИЯ ССЫЛКИ - БЕЗ ИЗМЕНЕНИЙ */}
            <h3>📤 Поделиться историей перелетов</h3>
            
            <div className={styles.hintBox}>
              <p>Создайте ссылку, чтобы поделиться историей с друзьями</p>
              <p className={styles.hintSubtext}>
                Вы можете дать права только на просмотр или разрешить просмотр и редактирование
              </p>
            </div>
            
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
                    Гость сможет просматривать вашу историю в браузере или через Telegram WebApp
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
                    Гость сможет просматривать и редактировать Вашу историю через Telegram WebApp
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
                <option value={365}>1 год</option>
              </select>
              <p className={styles.selectHint}>
                Ссылка перестанет работать {formatExpiryDate()}
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
            {/* ЭКРАН СОЗДАННОЙ ССЫЛКИ - УПРОЩЕННЫЙ */}
            <div className={styles.successMessage}>
              ✅ Ссылка для совместного доступа создана!
            </div>
            
            <div className={styles.shareInfo}>
              <div className={styles.infoRow}>
                <span className={styles.infoIcon}>🔒</span>
                <div>
                  <strong>Права доступа:</strong> {permissions === 'view' ? 'Только просмотр' : 'Просмотр и редактирование'}
                  {permissions === 'edit' && (
                    <div className={styles.telegramNote}>
                      📱 Требуется Telegram для редактирования
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoIcon}>📅</span>
                <div>
                  <strong>Срок действия:</strong> до {formatExpiryDate()}
                </div>
              </div>
            </div>

            {/* Отображаем ссылку */}
            <div className={styles.urlContainer}>
              <div className={styles.urlLabel}>
                {permissions === 'edit' 
                  ? 'Telegram ссылка:' 
                  : 'Web-ссылка:'}
              </div>
              <input
                type="text"
                value={shareUrl}
                readOnly
                className={styles.urlInput}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
            </div>

            {/* 🔥 ИСПОЛЬЗУЕМ НАШ КОМПОНЕНТ ВМЕСТО СТАРОЙ ЛОГИКИ */}
            <ShareLinkOptions
              shareUrl={shareUrl}
              permissions={permissions}
              token={generatedToken}
              onCopy={handleCopyText}
            />

            <div className={styles.finalHint}>
              <p>📤 <strong>Что делать:</strong> Используйте кнопки выше чтобы скопировать или поделиться ссылкой</p>
              <p>⚠️ <strong>Важно:</strong> Делитесь ссылкой только с теми, кому доверяете</p>
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