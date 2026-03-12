import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { CREATE_HABIT, UPDATE_HABIT } from '../../graphql/mutations';
import { GET_HABITS } from '../../graphql/queries';
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
}

export default function HabitForm({ habit, onClose }: Props) {
  const isEdit = !!habit;
  const [name, setName] = useState(habit?.name || '');
  const [freqType, setFreqType] = useState(habit?.frequency.type || 'DAILY');
  const [daysPerWeek, setDaysPerWeek] = useState(habit?.frequency.daysPerWeek || 3);
  const [specificDays, setSpecificDays] = useState<string[]>(habit?.frequency.specificDays || []);
  const [reminderEnabled, setReminderEnabled] = useState(habit?.reminder.enabled || false);
  const [reminderTime, setReminderTime] = useState(habit?.reminder.time || '09:00');
  const [error, setError] = useState('');

  const [createHabit, { loading: creating }] = useMutation(CREATE_HABIT, {
    refetchQueries: [{ query: GET_HABITS }],
  });
  const [updateHabit, { loading: updating }] = useMutation(UPDATE_HABIT, {
    refetchQueries: [{ query: GET_HABITS }],
  });

  const loading = creating || updating;

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
      ...(reminderEnabled && { time: reminderTime }),
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

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>{isEdit ? 'Edit Habit' : 'New Habit'}</h2>

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
              Reminder time (UTC)
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
        </form>
      </div>
    </div>
  );
}
