// src/features/sharing/components/ShareLinkOptions/ShareLinkOptions.tsx
import React, { useMemo, useState } from 'react';
import { t } from '@shared/i18n';
import { buildInviteLinks, buildInviteMessage } from '@services/shareCopy';
import styles from './ShareLinkOptions.module.css';

interface ShareLinkOptionsProps {
  shareUrl: string;
  webUrl: string;
  permissions: 'view' | 'edit';
  onCopy: (text: string) => void;
}

const ShareLinkOptions: React.FC<ShareLinkOptionsProps> = ({
  shareUrl,
  webUrl,
  permissions,
  onCopy
}) => {
  const [shareWithInstructions, setShareWithInstructions] = useState<boolean>(true);

  const instructionsText = useMemo(
    () => buildInviteMessage({ permissions, shareUrl, webUrl }),
    [permissions, shareUrl, webUrl]
  );
  const linksOnly = useMemo(
    () => buildInviteLinks({ permissions, shareUrl, webUrl }),
    [permissions, shareUrl, webUrl]
  );

  const handleCopyPrimary = () => {
    onCopy(shareWithInstructions ? instructionsText : linksOnly);
  };

  const handleCopyLinkOnly = () => {
    onCopy(linksOnly);
  };

  const handleShareViaNative = async () => {
    if (navigator.share) {
      try {
        const shareData: ShareData = {
          title: permissions === 'edit'
            ? t('share.nativeEdit')
            : t('share.nativeView'),
          text: shareWithInstructions ? instructionsText : linksOnly,
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
          {t('share.withInstructions')}
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
            <span>{t('share.preview')}</span>
          </div>
          <div className={styles.previewContent}>
            <div className={styles.previewText}>
              {instructionsText}
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
              {t('share.linkOnly')}
            </button>
          )}
          
          <button
            onClick={handleCopyPrimary}
            className={shareWithInstructions ? styles.copyButtonPrimary : styles.copyButtonFull}
            title={shareWithInstructions
              ? t('share.copyWithHelp')
              : t('share.copyLink')
            }
          >
            📋 {shareWithInstructions ? t('share.copyWithHelpBtn') : t('share.copyLink')}
          </button>
        </div>
        
        <button
          onClick={handleShareViaNative}
          className={styles.shareNativeButton}
          title={t('share.nativeTitle')}
        >
          {t('share.native')}
        </button>
      </div>
    </div>
  );
};

export default ShareLinkOptions;
