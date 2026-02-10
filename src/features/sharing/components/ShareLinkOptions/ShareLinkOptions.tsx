// src/features/sharing/components/ShareLinkOptions/ShareLinkOptions.tsx
import React, { useState, useEffect } from 'react';
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
  const [shareWithInstructions, setShareWithInstructions] = useState<boolean>(true);
  const [instructionsText, setInstructionsText] = useState<string>('');

  // Генерируем текст инструкции
  useEffect(() => {
    if (permissions === 'edit') {
      setInstructionsText(`Привет! Приглашаю тебя посмотреть мою историю перелётов.

📱 КАК ОТКРЫТЬ:
1. Нажми на полученную ссылку
2. Запусти Telegram MiniApp кнопкой "Старт"
3. Нажми кнопку "RunApp"
4. Готово! Можешь просматривать и редактировать мою историю перелётов.

🔗 Ссылка: `);
    } else {
      setInstructionsText(`Привет! Приглашаю тебя посмотреть мою историю перелётов.

🌐 КАК ОТКРЫТЬ:
Через браузер - 
1. Просто открой эту ссылку в любом браузере — всё откроется автоматически.
2. Готово! Можешь просматривать мою историю перелётов.
Через Telegram MiniApp -
1. Запусти Telegram MiniApp
2. Зайди в раздел "История" -> "Присоединиться"
3. Вставь полученную ссылку в соответствующее поле  
4. Готово! Можешь просматривать мою историю перелётов.

🔗 Ссылка: `);
    }
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
            ? 'Приглашение редактировать историю перелётов ✈️' 
            : 'Приглашение посмотреть историю перелётов ✈️',
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
          📋 Отправить с инструкцией
        </label>
        <p className={styles.optionHint}>
          {shareWithInstructions 
            ? 'Ссылка будет отправлена с инструкцией'
            : 'Будет отправлена только чистая ссылка'}
        </p>
      </div>

      {/* Предпросмотр инструкции */}
      {shareWithInstructions && (
        <div className={styles.previewSection}>
          <div className={styles.previewHeader}>
            <span>👁️ Предпросмотр сообщения:</span>
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
              title="Скопировать только ссылку (без инструкции)"
            >
              📎 Только ссылка
            </button>
          )}
          
          {/* Основная кнопка - занимает всю ширину если нет вторичной */}
          <button
            onClick={handleCopyPrimary}
            className={shareWithInstructions ? styles.copyButtonPrimary : styles.copyButtonFull}
            title={shareWithInstructions 
              ? "Скопировать ссылку с инструкцией" 
              : "Скопировать ссылку"
            }
          >
            📋 {shareWithInstructions ? 'Скопировать с инструкцией' : 'Скопировать ссылку'}
          </button>
        </div>
        
        <button
          onClick={handleShareViaNative}
          className={styles.shareNativeButton}
          title="Поделиться через мессенджеры"
        >
          📤 Поделиться
        </button>
      </div>
    </div>
  );
};

export default ShareLinkOptions;