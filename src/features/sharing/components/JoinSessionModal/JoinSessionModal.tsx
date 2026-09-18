import React from 'react';
import JoinSessionForm, { type JoinSessionHandler } from '../JoinSessionForm/JoinSessionForm';
import { t } from '@shared/i18n';
import { useEscapeToClose } from '@shared/hooks';
import styles from './JoinSessionModal.module.css';

interface JoinSessionModalProps {
  onJoin: JoinSessionHandler;
  onClose: () => void;
}

const JoinSessionModal: React.FC<JoinSessionModalProps> = ({ onJoin, onClose }) => {
  const dialogRef = useEscapeToClose<HTMLDivElement>(onClose);

  const handleJoin: JoinSessionHandler = async (token) => {
    const joined = await onJoin(token);
    if (joined) onClose();
    return joined;
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className={styles.modalContent}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('join.dialog')}
        tabIndex={-1}
      >
        {/* Только кнопка закрытия в углу */}
        <button 
          onClick={onClose} 
          className={styles.closeButton}
          aria-label={t('join.close')}
        >
          ✕
        </button>
        
        <JoinSessionForm
          onJoin={handleJoin}
          onCancel={onClose}
        />
      </div>
    </div>
  );
};

export default JoinSessionModal;