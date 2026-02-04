'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Day } from './CalendarMonth';
import type { RepeatRuleInput } from './DayOverlay';

type TaskFormState = {
  title: string;
  priority: 'alta' | 'media' | 'baja';
  repeatMode: 'none' | 'daily' | 'weekly';
  repeatInterval: number;
  repeatWeekdays: number[];
  notifications: { minutesBefore: number }[];
};

type TaskFormOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: {
    title: string;
    priority: 'alta' | 'media' | 'baja';
    repeatRule?: RepeatRuleInput | null;
    notifications?: { minutesBefore: number }[];
  }) => Promise<void>;
  day: Day | null;
  initialTask?: {
    id?: string;
    title: string;
    priority: 'alta' | 'media' | 'baja';
    repeatRule?: RepeatRuleInput | null;
    notifications?: { minutesBefore: number }[];
  } | null;
};

const TASK_PRIORITY_OPTIONS: { value: 'alta' | 'media' | 'baja'; label: string; hint: string }[] = [
  { value: 'alta', label: 'Alta', hint: 'Impacto directo' },
  { value: 'media', label: 'Media', hint: 'Carga equilibrada' },
  { value: 'baja', label: 'Baja', hint: 'Mantenimiento liviano' },
];

const REPEAT_MODE_OPTIONS: { value: 'none' | 'daily' | 'weekly'; label: string; hint: string }[] = [
  { value: 'none', label: 'Único', hint: 'Solo este día' },
  { value: 'daily', label: 'Diario', hint: 'Cada cierto número de días' },
  { value: 'weekly', label: 'Semanal', hint: 'Elige los días de la semana' },
];

const WEEKDAY_OPTIONS = [
  { value: 1, label: 'L', title: 'Lunes' },
  { value: 2, label: 'M', title: 'Martes' },
  { value: 3, label: 'X', title: 'Miércoles' },
  { value: 4, label: 'J', title: 'Jueves' },
  { value: 5, label: 'V', title: 'Viernes' },
  { value: 6, label: 'S', title: 'Sábado' },
  { value: 0, label: 'D', title: 'Domingo' },
];

function getDefaultWeekdays(day: Day | null) {
  const fallback = new Date().getDay();
  if (!day) return [fallback];
  return [day.date.getDay()];
}

function buildRepeatRuleFromTaskForm(
  mode: 'none' | 'daily' | 'weekly',
  interval: number,
  weekdays: number[],
  day: Day | null,
): RepeatRuleInput | null {
  if (mode === 'none') return null;
  const safeInterval = Math.max(1, interval || 1);
  if (mode === 'daily') return { kind: 'daily', interval: safeInterval };
  const days = weekdays.length ? weekdays : getDefaultWeekdays(day);
  return { kind: 'weekly', interval: safeInterval, daysOfWeek: days };
}

function createTaskForm(day: Day | null, initialTask?: TaskFormOverlayProps['initialTask']): TaskFormState {
  if (initialTask) {
    const repeatRule = initialTask.repeatRule;
    let repeatMode: 'none' | 'daily' | 'weekly' = 'none';
    let repeatInterval = 1;
    let repeatWeekdays = getDefaultWeekdays(day);

    if (repeatRule) {
      if (repeatRule.kind === 'daily') {
        repeatMode = 'daily';
        repeatInterval = repeatRule.interval;
      } else if (repeatRule.kind === 'weekly') {
        repeatMode = 'weekly';
        repeatInterval = repeatRule.interval;
        repeatWeekdays = repeatRule.daysOfWeek || getDefaultWeekdays(day);
      }
    }

    return {
      title: initialTask.title,
      priority: initialTask.priority,
      repeatMode,
      repeatInterval,
      repeatWeekdays,
      notifications: (initialTask.notifications as { minutesBefore: number }[] | undefined) || [],
    };
  }

  return {
    title: '',
    priority: 'media',
    repeatMode: 'none',
    repeatInterval: 1,
    repeatWeekdays: getDefaultWeekdays(day),
    notifications: [],
  };
}

export default function TaskFormOverlay({
  isOpen,
  onClose,
  onSave,
  day,
  initialTask,
}: TaskFormOverlayProps) {
  const [form, setForm] = useState<TaskFormState>(() => createTaskForm(day, initialTask));
  const [closing, setClosing] = useState(false);
  const [saving, setSaving] = useState(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setForm(createTaskForm(day, initialTask));
      setClosing(false);
      document.body.style.overflowX = 'hidden';
      document.documentElement.style.overflowX = 'hidden';
    } else {
      document.body.style.overflowX = '';
      document.documentElement.style.overflowX = '';
    }
    
    return () => {
      document.body.style.overflowX = '';
      document.documentElement.style.overflowX = '';
    };
  }, [isOpen, day, initialTask]);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, []);

  const runClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    exitTimerRef.current = setTimeout(() => {
      onClose();
      setClosing(false);
    }, 200);
  }, [closing, onClose]);

  const handleSave = async () => {
    if (!form.title.trim() || saving) return;
    setSaving(true);
    try {
      const repeatRule = buildRepeatRuleFromTaskForm(form.repeatMode, form.repeatInterval, form.repeatWeekdays, day);
      await onSave({
        title: form.title.trim(),
        priority: form.priority,
        repeatRule,
        notifications: form.notifications.length > 0 ? form.notifications : undefined,
      });
      runClose();
    } catch (error: any) {
      console.error('Error saving task:', error);
      alert(error?.response?.data?.error?.message || error?.message || 'Error al guardar la tarea. Por favor, intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleRepeatModeChange = (mode: 'none' | 'daily' | 'weekly') => {
    setForm((prev) => {
      const ensureWeekdays =
        mode === 'weekly'
          ? prev.repeatWeekdays.length
            ? prev.repeatWeekdays
            : getDefaultWeekdays(day)
          : prev.repeatWeekdays;
      return {
        ...prev,
        repeatMode: mode,
        repeatWeekdays: ensureWeekdays,
        repeatInterval: mode === 'none' ? 1 : prev.repeatInterval,
      };
    });
  };

  const handleWeekdayToggle = (weekday: number) => {
    setForm((prev) => {
      const exists = prev.repeatWeekdays.includes(weekday);
      let next = exists ? prev.repeatWeekdays.filter((w) => w !== weekday) : [...prev.repeatWeekdays, weekday];
      if (!next.length) next = [weekday];
      return { ...prev, repeatWeekdays: next };
    });
  };

  const handleAddNotification = () => {
    setForm((prev) => ({
      ...prev,
      notifications: [...prev.notifications, { minutesBefore: 15 }],
    }));
  };

  const handleRemoveNotification = (index: number) => {
    setForm((prev) => ({
      ...prev,
      notifications: prev.notifications.filter((_, i) => i !== index),
    }));
  };

  const handleNotificationChange = (index: number, value: number) => {
    setForm((prev) => ({
      ...prev,
      notifications: prev.notifications.map((notif, i) =>
        i === index ? { minutesBefore: Math.max(0, value) } : notif
      ),
    }));
  };

  const formatTimeBefore = (minutes: number): string => {
    if (minutes === 0) {
      return 'Al inicio';
    }
    if (minutes < 60) {
      return `${minutes} min antes`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}min antes` : `${hours}h antes`;
    } else {
      const days = Math.floor(minutes / 1440);
      const hours = Math.floor((minutes % 1440) / 60);
      if (hours > 0) {
        return `${days}d ${hours}h antes`;
      }
      return `${days}d antes`;
    }
  };

  const formatDate = (day: Day | null): string => {
    if (!day) return '';
    return format(day.date, "EEEE d 'de' MMMM", { locale: es });
  };

  if (!isOpen) return null;

  const modal = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="day-form-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: closing ? 0 : 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) runClose();
          }}
        >
          <motion.div
            className="day-form__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: closing ? 0 : 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="day-form-modal"
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={closing ? { opacity: 0, scale: 0.96, y: 20 } : { opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="day-form-modal__scroll">
              <header className="day-form-modal__header">
                <div>
                  <h3 className="day-form-modal__title">
                    {initialTask ? 'Editar tarea' : 'Nueva tarea'}
                  </h3>
                  {day && (
                    <p className="day-form-modal__date">
                      {formatDate(day)}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="day-form-modal__close"
                  onClick={runClose}
                  aria-label="Cerrar"
                >
                  <CloseIcon />
                </button>
              </header>

              <div className="day-form-modal__content">
                <div className="day-field-group">
                  <label className="day-field">
                    <span className="day-field__label">TÍTULO DE LA TAREA</span>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="Ej: Responder correos"
                      autoFocus
                    />
                  </label>
                </div>

                <div className="day-composer__group">
                  <p className="day-field__label">PRIORIDAD</p>
                  <div className="day-chip-group" role="group" aria-label="Prioridad de tarea" data-variant="priority">
                    {TASK_PRIORITY_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={clsx('day-chip', form.priority === option.value && 'is-active')}
                        data-priority={option.value}
                        onClick={() => setForm((prev) => ({ ...prev, priority: option.value }))}
                      >
                        <span className="day-chip__label">{option.label}</span>
                        <span className="day-chip__hint">{option.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="day-composer__group">
                  <p className="day-field__label">REPETICIÓN</p>
                  <div className="day-repeat-options" role="group" aria-label="Repetición de tarea">
                    {REPEAT_MODE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={clsx('day-repeat-option', form.repeatMode === option.value && 'is-active')}
                        onClick={() => handleRepeatModeChange(option.value)}
                      >
                        <span>{option.label}</span>
                        <small>{option.hint}</small>
                      </button>
                    ))}
                  </div>
                  {form.repeatMode !== 'none' && (
                    <div className="day-repeat-settings">
                      <label className="day-field day-field--inline">
                        <span className="day-field__label">Intervalo</span>
                        <div className="day-field__control">
                          <input
                            type="number"
                            min={1}
                            value={form.repeatInterval}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                repeatInterval: Math.max(1, Number(event.target.value) || 1),
                              }))
                            }
                          />
                          <span className="day-field__suffix">
                            {form.repeatMode === 'daily' ? 'días' : 'semanas'}
                          </span>
                        </div>
                      </label>
                      {form.repeatMode === 'weekly' && (
                        <div className="day-weekdays" role="group" aria-label="Días de la semana">
                          {WEEKDAY_OPTIONS.map((weekday) => (
                            <button
                              key={weekday.value}
                              type="button"
                              className={clsx(
                                'day-weekday',
                                form.repeatWeekdays.includes(weekday.value) && 'is-active',
                              )}
                              onClick={() => handleWeekdayToggle(weekday.value)}
                              aria-pressed={form.repeatWeekdays.includes(weekday.value)}
                              title={weekday.title}
                            >
                              {weekday.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="day-composer__group">
                  <div className="day-notifications-header">
                    <p className="day-field__label">NOTIFICACIONES</p>
                    <button
                      type="button"
                      onClick={handleAddNotification}
                      className="day-form-modal__btn day-form-modal__btn--ghost day-form-modal__btn--small"
                    >
                      + Agregar
                    </button>
                  </div>
                  {form.notifications.length === 0 ? (
                    <p className="day-notifications-empty">
                      Sin notificaciones configuradas
                    </p>
                  ) : (
                    <div className="day-notifications-list">
                      {form.notifications.map((notif, index) => (
                        <div key={index} className="day-notification-item">
                          <label className="day-field day-field--inline day-field--notification">
                            <span className="day-field__label">Notificar</span>
                            <div className="day-field__control">
                              <input
                                type="number"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                min={0}
                                step={1}
                                value={notif.minutesBefore || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const num = val === '' ? 0 : parseInt(val, 10);
                                  if (!isNaN(num) && num >= 0) {
                                    handleNotificationChange(index, num);
                                  }
                                }}
                                placeholder="Minutos antes"
                              />
                              <span className="day-field__suffix">min antes</span>
                            </div>
                          </label>
                          <span className="day-notification-preview">
                            {formatTimeBefore(notif.minutesBefore)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveNotification(index)}
                            className="day-form-modal__btn day-form-modal__btn--ghost day-form-modal__btn--small"
                            aria-label="Eliminar notificación"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <footer className="day-form-modal__footer">
                <button
                  type="button"
                  className="day-form-modal__btn day-form-modal__btn--ghost"
                  onClick={runClose}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="day-form-modal__btn day-form-modal__btn--primary"
                  onClick={handleSave}
                  disabled={!form.title.trim() || saving}
                >
                  {saving ? 'Guardando...' : initialTask ? 'Actualizar' : 'Crear tarea'}
                </button>
              </footer>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return modal;
  return createPortal(modal, document.body);
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12m0-12L6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
