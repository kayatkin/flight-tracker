// src/features/sharing/components/ShareFlightModal/ShareFlightModal.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlanId } from '@shared/constants/subscription';
import { createShareSession, revokeShareSession, ShareLimitError } from '@services/shareService';
import { toast } from '@shared/ui/Toast';
import { logError } from '@shared/utils/logger';
import ShareLinkOptions from '../ShareLinkOptions/ShareLinkOptions';
import styles from './ShareFlightModal.module.css';

interface ShareFlightModalProps {
  userId: string;
  plan: PlanId;
  onClose: () => void;
  onShareCreated: (token: string) => void;
  onUpgradeRequest?: () => void;
}

const ShareFlightModal: React.FC<ShareFlightModalProps> = ({
  userId,
  plan,
  onClose,
  onShareCreated,
  onUpgradeRequest,
}) => {
  const { t } = useTranslation();
  const [permissions, setPermissions] = useState<'view' | 'edit'>('view');
  const [expiryDays, setExpiryDays] = useState<number>(7);
  const [generatedToken, setGeneratedToken] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [shareLimitHit, setShareLimitHit] = useState(false);

  const createShareLink = async () => {
    try {
      setLoading(true);
      setError('');
      setShareLimitHit(false);
      
      const { token, url } = await createShareSession({
        ownerId: userId,
        permissions,
        expiryDays,
        plan,
      });

      setShareUrl(url);
      setGeneratedToken(token);
      onShareCreated(token);
        
    } catch (err: unknown) {
      if (err instanceof ShareLimitError) {
        setShareLimitHit(true);
        setError(t('paywall.shareLinksLimit', { max: err.maxLinks }));
        return;
      }
      const message = err instanceof Error ? err.message : 'Ошибка при создании ссылки';
      setError(message);
      logError('Error creating share link:', err);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 ОБНОВЛЕННАЯ ФУНКЦИЯ КОПИРОВАНИЯ
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        const hasInstructions = text.includes('КАК ОТКРЫТЬ') || text.includes('Привет!');
        toast(
          hasInstructions ? 'Ссылка с инструкцией скопирована' : 'Ссылка скопирована',
          'success'
        );
      })
      .catch((err) => logError('Copy failed:', err));
  };

  const deactivateLink = async () => {
    if (!window.confirm('Вы уверены, что хотите отозвать доступ? Это действие нельзя отменить.')) {
      return;
    }

    try {
      await revokeShareSession(generatedToken);
      toast('Доступ успешно отозван', 'success');
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка при отзыве доступа';
      setError(message);
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
            {shareLimitHit && onUpgradeRequest && (
              <button type="button" className={styles.createButton} onClick={onUpgradeRequest}>
                {t('paywall.upgradeButton')}
              </button>
            )}
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