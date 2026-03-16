import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';
import { CREATE_HABIT, UPDATE_HABIT, DELETE_HABIT } from '../../graphql/mutations';
import { GET_HABITS } from '../../graphql/queries';
import ConfirmDialog from '../common/ConfirmDialog';
import styles from './HabitForm.module.css';

interface Habit {
  id: string;
  name: string;
  frequency: { type: string; daysPerWeek?: number; specificDays?: string[] };
  reminder: { enabled: boolean; time?: string };
}

interface Props {
  habit?: Habit;
  onClose: () => void;
  inline?: boolean;
}

function utcToLocal(utcTime: string): string {
  const [h, m] = utcTime.split(':').map(Number);
  const now = new Date();
  now.setUTCHours(h, m, 0, 0);
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function localToUtc(localTime: string): string {
  const [h, m] = localTime.split(':').map(Number);
  const now = new Date();
  now.setHours(h, m, 0, 0);
  return `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
}

export default function HabitForm({ habit, onClose, inline }: Props) {
  const isEdit = !!habit;
  const navigate = useNavigate();
  const [name, setName] = useState(habit?.name || '');
  const [freqType, setFreqType] = useState(habit?.frequency.type || 'DAILY');
  const [daysPerWeek, setDaysPerWeek] = useState(habit?.frequency.daysPerWeek || 3);
  const [specificDays, setSpecificDays] = useState<string[]>(habit?.frequency.specificDays || []);
  const [reminderEnabled, setReminderEnabled] = useState(habit?.reminder.enabled || false);
  const [reminderTime, setReminderTime] = useState(
    habit?.reminder.time ? utcToLocal(habit.reminder.time) : '09:00'
  );
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [createHabit, { loading: creating }] = useMutation(CREATE_HABIT, {
    refetchQueries: [{ query: GET_HABITS }],
  });
  const [updateHabit, { loading: updating }] = useMutation(UPDATE_HABIT, {
    refetchQueries: [{ query: GET_HABITS }],
  });
  const [deleteHabit, { loading: deleting }] = useMutation(DELETE_HABIT, {
    refetchQueries: [{ query: GET_HABITS }],
  });

  const loading = creating || updating || deleting;

  const allDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const toggleDay = (day: string) => {
    setSpecificDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const frequency: Record<string, unknown> = { type: freqType };
    if (freqType === 'WEEKLY') frequency.daysPerWeek = daysPerWeek;
    if (freqType === 'CUSTOM') frequency.specificDays = specificDays;

    const reminder = {
      enabled: reminderEnabled,
      ...(reminderEnabled && { time: localToUtc(reminderTime) }),
    };

    const input = { name, frequency, reminder };

    try {
      if (isEdit) {
        await updateHabit({ variables: { id: habit.id, input } });
      } else {
        await createHabit({ variables: { input } });
      }
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const formContent = (
    <>
      <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            Name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={styles.input}
              required
              autoFocus
            />
          </label>

          <label className={styles.label}>
            Frequency
            <select
              value={freqType}
              onChange={(e) => setFreqType(e.target.value)}
              className={styles.input}
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="CUSTOM">Custom Days</option>
            </select>
          </label>

          {freqType === 'WEEKLY' && (
            <label className={styles.label}>
              Days per week
              <input
                type="number"
                min={1}
                max={7}
                value={daysPerWeek}
                onChange={(e) => setDaysPerWeek(Number(e.target.value))}
                className={styles.input}
              />
            </label>
          )}

          {freqType === 'CUSTOM' && (
            <div className={styles.daysGrid}>
              {allDays.map((day) => (
                <button
                  key={day}
                  type="button"
                  className={`${styles.dayBtn} ${specificDays.includes(day) ? styles.daySelected : ''}`}
                  onClick={() => toggleDay(day)}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          )}

          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              checked={reminderEnabled}
              onChange={(e) => setReminderEnabled(e.target.checked)}
            />
            Enable reminder
          </label>

          {reminderEnabled && (
            <label className={styles.label}>
              Reminder time
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className={styles.input}
              />
            </label>
          )}

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Save' : 'Create'}
            </button>
          </div>

          {isEdit && (
            <button
              type="button"
              className={styles.deleteBtn}
              onClick={() => setShowDeleteConfirm(true)}
              disabled={loading}
            >
              Delete Habit
            </button>
          )}
        </form>

      {showDeleteConfirm && habit && (
        <ConfirmDialog
          title="Delete Habit"
          message={`Are you sure you want to delete "${habit.name}"? This cannot be undone.`}
          onConfirm={async () => {
            await deleteHabit({ variables: { id: habit.id } });
            onClose();
            navigate('/');
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );

  if (inline) {
    return formContent;
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>{isEdit ? 'Edit Habit' : 'New Habit'}</h2>
        {formContent}
      </div>
    </div>
  );
}
