import React from 'react';
import JoinSessionForm from '../JoinSessionForm/JoinSessionForm';
import styles from './JoinSessionModal.module.css';

interface JoinSessionModalProps {
  onJoin: (token: string) => void | Promise<void>;
  onClose: () => void;
}

const JoinSessionModal: React.FC<JoinSessionModalProps> = ({ onJoin, onClose }) => {
  const handleJoin = async (token: string) => {
    await onJoin(token);
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="presentation">
      <div
        className={styles.modalContent}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Присоединиться к истории"
      >
        {/* Только кнопка закрытия в углу */}
        <button 
          onClick={onClose} 
          className={styles.closeButton}
          aria-label="Закрыть окно присоединения"
          style={{ position: 'absolute', right: '16px', top: '16px', zIndex: 1 }}
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