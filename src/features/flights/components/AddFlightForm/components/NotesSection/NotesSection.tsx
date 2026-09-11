import React from 'react';
import { FlightFormData } from '@shared/hooks';
import { NOTES_MAX_LENGTH } from '@shared/utils';
import styles from './NotesSection.module.css';

interface NotesSectionProps {
  formData: FlightFormData;
  updateFormData: (data: Partial<FlightFormData>) => void;
}

const NotesSection: React.FC<NotesSectionProps> = ({
  formData,
  updateFormData,
}) => {
  const length = formData.notes.length;

  return (
    <div className={styles.section}>
      <h4 className={styles.sectionTitle}>📝 Заметка</h4>
      <label className={styles.srOnly} htmlFor="flight-notes">
        Необязательная заметка к билету
      </label>
      <textarea
        id="flight-notes"
        className={styles.textarea}
        value={formData.notes}
        maxLength={NOTES_MAX_LENGTH}
        rows={3}
        placeholder="Например: багаж, окно, ссылка на поиск"
        aria-label="Необязательная заметка к билету"
        onChange={(event) => {
          updateFormData({ notes: event.target.value.slice(0, NOTES_MAX_LENGTH) });
        }}
      />
      <div className={styles.footer}>
        <span className={styles.hint}>Необязательно, видно в истории и в CSV</span>
        <span className={styles.counter}>{length}/{NOTES_MAX_LENGTH}</span>
      </div>
    </div>
  );
};

export default NotesSection;
