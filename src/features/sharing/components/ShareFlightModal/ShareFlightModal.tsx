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
  const { t, i18n } = useTranslation();
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
      const message = err instanceof Error ? err.message : t('share.createError');
      setError(message);
      logError('Error creating share link:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        const marker = t('share.instructionsMarker');
        const hasInstructions = text.includes(marker) || text.includes('\n\n');
        toast(
          hasInstructions ? t('share.copyWithInstructions') : t('share.copyLink'),
          'success'
        );
      })
      .catch((err) => logError('Copy failed:', err));
  };

  const deactivateLink = async () => {
    if (!window.confirm(t('share.revokeConfirm'))) {
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

  const formatExpiryDate = () => {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiryDays);
    const locale = i18n.language === 'en' ? 'en-US' : 'ru-RU';
    return expiryDate.toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const permissionsLabel = permissions === 'view'
    ? t('common.permissionsViewLabel')
    : t('common.permissionsEditLabel');

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        
        {!generatedToken ? (
          <>
            <h3>📤 {t('share.modalTitle')}</h3>
            
            <div className={styles.hintBox}>
              <p>{t('share.modalHint')}</p>
              <p className={styles.hintSubtext}>
                {t('share.modalSubhint')}
              </p>
            </div>
            
            <div className={styles.formGroup}>
              <label>{t('share.permissionsLabel')}</label>
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    value="view"
                    checked={permissions === 'view'}
                    onChange={(e) => setPermissions(e.target.value as 'view' | 'edit')}
                    className={styles.radioInput}
                  />
                  👁️ {t('share.viewOnly')}
                  <span className={styles.radioDescription}>
                    {t('share.viewOnlyDesc')}
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
                  ✏️ {t('share.edit')}
                  <span className={styles.radioDescription}>
                    {t('share.editDesc')}
                  </span>
                </label>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>{t('share.expiryLabel')}</label>
              <select
                value={expiryDays}
                onChange={(e) => setExpiryDays(Number(e.target.value))}
                className={styles.select}
              >
                <option value={1}>{t('share.expiry1')}</option>
                <option value={7}>{t('share.expiry7')}</option>
                <option value={30}>{t('share.expiry30')}</option>
                <option value={365}>{t('share.expiry365')}</option>
              </select>
              <p className={styles.selectHint}>
                {t('share.expiryHint', { date: formatExpiryDate() })}
              </p>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.buttonGroup}>
              <button onClick={onClose} className={styles.cancelButton}>
                {t('common.cancel')}
              </button>
              <button 
                onClick={createShareLink} 
                className={styles.createButton}
                disabled={loading}
              >
                {loading ? t('share.creating') : t('share.createLink')}
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
            <div className={styles.successMessage}>
              ✅ {t('share.success')}
            </div>
            
            <div className={styles.shareInfo}>
              <div className={styles.infoRow}>
                <span className={styles.infoIcon}>🔒</span>
                <div>
                  <strong>{t('share.accessLabel')}</strong> {permissionsLabel}
                  {permissions === 'edit' && (
                    <div className={styles.telegramNote}>
                      📱 {t('share.telegramRequired')}
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoIcon}>📅</span>
                <div>
                  <strong>{t('share.expiryUntil')}</strong> {formatExpiryDate()}
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
              token={generatedToken}
              onCopy={handleCopyText}
            />

            <div className={styles.finalHint}>
              <p>📤 {t('share.whatToDo')}</p>
              <p>⚠️ {t('share.trustWarning')}</p>
            </div>

            <div className={styles.buttonGroup}>
              <button onClick={deactivateLink} className={styles.deactivateButton}>
                🔒 {t('share.revoke')}
              </button>
              <button onClick={onClose} className={styles.closeButton}>
                {t('common.done')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ShareFlightModal;
