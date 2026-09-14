// src/features/sharing/components/ShareLinkOptions/ShareLinkOptions.tsx
import React, { useState, useEffect } from 'react';
import { t } from '@shared/i18n';
import styles from './ShareLinkOptions.module.css';

interface ShareLinkOptionsProps {
  shareUrl: string;
  permissions: 'view' | 'edit';
  onCopy: (text: string) => void;
}

const ShareLinkOptions: React.FC<ShareLinkOptionsProps> = ({
  shareUrl,
  permissions,
  onCopy
}) => {
  const [shareWithInstructions, setShareWithInstructions] = useState<boolean>(true);
  const [instructionsText, setInstructionsText] = useState<string>('');

  // Генерируем текст инструкции
  useEffect(() => {
    setInstructionsText(
      permissions === 'edit' ? t('share.inviteEdit') : t('share.inviteView')
    );
  }, [permissions]);

  // Основная функция копирования (зависит от чекбокса)
  const handleCopyPrimary = () => {
    if (shareWithInstructions) {
      const textToCopy = instructionsText + shareUrl;
      onCopy(textToCopy);
    } else {
      onCopy(shareUrl);
    }
  };

  // Копирование только ссылки (всегда, только при включенном чекбоксе)
  const handleCopyLinkOnly = () => {
    onCopy(shareUrl);
  };

  // Нативный шеринг
  const handleShareViaNative = async () => {
    if (navigator.share) {
      try {
        const shareData: ShareData = {
          title: permissions === 'edit'
            ? t('share.nativeEdit')
            : t('share.nativeView'),
          text: shareWithInstructions ? instructionsText + shareUrl : shareUrl,
          url: shareWithInstructions ? undefined : shareUrl,
        };
        
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          // Fallback to copy
          handleCopyPrimary();
        }
      }
    } else {
      // Fallback for desktop
      handleCopyPrimary();
    }
  };

  return (
    <div className={styles.container}>
      {/* Настройки отправки */}
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

      {/* Предпросмотр инструкции */}
      {shareWithInstructions && (
        <div className={styles.previewSection}>
          <div className={styles.previewHeader}>
            <span>{t('share.preview')}</span>
          </div>
          <div className={styles.previewContent}>
            <div className={styles.previewText}>
              {instructionsText}
              <span className={styles.previewUrl}>{shareUrl}</span>
            </div>
          </div>
        </div>
      )}

      {/* Кнопки действий */}
      <div className={styles.actionsSection}>
        <div className={styles.buttonGroup}>
          {/* Показываем "Только ссылку" ТОЛЬКО когда чекбокс включен */}
          {shareWithInstructions && (
            <button
              onClick={handleCopyLinkOnly}
              className={styles.copyButtonSecondary}
              title={t('share.copyLinkOnly')}
            >
              {t('share.linkOnly')}
            </button>
          )}
          
          {/* Основная кнопка - занимает всю ширину если нет вторичной */}
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