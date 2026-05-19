import React from 'react';
import { useTranslation } from 'react-i18next';
import JoinSessionForm from '../JoinSessionForm/JoinSessionForm';
import styles from './JoinSessionModal.module.css';

interface JoinSessionModalProps {
  onJoin: (token: string) => void;
  onClose: () => void;
}

const JoinSessionModal: React.FC<JoinSessionModalProps> = ({ onJoin, onClose }) => {
  const { t } = useTranslation();

  const handleJoin = (token: string) => {
    onJoin(token);
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        {/* Только кнопка закрытия в углу */}
        <button 
          onClick={onClose} 
          className={styles.closeButton}
          aria-label={t('join.closeAria')}
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