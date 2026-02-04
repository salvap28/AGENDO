'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import type {
  CompletionFeeling,
  CompletionPayload,
  FocusState,
  InterruptionReason,
  TimeDelta,
} from '@/types/completion';
import type { AccentTone } from './CalendarMonth';

export type CompletionTarget = {
  kind: 'task' | 'block';
  id: string;
  title: string;
  instanceDate: string;
  accent: AccentTone;
  subtitle?: string;
};

type CompletionModalProps = {
  target: CompletionTarget;
  onClose: () => void;
  onSubmit: (payload: CompletionPayload) => Promise<any>;
};

const FEELING_OPTIONS: { value: CompletionFeeling; label: string; hint: string }[] = [
  { value: 'excellent', label: 'Excelente', hint: 'flujo alto' },
  { value: 'good', label: 'Bien', hint: 'estable' },
  { value: 'neutral', label: 'Normal', hint: 'ok' },
  { value: 'tired', label: 'Cansado', hint: 'baja energía' },
  { value: 'frustrated', label: 'Frustrado', hint: 'bloqueos' },
];

const FOCUS_OPTIONS: { value: FocusState; label: string; hint: string }[] = [
  { value: 'yes', label: 'Sí', hint: 'foco sostenido' },
  { value: 'partial', label: 'Parcial', hint: 'con altibajos' },
  { value: 'no', label: 'No', hint: 'dispersión' },
];

const INTERRUPTION_REASONS: { value: InterruptionReason; label: string }[] = [
  { value: 'notifications', label: 'Notificaciones' },
  { value: 'people', label: 'Gente' },
  { value: 'fatigue', label: 'Cansancio' },
  { value: 'self', label: 'Distracciones propias' },
  { value: 'other', label: 'Otro' },
];

const TIME_DELTAS: { value: TimeDelta; label: string }[] = [
  { value: 'more', label: 'Más de lo esperado' },
  { value: 'equal', label: 'Lo esperado' },
  { value: 'less', label: 'Menos tiempo' },
];

export default function CompletionModal({ target, onClose, onSubmit }: CompletionModalProps) {
  const [feeling, setFeeling] = useState<CompletionFeeling | null>(null);
  const [focus, setFocus] = useState<FocusState | null>(null);
  const [interrupted, setInterrupted] = useState<boolean | null>(null);
  const [reason, setReason] = useState<InterruptionReason | null>(null);
  const [timeDelta, setTimeDelta] = useState<TimeDelta | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showCheck, setShowCheck] = useState(false);
  const [focusables, setFocusables] = useState<HTMLElement[]>([]);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [exitPrompt, setExitPrompt] = useState(false);

  useEffect(() => {
    setFeeling(null);
    setFocus(null);
    setInterrupted(null);
    setReason(null);
    setTimeDelta(null);
    setNote('');
    setError(null);
    setSaved(false);
    setSaving(false);
    setClosing(false);
    setShowCheck(false);
  }, [target]);

  const touched = useMemo(
    () => !!(feeling || focus || timeDelta || note.trim().length || interrupted !== null),
    [feeling, focus, timeDelta, note, interrupted],
  );

  const canSave = Boolean(feeling && focus && timeDelta && interrupted !== null && (!interrupted || reason));

  useEffect(() => {
    document.body.classList.add('completion-sheet-open');
    document.documentElement.classList.add('completion-sheet-open');
    return () => {
      document.body.classList.remove('completion-sheet-open');
      document.documentElement.classList.remove('completion-sheet-open');
    };
  }, []);

  useEffect(() => {
    const node = sheetRef.current;
    if (!node) return;
    const focusable = Array.from(
      node.querySelectorAll<HTMLElement>('button, input, select, textarea, [tabindex]:not([tabindex="-1"])'),
    ).filter((el) => !el.hasAttribute('disabled'));
    setFocusables(focusable);
    if (focusable[0]) focusable[0].focus();
  }, [target]);

  const runClose = useCallback((delay = 240) => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, delay);
  }, [closing, onClose]);

  const handleAttemptClose = useCallback(() => {
    if (touched && !saved) {
      setExitPrompt(true);
      return;
    }
    runClose();
  }, [runClose, saved, touched]);

  const handleSave = async () => {
    if (!canSave) {
      setError('Completá las preguntas obligatorias.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload: CompletionPayload = {
      instanceDate: target.instanceDate,
      feeling: feeling!,
      focus: focus!,
      interrupted: interrupted === true,
      interruptionReason: interrupted ? reason ?? undefined : undefined,
      timeDelta: timeDelta!,
      note: note.trim() ? note.trim() : undefined,
      ...(target.kind === 'task' ? { taskId: target.id } : { blockId: target.id }),
    };
    try {
      await onSubmit(payload);
      setSaved(true);
      setShowCheck(true);
      runClose(420);
    } catch (err) {
      setError('No pudimos guardar tu feedback.');
    } finally {
      setSaving(false);
    }
  };

  const modalContent = (
    <motion.div
      className="completion-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: closing ? 0 : 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="completion-overlay__backdrop"
        onClick={handleAttemptClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: closing ? 0 : 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        className="completion-sheet"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={closing ? { opacity: 0, y: 24, scale: 0.98 } : { opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        drag="y"
        dragElastic={0.12}
        dragConstraints={{ top: 0, bottom: 0 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 80) handleAttemptClose();
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Check-in de finalización"
        ref={sheetRef}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            handleAttemptClose();
          }
          if (event.key === 'Tab' && focusables.length) {
            const currentIndex = focusables.findIndex((el) => el === document.activeElement);
            const direction = event.shiftKey ? -1 : 1;
            const nextIndex = (currentIndex + direction + focusables.length) % focusables.length;
            focusables[nextIndex]?.focus();
            event.preventDefault();
          }
        }}
      >
        <header className="completion-sheet__header">
          <div className="completion-chip" data-tone={target.accent}>
            {target.kind === 'task' ? 'Tarea' : 'Bloque'}
          </div>
          <div className="completion-sheet__title">
            <p>{target.title}</p>
            {target.subtitle ? <span>{target.subtitle}</span> : null}
          </div>
          <button
            type="button"
            className="completion-close"
            onClick={handleAttemptClose}
            aria-label="Cerrar"
          >
            <CloseGlyph />
          </button>
        </header>

        <div className="completion-sheet__body">
          <section className="completion-question">
            <p className="completion-label">¿Cómo te sentiste durante esta tarea/bloque?</p>
            <div className="completion-grid">
              {FEELING_OPTIONS.map((option) => (
                <motion.button
                  key={option.value}
                  type="button"
                  className={clsx('completion-pill', feeling === option.value && 'is-active')}
                  data-tone={option.value}
                  onClick={() => setFeeling(option.value)}
                  whileTap={{ scale: 0.96 }}
                  whileHover={{ scale: 1.01 }}
                >
                  <span className="completion-pill__icon" />
                  <span className="completion-pill__text">
                    {option.label}
                    <small>{option.hint}</small>
                  </span>
                </motion.button>
              ))}
            </div>
          </section>

          <section className="completion-question">
            <p className="completion-label">¿Pudiste mantener el foco?</p>
            <div className="completion-grid" data-columns="3">
              {FOCUS_OPTIONS.map((option) => (
                <motion.button
                  key={option.value}
                  type="button"
                  className={clsx('completion-chip-btn', focus === option.value && 'is-active')}
                  data-tone={option.value}
                  onClick={() => setFocus(option.value)}
                  whileTap={{ scale: 0.96 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <span>{option.label}</span>
                  <small>{option.hint}</small>
                </motion.button>
              ))}
            </div>
          </section>

          <section className="completion-question">
            <p className="completion-label">¿Hubo algo que interrumpió tu flujo?</p>
            <div className="completion-grid" data-columns="2">
              <motion.button
                type="button"
                className={clsx('completion-chip-btn', interrupted === true && 'is-active')}
                data-tone="interrupt-yes"
                onClick={() => setInterrupted(true)}
                whileTap={{ scale: 0.96 }}
                whileHover={{ scale: 1.02 }}
              >
                <span>Sí</span>
                <small>Hubo interrupciones</small>
              </motion.button>
              <motion.button
                type="button"
                className={clsx('completion-chip-btn', interrupted === false && 'is-active')}
                data-tone="interrupt-no"
                onClick={() => {
                  setInterrupted(false);
                  setReason(null);
                }}
                whileTap={{ scale: 0.96 }}
                whileHover={{ scale: 1.02 }}
              >
                <span>No</span>
                <small>Flujo continuo</small>
              </motion.button>
            </div>
            <AnimatePresence>
              {interrupted ? (
                <motion.div
                  className="completion-grid" data-columns="3"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                >
                  {INTERRUPTION_REASONS.map((option) => (
                    <motion.button
                      key={option.value}
                      type="button"
                      className={clsx('completion-chip-btn', reason === option.value && 'is-active')}
                      data-tone={`reason-${option.value}`}
                      onClick={() => setReason(option.value)}
                      whileTap={{ scale: 0.96 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <span>{option.label}</span>
                    </motion.button>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </section>

          <section className="completion-question">
            <p className="completion-label">¿Te llevó más o menos tiempo del esperado?</p>
            <div className="completion-grid" data-columns="3">
              {TIME_DELTAS.map((option) => (
                <motion.button
                  key={option.value}
                  type="button"
                  className={clsx('completion-chip-btn', timeDelta === option.value && 'is-active')}
                  data-tone={`time-${option.value}`}
                  onClick={() => setTimeDelta(option.value)}
                  whileTap={{ scale: 0.96 }}
                  whileHover={{ scale: 1.02 }}
                >
                  {option.label}
                </motion.button>
              ))}
            </div>
          </section>

          <section className="completion-question">
            <p className="completion-label">¿Querés dejar una nota breve?</p>
            <div className="completion-note">
              <input
                type="text"
                maxLength={80}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Mensaje corto para tu yo del futuro (opcional)"
              />
              <span className="completion-note__count">{note.length}/80</span>
            </div>
          </section>

          {error && <p className="completion-error">{error}</p>}
        </div>

        <AnimatePresence>
          {touched ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.18 }}
              className="completion-save__wrap"
            >
              <motion.button
                type="button"
                className="completion-save"
                onClick={handleSave}
                disabled={!canSave || saving}
                whileTap={{ scale: 0.96 }}
                whileHover={{ scale: 1.01 }}
              >
                {saving ? 'Guardando...' : 'Guardar y cerrar'}
              </motion.button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {showCheck ? (
            <motion.div
              className="completion-check"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.24, ease: [0.33, 1, 0.68, 1] }}
            >
              <span className="completion-check__glow" />
              <svg width="28" height="20" viewBox="0 0 28 20" aria-hidden="true">
                <path d="M2 10l7 7L26 3" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
      <AnimatePresence>
        {exitPrompt ? (
          <ExitPrompt
            onCancel={() => setExitPrompt(false)}
            onExit={() => runClose()}
          />
        ) : null}
      </AnimatePresence>
    </motion.div>
  );

  if (typeof document === 'undefined') return modalContent;
  return createPortal(modalContent, document.body);
}

function CloseGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6 6l12 12m0-12L6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ExitPrompt({ onCancel, onExit }: { onCancel: () => void; onExit: () => void }) {
  return (
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
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        role="dialog"
        aria-modal="true"
        aria-label="Salir sin guardar"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="confirm-head">
          <p className="confirm-title">¿Salir sin guardar?</p>
          <p className="confirm-sub">Perderás las respuestas seleccionadas.</p>
        </header>
        <div className="confirm-actions">
          <button type="button" className="confirm-btn ghost" onClick={onCancel}>
            Continuar editando
          </button>
          <button type="button" className="confirm-btn danger" onClick={onExit}>
            Salir sin guardar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
