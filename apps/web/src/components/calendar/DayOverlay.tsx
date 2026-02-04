'use client';

import { useMemo, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { AccentTone, Day, DayBlock, DayTask } from './CalendarMonth';
import DailyCheckIn from '@/components/DailyCheckIn';
import CompletionModal, { type CompletionTarget } from './CompletionModal';
import type { CompletionFeedback, CompletionPayload } from '@/types/completion';

type RepeatRuleInput = {
  kind: 'daily' | 'weekly' | 'custom';
  interval: number;
  daysOfWeek?: number[];
  endDate?: string;
  count?: number;
};

type BlockPayload = {
  title: string;
  start: string;
  end: string;
  tone: AccentTone;
  repeatRule?: RepeatRuleInput | null;
};

type TaskPayload = {
  title: string;
  priority: 'alta' | 'media' | 'baja';
  repeatRule?: RepeatRuleInput | null;
};

type DeleteOptions = {
  id?: string;
  instanceDate: string;
  scope: 'single' | 'count' | 'all';
  count?: number;
  repeatRule?: RepeatRuleInput | null;
  exceptions?: string[] | null;
  sourceDate?: string | null;
};

type RepeatMode = 'none' | 'daily' | 'weekly';

type BlockFormState = {
  title: string;
  start: string;
  end: string;
  tone: AccentTone;
  repeatMode: RepeatMode;
  repeatInterval: number;
  repeatWeekdays: number[];
};

const BLOCK_TONE_OPTIONS: { value: AccentTone; label: string; hint: string }[] = [
  { value: 'violet', label: 'Profundo', hint: 'Profundidad y foco total' },
  { value: 'turquoise', label: 'Ligero', hint: 'Bloques aireados y flexibles' },
];

const TASK_PRIORITY_OPTIONS: { value: 'alta' | 'media' | 'baja'; label: string; hint: string }[] = [
  { value: 'alta', label: 'Alta', hint: 'Impacto directo' },
  { value: 'media', label: 'Media', hint: 'Carga equilibrada' },
  { value: 'baja', label: 'Baja', hint: 'Mantenimiento liviano' },
];

const REPEAT_MODE_OPTIONS: { value: RepeatMode; label: string; hint: string }[] = [
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

const CHECKIN_MODAL_EXIT_MS = 280;

type DayOverlayProps = {
  day: Day | null;
  onClose: () => void;
  onAddBlock: (dateKey: string, payload: BlockPayload) => Promise<void>;
  onAddTask: (dateKey: string, payload: TaskPayload) => Promise<void>;
  onUpdateNote: (dateKey: string, note: string) => Promise<void>;
  onResetTags: (dateKey: string) => Promise<void>;
  onGenerateTag: (dateKey: string) => Promise<void>;
  onDeleteBlock: (options: DeleteOptions) => Promise<void>;
  onDeleteTask: (options: DeleteOptions) => Promise<void>;
  onCheckInSaved: () => void;
  onCompleteItem: (payload: CompletionPayload) => Promise<CompletionFeedback | null>;
};

export default function DayOverlay({
  day,
  onClose,
  onAddBlock,
  onAddTask,
  onUpdateNote,
  onResetTags,
  onGenerateTag,
  onDeleteBlock,
  onDeleteTask,
  onCheckInSaved,
  onCompleteItem,
}: DayOverlayProps) {
  const [noteDraft, setNoteDraft] = useState('');
  const [blockForm, setBlockForm] = useState<BlockFormState>(() => createBlockForm(day));
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<'alta' | 'media' | 'baja'>('media');
  const [taskRepeatMode, setTaskRepeatMode] = useState<RepeatMode>('none');
  const [taskRepeatInterval, setTaskRepeatInterval] = useState(1);
  const [taskRepeatWeekdays, setTaskRepeatWeekdays] = useState<number[]>([]);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [completionTarget, setCompletionTarget] = useState<CompletionTarget | null>(null);
  const [closing, setClosing] = useState(false);
  const [deletePrompt, setDeletePrompt] = useState<{
    kind: 'block' | 'task';
    item: DayBlock | DayTask;
    repeatRule: RepeatRuleInput | null;
    instanceDate: string;
    baseOptions: Omit<DeleteOptions, 'scope' | 'count'>;
  } | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dateKey = day ? formatDateKey(day.date) : null;
  const formattedDay = useMemo(() => {
    if (!day) return '';
    const base = format(day.date, "EEEE d 'de' MMMM", { locale: es });
    return base.charAt(0).toUpperCase() + base.slice(1);
  }, [day]);

  useEffect(() => {
    // reset closing state when the overlay changes de día
    setClosing(false);
    setCompletionTarget(null);
    setCheckInOpen(false);
    setDeletePrompt(null);
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  }, [day]);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!day) return;
    setNoteDraft(day.detail.note ?? '');
    setBlockForm(createBlockForm(day));
    setTaskTitle('');
    setTaskPriority('media');
    setTaskRepeatMode('none');
    setTaskRepeatInterval(1);
    setTaskRepeatWeekdays([day.date.getDay()]);
  }, [day]);

const runClose = useCallback(() => {
    if (closing) return;
    setCheckInOpen(false);
    setCompletionTarget(null);
    setDeletePrompt(null);
    setClosing(true);
    exitTimerRef.current = setTimeout(() => {
      onClose();
    }, CHECKIN_MODAL_EXIT_MS);
  }, [closing, onClose]);

  if (!day || !dateKey) return null;

  const summaryStats = [
    { label: 'Bloques', value: day.detail.blocks.length },
    { label: 'Tareas', value: day.detail.tasks.length },
    { label: 'Etiquetas', value: day.detail.tags.length },
  ];
  const dayInsights = buildDayInsights(day);
  const dateKeyStr = dateKey;
  const currentDay = day;

  const handleRepeatModeChange = (mode: RepeatMode) => {
    setBlockForm((prev) => {
      const ensureWeekdays =
        mode === 'weekly'
          ? prev.repeatWeekdays.length
            ? prev.repeatWeekdays
            : getDefaultWeekdays(currentDay)
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
    setBlockForm((prev) => {
      const exists = prev.repeatWeekdays.includes(weekday);
      let next = exists ? prev.repeatWeekdays.filter((w) => w !== weekday) : [...prev.repeatWeekdays, weekday];
      if (next.length === 0) {
        next = getDefaultWeekdays(day);
      }
      return { ...prev, repeatWeekdays: next };
    });
  };

  const handleAddBlock = async () => {
    if (!blockForm.title.trim()) return;
    const repeatRule = buildRepeatRuleFromForm(blockForm, currentDay) as RepeatRuleInput | null;
    await onAddBlock(dateKeyStr, {
      title: blockForm.title.trim(),
      start: blockForm.start,
      end: blockForm.end,
      tone: blockForm.tone,
      repeatRule,
    });
    setBlockForm((prev) => ({ ...prev, title: '' }));
  };

  const handleResetTags = async () => {
    await onResetTags(dateKeyStr);
  };

  const handleGenerateTag = async () => {
    await onGenerateTag(dateKeyStr);
  };

  const handleAddTask = async () => {
    if (!taskTitle.trim()) return;
    const repeatRule = buildRepeatRuleFromTaskForm(
      taskRepeatMode,
      taskRepeatInterval,
      taskRepeatWeekdays,
      currentDay,
    ) as RepeatRuleInput | null;
    await onAddTask(dateKeyStr, { title: taskTitle.trim(), priority: taskPriority, repeatRule });
    setTaskTitle('');
    setTaskPriority('media');
    setTaskRepeatMode('none');
    setTaskRepeatInterval(1);
    setTaskRepeatWeekdays([currentDay.date.getDay()]);
  };

  const handleSaveNote = async () => {
    await onUpdateNote(dateKeyStr, noteDraft.trim());
  };

  const handleDeleteBlock = async (block: DayBlock) => {
    if (!block.id) return;
    const repeatRule = (block.repeatRule as RepeatRuleInput | undefined) ?? null;
    const baseOptions = {
      id: block.id,
      instanceDate: block.instanceDate ?? dateKeyStr,
      repeatRule,
      exceptions: block.repeatExceptions,
      sourceDate: block.sourceDate ?? block.instanceDate ?? dateKeyStr,
    };

    setDeletePrompt({
      kind: 'block',
      item: block,
      repeatRule,
      instanceDate: baseOptions.instanceDate ?? formatDateKey(day?.date ?? new Date()),
      baseOptions,
    });
  };

  const handleDeleteTask = async (task: DayTask) => {
    if (!task.id) return;
    const repeatRule = (task.repeatRule as RepeatRuleInput | undefined) ?? null;
    const baseOptions = {
      id: task.id,
      instanceDate: task.instanceDate ?? dateKeyStr,
      repeatRule,
      exceptions: task.repeatExceptions,
      sourceDate: task.sourceDate ?? task.instanceDate ?? dateKeyStr,
    };

    setDeletePrompt({
      kind: 'task',
      item: task,
      repeatRule,
      instanceDate: baseOptions.instanceDate ?? formatDateKey(day?.date ?? new Date()),
      baseOptions,
    });
  };

  const openCompletionForBlock = (block: DayBlock) => {
    if (!block.id) {
      window.alert('No podemos finalizar este bloque porque falta el identificador.');
      return;
    }
    const targetDate = block.instanceDate ?? dateKey ?? formatDateKey(day?.date ?? new Date());
    setCompletionTarget({
      kind: 'block',
      id: block.id,
      title: block.title,
      subtitle: block.time,
      instanceDate: targetDate,
      accent: (block.accent ?? 'violet') as AccentTone,
    });
  };

  const openCompletionForTask = (task: DayTask) => {
    if (!task.id) return;
    const targetDate = task.instanceDate ?? dateKey ?? formatDateKey(day?.date ?? new Date());
    setCompletionTarget({
      kind: 'task',
      id: task.id,
      title: task.title,
      instanceDate: targetDate,
      accent: (task.accent ?? 'violet') as AccentTone,
    });
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          key={day.date.toISOString()}
          className="day-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: closing ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.33, 1, 0.35, 1] }}
        >
          <motion.div
            className="day-overlay__veil"
            aria-hidden="true"
            onClick={runClose}
            animate={{ opacity: closing ? 0 : 1 }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 1.02, filter: 'blur(12px)', y: 18 }}
            animate={closing ? { opacity: 0, scale: 0.98, filter: 'blur(12px)', y: 18 } : { opacity: 1, scale: 1, filter: 'blur(0px)', y: 0 }}
            exit={{ opacity: 0, scale: 0.98, filter: 'blur(12px)', y: 18 }}
            transition={{ duration: 0.25, ease: [0.33, 1, 0.35, 1] }}
            className="day-pane"
          >
            <div className="day-pane__scroll">
              <header className="day-pane__topbar">
                <span className="day-pane__chip-label">Día seleccionado</span>
                {day.state && (
                  <span className="day-pane__status" data-tone={day.hasCheckIn ? 'turquoise' : 'violet'}>
                    {day.hasCheckIn ? 'Check-in registrado' : 'Pendiente hoy'}
                  </span>
                )}
                <button type="button" className="day-pane__close" onClick={runClose} aria-label="Cerrar panel">
                  <CloseIcon />
                </button>
              </header>

              <div className="day-pane__content">
                <div className="day-pane__head">
                  <h3 className="day-pane__title">{formattedDay}</h3>
                  <p className="day-pane__subtitle">{day.detail.summary}</p>
                </div>

                <section className="day-hint">
                  <p>
                    <strong>Bloques</strong>: espacios con hora de inicio y fin para enfocar sin interrupciones.{' '}
                    <strong>Tareas</strong>: pendientes concretos que podés tachar sin reservar horario.
                  </p>
                </section>

                <button
                  type="button"
                  className="day-pane__primary"
                  onClick={() => {
                    const canOpen = !day.isFuture || day.hasCheckIn;
                    if (!canOpen) return;
                    setCheckInOpen(true);
                  }}
                  disabled={day.isFuture && !day.hasCheckIn}
                  aria-disabled={day.isFuture && !day.hasCheckIn}
                >
                  {day.hasCheckIn
                    ? 'Revisar check-in'
                    : day.isFuture
                      ? 'Check-in disponible el día'
                      : 'Registrar check-in'}
                </button>

                <section className="day-panorama">
                  <p className="day-panorama__label">PANORAMA GENERAL</p>
                  <p className="day-panorama__description">{summaryDescription(day)}</p>
                  <div className="day-panorama__stats">
                    {summaryStats.map((stat) => (
                      <div key={stat.label} className="day-panorama__stat">
                        <span>{stat.label}</span>
                        <strong>{stat.value}</strong>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="day-grid">
                  <DayCard title="Bloques del día">
                    <p className="day-section-hint">
                      Bloques: tramos con inicio y fin para enfocarte sin interrupciones; reservan tiempo y miden foco.
                    </p>
                    <div className="day-agenda">
                      {day.detail.blocks.length ? (
                        day.detail.blocks.map((block) => {
                          const blockTone: AccentTone = (block.accent ?? 'violet') as AccentTone;
                          const blockCompleted = Boolean(block.completed || block.completionFeedback);
                          return (
                            <article key={block.id ?? `${block.title}-${block.time}`} className="day-agenda__item" data-tone={blockTone}>
                              <span className="day-agenda__tone" aria-hidden="true" />
                              {block.repeatRule ? <span className="repeat-badge repeat-badge--floating">Recurrente</span> : null}
                              <div className="day-agenda__content">
                                <div className="day-agenda__time-row">
                                  <p className="day-agenda__time">{block.time}</p>
                                </div>
                                <p className="day-agenda__title">{block.title}</p>
                              </div>
                              <div className="day-agenda__actions">
                                <button
                                  type="button"
                                  className={clsx('finish-btn', blockCompleted && 'is-on')}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openCompletionForBlock(block);
                                  }}
                                  disabled={!block.id || blockCompleted}
                                  aria-label="Finalizar bloque"
                                  data-repeat={block.repeatRule ? 'true' : undefined}
                                >
                                  {blockCompleted ? 'Completo' : 'Completo'}
                                </button>
                                <button type="button" className="day-delete" onClick={() => handleDeleteBlock(block)}>
                                  Eliminar
                                </button>
                              </div>
                            </article>
                          );
                        })
                      ) : (
                        <p className="day-empty">Sin bloques planificados.</p>
                      )}
                    </div>
                    <div className="day-composer" data-variant="block">
                      <div className="day-field-group day-field-group--triple">
                        <label className="day-field">
                          <span className="day-field__label">Título del bloque</span>
                          <input
                            type="text"
                            value={blockForm.title}
                            onChange={(event) => setBlockForm((prev) => ({ ...prev, title: event.target.value }))}
                            placeholder="Ej: Sesión profunda"
                          />
                        </label>
                        <label className="day-field day-field--compact">
                          <span className="day-field__label">Inicio</span>
                          <div className="day-time-input">
                            <input
                              type="time"
                              value={blockForm.start}
                              onChange={(event) => setBlockForm((prev) => ({ ...prev, start: event.target.value }))}
                            />
                          </div>
                        </label>
                        <label className="day-field day-field--compact">
                          <span className="day-field__label">Fin</span>
                          <div className="day-time-input">
                            <input
                              type="time"
                              value={blockForm.end}
                              onChange={(event) => setBlockForm((prev) => ({ ...prev, end: event.target.value }))}
                            />
                          </div>
                        </label>
                      </div>
                      <div className="day-composer__group">
                        <p className="day-field__label">Tipo de bloque</p>
                        <div className="day-chip-group" role="group" aria-label="Tipo de bloque">
                          {BLOCK_TONE_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              className={clsx('day-chip', blockForm.tone === option.value && 'is-active')}
                              data-tone={option.value}
                              onClick={() => setBlockForm((prev) => ({ ...prev, tone: option.value }))}
                            >
                              <span className="day-chip__label">{option.label}</span>
                              <span className="day-chip__hint">{option.hint}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="day-composer__group">
                        <p className="day-field__label">Repetición</p>
                        <div className="day-repeat-options" role="group" aria-label="Configuración de repetición">
                          {REPEAT_MODE_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              className={clsx('day-repeat-option', blockForm.repeatMode === option.value && 'is-active')}
                              onClick={() => handleRepeatModeChange(option.value)}
                            >
                              <span>{option.label}</span>
                              <small>{option.hint}</small>
                            </button>
                          ))}
                        </div>
                        {blockForm.repeatMode !== 'none' ? (
                          <div className="day-repeat-settings">
                            <label className="day-field day-field--inline">
                              <span className="day-field__label">Intervalo</span>
                              <div className="day-field__control">
                                <input
                                  type="number"
                                  min={1}
                                  value={blockForm.repeatInterval}
                                  onChange={(event) =>
                                    setBlockForm((prev) => ({
                                      ...prev,
                                      repeatInterval: Math.max(1, Number(event.target.value) || 1),
                                    }))
                                  }
                                />
                                <span className="day-field__suffix">
                                  {blockForm.repeatMode === 'daily' ? 'días' : 'semanas'}
                                </span>
                              </div>
                            </label>
                            {blockForm.repeatMode === 'weekly' ? (
                              <div className="day-weekdays" role="group" aria-label="Días de la semana">
                                {WEEKDAY_OPTIONS.map((weekday) => (
                                  <button
                                    key={weekday.value}
                                    type="button"
                                    className={clsx(
                                      'day-weekday',
                                      blockForm.repeatWeekdays.includes(weekday.value) && 'is-active',
                                    )}
                                    onClick={() => handleWeekdayToggle(weekday.value)}
                                    aria-pressed={blockForm.repeatWeekdays.includes(weekday.value)}
                                    title={weekday.title}
                                  >
                                    {weekday.label}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="day-composer__actions">
                        <button type="button" className="day-card__action is-primary" onClick={handleAddBlock}>
                          Añadir bloque
                        </button>
                      </div>
                    </div>
                  </DayCard>

                  <DayCard title="Tareas del día">
                    <p className="day-section-hint">
                      Tareas: pendientes concretos que podés marcar como hechos sin reservar horario. Úsalas como
                      checklist rápido.
                    </p>
                    <div className="day-task-list">
                      {day.detail.tasks.length ? (
                        day.detail.tasks.map((task) => {
                          const taskTone: AccentTone = (task.accent ?? 'violet') as AccentTone;
                          const taskCompleted = Boolean(task.done || task.completionFeedback);
                          return (
                            <div
                              key={task.id ?? task.title}
                              className="day-task-line"
                              data-tone={taskTone}
                              data-done={task.done ? 'true' : undefined}
                            >
                              <span className="day-task-line__indicator" aria-hidden="true" />
                              <p className="day-task-line__text">{task.title}</p>
                              <div className="day-task-line__actions">
                                <button
                                  type="button"
                                  className="finish-btn is-ghost"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openCompletionForTask(task);
                                  }}
                                  disabled={!task.id || taskCompleted}
                                  aria-label="Finalizar tarea"
                                >
                                  {taskCompleted ? 'Finalizado' : 'Finalizar'}
                                </button>
                                <button type="button" className="day-delete" onClick={() => handleDeleteTask(task)}>
                                  Eliminar
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="day-empty">Sin tareas asignadas.</p>
                      )}
                    </div>
                    <div className="day-composer" data-variant="task">
                      <div className="day-field-group">
                        <label className="day-field">
                          <span className="day-field__label">Nueva tarea</span>
                          <input
                            type="text"
                            value={taskTitle}
                            onChange={(event) => setTaskTitle(event.target.value)}
                            placeholder="Ej: Responder correos"
                          />
                        </label>
                      </div>
                    <div className="day-composer__group">
                      <p className="day-field__label">Prioridad</p>
                      <div className="day-chip-group" role="group" aria-label="Prioridad de tarea" data-variant="priority">
                        {TASK_PRIORITY_OPTIONS.map((option) => (
                          <button
                              key={option.value}
                              type="button"
                              className={clsx('day-chip', taskPriority === option.value && 'is-active')}
                              data-priority={option.value}
                              onClick={() => setTaskPriority(option.value)}
                            >
                              <span className="day-chip__label">{option.label}</span>
                              <span className="day-chip__hint">{option.hint}</span>
                          </button>
                        ))}
                      </div>
                      <p className="day-field__label mt-2">Repetición</p>
                      <div className="day-repeat-options" role="group" aria-label="Repetición de tarea">
                        {REPEAT_MODE_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={clsx('day-repeat-option', taskRepeatMode === option.value && 'is-active')}
                            onClick={() => setTaskRepeatMode(option.value)}
                          >
                            <span>{option.label}</span>
                            <small>{option.hint}</small>
                          </button>
                        ))}
                      </div>
                      {taskRepeatMode !== 'none' ? (
                        <div className="day-repeat-settings">
                          <label className="day-field day-field--inline">
                            <span className="day-field__label">Intervalo</span>
                            <div className="day-field__control">
                              <input
                                type="number"
                                min={1}
                                value={taskRepeatInterval}
                                onChange={(event) => setTaskRepeatInterval(Math.max(1, Number(event.target.value) || 1))}
                              />
                              <span className="day-field__suffix">
                                {taskRepeatMode === 'daily' ? 'días' : 'semanas'}
                              </span>
                            </div>
                          </label>
                          {taskRepeatMode === 'weekly' ? (
                            <div className="day-weekdays" role="group" aria-label="Días de la semana">
                              {WEEKDAY_OPTIONS.map((weekday) => (
                                <button
                                  key={weekday.value}
                                  type="button"
                                  className={clsx(
                                    'day-weekday',
                                    taskRepeatWeekdays.includes(weekday.value) && 'is-active',
                                  )}
                                  onClick={() => {
                                    const exists = taskRepeatWeekdays.includes(weekday.value);
                                    let next = exists
                                      ? taskRepeatWeekdays.filter((w) => w !== weekday.value)
                                      : [...taskRepeatWeekdays, weekday.value];
                                    if (!next.length) next = [weekday.value];
                                    setTaskRepeatWeekdays(next);
                                  }}
                                  aria-pressed={taskRepeatWeekdays.includes(weekday.value)}
                                  title={weekday.title}
                                >
                                  {weekday.label}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                      <div className="day-composer__actions">
                        <button type="button" className="day-card__action is-primary" onClick={handleAddTask}>
                          Añadir tarea
                        </button>
                      </div>
                    </div>
                  </DayCard>

                  <DayCard title="Nota del día">
                    <textarea
                      className="day-note"
                      value={noteDraft}
                      onChange={(event) => setNoteDraft(event.target.value)}
                      onBlur={handleSaveNote}
                    />
                    <div className="day-note__actions">
                      <button type="button" className="day-card__action is-primary" onClick={handleSaveNote}>
                        Guardar nota
                      </button>
                    </div>
                  </DayCard>

                  <DayCard title="Insights de Agendo">
                    {dayInsights.length ? (
                      <ul className="day-insights">
                        {dayInsights.map((item, idx) => (
                          <li key={idx} className="day-insights__item">
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="day-empty">Aún no hay insights para este día.</p>
                    )}
                  </DayCard>
                </section>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {checkInOpen ? (
          <CheckInModal
            dateKey={dateKeyStr}
            onClose={() => setCheckInOpen(false)}
            onSaved={() => {
              onCheckInSaved();
              setCheckInOpen(false);
            }}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {completionTarget ? (
          <CompletionModal
            key={`${completionTarget.kind}-${completionTarget.id}-${completionTarget.instanceDate}`}
            target={completionTarget}
            onClose={() => setCompletionTarget(null)}
            onSubmit={onCompleteItem}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {deletePrompt ? (
          <DeleteRepeatingModal
            key={`${deletePrompt.kind}-${deletePrompt.instanceDate}-${deletePrompt.item.id}`}
            prompt={deletePrompt}
            onCancel={() => setDeletePrompt(null)}
            onConfirm={async (scope, count) => {
              if (deletePrompt.kind === 'block') {
                await onDeleteBlock({ ...deletePrompt.baseOptions, scope, count });
              } else {
                await onDeleteTask({ ...deletePrompt.baseOptions, scope, count });
              }
              setDeletePrompt(null);
            }}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}

type DayCardProps = {
  title: string;
  children: ReactNode;
};

function DayCard({ title, children }: DayCardProps) {
  return (
    <section className="day-card">
      <div className="day-card__header">
        <p className="day-card__title">{title}</p>
      </div>
      <div className="day-card__body">{children}</div>
    </section>
  );
}

function CheckInModal({
  dateKey,
  onClose,
  onSaved,
}: {
  dateKey: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [closing, setClosing] = useState(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    document.body.classList.add('checkin-overlay-open');
    document.documentElement.classList.add('checkin-overlay-open');
    return () => {
      document.body.classList.remove('checkin-overlay-open');
      document.documentElement.classList.remove('checkin-overlay-open');
    };
  }, []);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, []);

  const runClose = useCallback(
    (callback: () => void) => {
      if (closing) return;
      setClosing(true);
      exitTimerRef.current = setTimeout(() => {
        callback();
      }, CHECKIN_MODAL_EXIT_MS);
    },
    [closing],
  );

  const handleDismiss = useCallback(() => runClose(onClose), [runClose, onClose]);
  const handleSaved = useCallback(() => runClose(onSaved), [runClose, onSaved]);

  return (
    <motion.div
      className="day-form-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: closing ? 0 : 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="day-form__backdrop"
        onClick={handleDismiss}
        initial={{ opacity: 0 }}
        animate={{ opacity: closing ? 0 : 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        className="day-checkin-modal"
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={closing ? { opacity: 0, scale: 0.95, y: 30 } : { opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 30 }}
      >
        <DailyCheckIn initialDate={dateKey} inline onClose={handleDismiss} onSaved={handleSaved} />
      </motion.div>
    </motion.div>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12m0-12L6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function createBlockForm(day: Day | null): BlockFormState {
  return {
    title: '',
    start: '09:00',
    end: '10:00',
    tone: 'violet',
    repeatMode: 'none',
    repeatInterval: 1,
    repeatWeekdays: getDefaultWeekdays(day),
  };
}

function getDefaultWeekdays(day: Day | null) {
  const fallback = new Date().getDay();
  if (!day) return [fallback];
  return [day.date.getDay()];
}

function buildRepeatRuleFromForm(form: BlockFormState, day: Day | null): RepeatRuleInput | null {
  if (form.repeatMode === 'none') return null;
  const interval = Math.max(1, form.repeatInterval || 1);
  if (form.repeatMode === 'daily') {
    return { kind: 'daily', interval };
  }
  const weekdays = form.repeatWeekdays.length ? form.repeatWeekdays : getDefaultWeekdays(day);
  return { kind: 'weekly', interval, daysOfWeek: weekdays };
}

function buildRepeatRuleFromTaskForm(mode: RepeatMode, interval: number, weekdays: number[], day: Day | null) {
  if (mode === 'none') return null;
  const safeInterval = Math.max(1, interval || 1);
  if (mode === 'daily') return { kind: 'daily', interval: safeInterval };
  const days = weekdays.length ? weekdays : getDefaultWeekdays(day);
  return { kind: 'weekly', interval: safeInterval, daysOfWeek: days };
}

function summaryDescription(day: Day) {
  if (day.hasCheckIn) {
    if (day.isToday) return 'Registro de hoy completado. Revisalo cuando quieras.';
    return 'Dia con check-in registrado e insights disponibles.';
  }
  switch (day.state) {
    case 'today':
      return 'Organiza bloques, tareas y nota sin generar check-in.';
    case 'past-no-checkin':
      return 'Pendiente registrar check-in para desbloquear insights.';
    case 'future-empty':
      return 'Planifica tu futuro inmediato con calma y aire.';
    default:
      return 'Agenda lista para completar check-in adelantado.';
  }
}

function formatDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildDayInsights(day: Day): string[] {
  const insights: string[] = [];
  const completedBlocks = day.detail.blocks.filter((b) => b.completed || b.completionFeedback).length;
  const completedTasks = day.detail.tasks.filter((t) => t.done || t.completionFeedback).length;

  if (day.hasCheckIn) {
    insights.push('Check-in listo. Revisa qué ayudó y qué interrumpió el día.');
  } else if (!day.isFuture) {
    insights.push('Registra tu check-in para generar mejores recomendaciones.');
  }

  if (day.detail.blocks.length > 0) {
    if (completedBlocks > 0) {
      insights.push(`Cerraste ${completedBlocks} bloque${completedBlocks === 1 ? '' : 's'} hoy. Agenda el siguiente antes de terminar.`);
    } else if (!day.isFuture) {
      insights.push('Tienes bloques sin cerrar. Decide si los ajustas o los marcas como completos.');
    }
  }

  if (day.detail.tasks.length > 0) {
    if (completedTasks > 0) {
      insights.push(`Completaste ${completedTasks} tarea${completedTasks === 1 ? '' : 's'}. Define la prioridad de mañana ahora.`);
    } else if (!day.isFuture) {
      insights.push('Sin tareas cerradas. Cierra una prioridad antes de finalizar el día.');
    }
  }

  if (!day.detail.blocks.length && !day.detail.tasks.length) {
    insights.push(day.isFuture ? 'Agenda un bloque corto para mantener ritmo.' : 'Día ligero: repaso o descanso activo.');
  }

  if (day.detail.tags.length > 0) {
    insights.push('Etiquetas listas. Úsalas para detectar patrones en tu semana.');
  }

  return insights;
}

function DeleteRepeatingModal({
  prompt,
  onCancel,
  onConfirm,
}: {
  prompt: {
    kind: 'block' | 'task';
    item: DayBlock | DayTask;
    repeatRule: RepeatRuleInput | null;
    instanceDate: string;
    baseOptions: Omit<DeleteOptions, 'scope' | 'count'>;
  };
  onCancel: () => void;
  onConfirm: (scope: DeleteOptions['scope'], count?: number) => Promise<void>;
}) {
  const hasRepeat = Boolean(prompt.repeatRule);
  const [scope, setScope] = useState<DeleteOptions['scope']>(hasRepeat ? 'single' : 'single');
  const [count, setCount] = useState(3);

  const modal = (
    <motion.div
      className="confirm-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <motion.div
        className="confirm-sheet"
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        role="dialog"
        aria-modal="true"
        aria-label="Confirmar eliminación"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel();
        }}
        >
        <header className="confirm-head">
          <p className="confirm-title">
            {hasRepeat ? 'Eliminar elemento recurrente' : 'Eliminar elemento'}
          </p>
          <p className="confirm-sub">
            {hasRepeat
              ? 'Seleccioná el alcance de la eliminación. No afecta otras fechas fuera de la serie.'
              : 'Esta acción elimina la ocurrencia seleccionada.'}
          </p>
        </header>
        {hasRepeat ? (
          <>
            <div className="confirm-options">
              <button
                type="button"
                className={clsx('confirm-chip', scope === 'single' && 'is-active')}
                onClick={() => setScope('single')}
              >
                Solo esta ocurrencia
              </button>
              <button
                type="button"
                className={clsx('confirm-chip', scope === 'count' && 'is-active')}
                onClick={() => setScope('count')}
              >
                Próximas N
              </button>
              <button
                type="button"
                className={clsx('confirm-chip', scope === 'all' && 'is-active')}
                onClick={() => setScope('all')}
              >
                Todas las repeticiones
              </button>
            </div>
            {scope === 'count' ? (
              <div className="confirm-count">
                <label>
                  Número de ocurrencias
                  <input
                    type="number"
                    min={1}
                    value={count}
                    onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
                  />
                </label>
              </div>
            ) : null}
          </>
        ) : (
          <p className="confirm-sub">Esta acción no se puede deshacer.</p>
        )}
        <div className="confirm-actions">
          <button type="button" className="confirm-btn ghost" onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            className="confirm-btn danger"
            onClick={() => onConfirm(scope, scope === 'count' ? count : undefined)}
          >
            Eliminar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  if (typeof document === 'undefined') return modal;
  return createPortal(modal, document.body);
}
