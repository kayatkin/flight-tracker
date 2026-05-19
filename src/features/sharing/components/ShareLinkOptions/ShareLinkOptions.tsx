// src/features/sharing/components/ShareLinkOptions/ShareLinkOptions.tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './ShareLinkOptions.module.css';

interface ShareLinkOptionsProps {
  shareUrl: string;
  permissions: 'view' | 'edit';
  token: string;
  onCopy: (text: string) => void;
}

const ShareLinkOptions: React.FC<ShareLinkOptionsProps> = ({
  shareUrl,
  permissions,
  token,
  onCopy
}) => {
  const { t } = useTranslation();
  const [shareWithInstructions, setShareWithInstructions] = useState<boolean>(true);
  const [instructionsText, setInstructionsText] = useState<string>('');

  useEffect(() => {
    if (permissions === 'edit') {
      setInstructionsText(t('share.instructionsEdit'));
    } else {
      setInstructionsText(t('share.instructionsView'));
    }
  }, [permissions, t]);

  const handleCopyPrimary = () => {
    if (shareWithInstructions) {
      const textToCopy = instructionsText + shareUrl;
      onCopy(textToCopy);
    } else {
      onCopy(shareUrl);
    }
  };

  const handleCopyLinkOnly = () => {
    onCopy(shareUrl);
  };

  const handleShareViaNative = async () => {
    if (navigator.share) {
      try {
        const shareData: ShareData = {
          title: permissions === 'edit' 
            ? t('share.shareTitleEdit')
            : t('share.shareTitleView'),
          text: shareWithInstructions ? instructionsText + shareUrl : shareUrl,
          url: shareWithInstructions ? undefined : shareUrl,
        };
        
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          handleCopyPrimary();
        }
      }
    } else {
      handleCopyPrimary();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.optionsSection}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={shareWithInstructions}
            onChange={(e) => setShareWithInstructions(e.target.checked)}
            className={styles.checkboxInput}
          />
          <span className={styles.checkboxCustom}></span>
          📋 {t('share.withInstructions')}
        </label>
        <p className={styles.optionHint}>
          {shareWithInstructions 
            ? t('share.withInstructionsHint')
            : t('share.linkOnlyHint')}
        </p>
      </div>

      {shareWithInstructions && (
        <div className={styles.previewSection}>
          <div className={styles.previewHeader}>
            <span>👁️ {t('share.preview')}</span>
          </div>
          <div className={styles.previewContent}>
            <div className={styles.previewText}>
              {instructionsText}
              <span className={styles.previewUrl}>{shareUrl}</span>
            </div>
          </div>
        </div>
      )}

      <div className={styles.actionsSection}>
        <div className={styles.buttonGroup}>
          {shareWithInstructions && (
            <button
              onClick={handleCopyLinkOnly}
              className={styles.copyButtonSecondary}
              title={t('share.copyLinkOnly')}
            >
              📎 {t('share.copyLinkOnly')}
            </button>
          )}
          
          <button
            onClick={handleCopyPrimary}
            className={shareWithInstructions ? styles.copyButtonPrimary : styles.copyButtonFull}
            title={shareWithInstructions 
              ? t('share.copyWithInstr')
              : t('share.copyLinkBtn')
            }
          >
            📋 {shareWithInstructions ? t('share.copyWithInstr') : t('share.copyLinkBtn')}
          </button>
        </div>
        
        <button
          onClick={handleShareViaNative}
          className={styles.shareNativeButton}
          title={t('share.shareNative')}
        >
          📤 {t('share.shareNative')}
        </button>
      </div>
    </div>
  );
};

export default ShareLinkOptions;
