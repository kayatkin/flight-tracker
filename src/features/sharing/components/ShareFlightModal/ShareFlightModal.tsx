// src/features/sharing/components/ShareFlightModal/ShareFlightModal.tsx
import React, { useState } from 'react';
import { t } from '@shared/i18n';
import { createShareSession, revokeShareSession } from '@services/shareService';
import { toast } from '@shared/ui/Toast';
import { copyToClipboard, logError } from '@shared/utils';
import { useEscapeToClose } from '@shared/hooks';
import ShareLinkOptions from '../ShareLinkOptions/ShareLinkOptions';
import styles from './ShareFlightModal.module.css';

interface ShareFlightModalProps {
  userId: string;
  onClose: () => void;
  onShareCreated: (token: string) => void;
}

const ShareFlightModal: React.FC<ShareFlightModalProps> = ({ userId, onClose, onShareCreated }) => {
  const dialogRef = useEscapeToClose<HTMLDivElement>(onClose);
  const [permissions, setPermissions] = useState<'view' | 'edit'>('view');
  const [expiryDays, setExpiryDays] = useState<number>(7);
  const [generatedToken, setGeneratedToken] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');
  const [expiresAtLabel, setExpiresAtLabel] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const createShareLink = async () => {
    try {
      setLoading(true);
      setError('');
      
      const { token, url, expiresAt } = await createShareSession({
        ownerId: userId,
        permissions,
        expiryDays,
      });

      setShareUrl(url);
      setGeneratedToken(token);
      setExpiresAtLabel(formatShareDate(expiresAt));
      onShareCreated(token);
        
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('share.createError');
      setError(message);
      logError('Error creating share link:', err);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 ОБНОВЛЕННАЯ ФУНКЦИЯ КОПИРОВАНИЯ
  const handleCopyText = (text: string) => {
    void copyToClipboard(text).then((copied) => {
      if (!copied) {
        toast(t('share.copyFailed'), 'error');
        return;
      }
      const hasInstructions = text.includes('КАК ОТКРЫТЬ') || text.includes('Привет!');
      toast(
        hasInstructions ? t('share.copiedWithHelp') : t('share.copied'),
        'success'
      );
    });
  };

  const deactivateLink = async () => {
    if (!window.confirm(t('share.confirmRevoke'))) {
      return;
    }

    try {
      await revokeShareSession(generatedToken);
      toast(t('share.revoked'), 'success');
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('share.revokeError');
      setError(message);
    }
  };

  const formatShareDate = (iso: string) => {
    const expiryDate = new Date(iso);
    if (Number.isNaN(expiryDate.getTime())) {
      return iso;
    }
    return expiryDate.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
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
    <div className={styles.modalOverlay} onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className={styles.modalContent}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-flight-title"
        tabIndex={-1}
      >
        
        {!generatedToken ? (
          <>
            <h3 id="share-flight-title">{t('share.title')}</h3>
            
            <div className={styles.hintBox}>
              <p>{t('share.hint')}</p>
              <p className={styles.hintSubtext}>
                {t('share.hintSub')}
              </p>
            </div>
            
            <div className={styles.formGroup}>
              <label>{t('share.permissions')}</label>
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    value="view"
                    checked={permissions === 'view'}
                    onChange={(e) => setPermissions(e.target.value as 'view' | 'edit')}
                    className={styles.radioInput}
                  />
                  {t('share.view')}
                  <span className={styles.radioDescription}>
                    {t('share.viewHelp')}
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
                  {t('share.edit')}
                  <span className={styles.radioDescription}>
                    {t('share.editHelp')}
                  </span>
                </label>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>{t('share.expiry')}</label>
              <select
                value={expiryDays}
                onChange={(e) => setExpiryDays(Number(e.target.value))}
                className={styles.select}
              >
                <option value={1}>{t('share.day1')}</option>
                <option value={7}>{t('share.days7')}</option>
                <option value={30}>{t('share.days30')}</option>
                <option value={365}>{t('share.year1')}</option>
              </select>
              <p className={styles.selectHint}>
                {t('share.worksUntil', { date: formatExpiryDate() })}
              </p>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.buttonGroup}>
              <button onClick={onClose} className={styles.cancelButton}>
                {t('share.cancel')}
              </button>
              <button 
                onClick={createShareLink} 
                className={styles.createButton}
                disabled={loading}
              >
                {loading ? t('share.creating') : t('share.create')}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.successMessage}>
              {t('share.created')}
            </div>
            
            <div className={styles.shareInfo}>
              <div className={styles.infoRow}>
                <span className={styles.infoIcon}>🔒</span>
                <div>
                  <strong>{t('share.rights')}</strong> {permissions === 'view' ? t('share.viewShort') : t('share.editShort')}
                  {permissions === 'edit' && (
                    <div className={styles.telegramNote}>
                      {t('share.telegramNote')}
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoIcon}>📅</span>
                <div>
                  <strong>{t('share.until')}</strong> {t('share.untilDate', { date: expiresAtLabel || formatExpiryDate() })}
                </div>
              </div>
            </div>

            <div className={styles.urlContainer}>
              <div className={styles.urlLabel}>
                {permissions === 'edit'
                  ? t('share.telegramLink')
                  : t('share.webLink')}
              </div>
              <input
                type="text"
                value={shareUrl}
                readOnly
                className={styles.urlInput}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
            </div>

            <ShareLinkOptions
              shareUrl={shareUrl}
              permissions={permissions}
              onCopy={handleCopyText}
            />

            <div className={styles.finalHint}>
              <p>📤 <strong>{t('share.whatNextTitle')}</strong> {t('share.whatNext')}</p>
              <p>⚠️ <strong>{t('share.importantTitle')}</strong> {t('share.important')}</p>
            </div>

            <div className={styles.buttonGroup}>
              <button onClick={deactivateLink} className={styles.deactivateButton}>
                {t('share.revoke')}
              </button>
              <button onClick={onClose} className={styles.closeButton}>
                {t('share.done')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ShareFlightModal;