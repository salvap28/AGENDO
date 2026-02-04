'use client';

import { Fragment, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import clsx from 'clsx';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';

type MoodTone = 'LOW' | 'NEUTRAL' | 'GOOD' | 'EXCELLENT';
type StressLevel = 'LOW' | 'MEDIUM' | 'HIGH';
type FocusArea =
  | 'ESTUDIO'
  | 'TRABAJO'
  | 'SALUD'
  | 'DESCANSO'
  | 'CREATIVIDAD'
  | 'PROYECTO'
  | 'ORDEN'
  | 'SOCIAL';

type FormState = {
  sleepDuration: number | null;
  sleepQuality: number | null;
  energyLevel: number;
  mood: MoodTone | null;
  stress: StressLevel | null;
  focus: FocusArea | null;
};

type CheckInPayload = {
  date: string;
  sleepDuration: number;
  sleepQuality: number;
  energyLevel: number;
  mood: MoodTone;
  stress: StressLevel;
  focus: FocusArea;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SLEEP_PRESETS = [4, 5, 6, 7, 8, 9, 10];
const STRESS_OPTIONS: { value: StressLevel; label: string }[] = [
  { value: 'LOW', label: 'Bajo' },
  { value: 'MEDIUM', label: 'Medio' },
  { value: 'HIGH', label: 'Alto' },
];
const FOCUS_OPTIONS: { value: FocusArea; label: string }[] = [
  { value: 'ESTUDIO', label: 'Estudio' },
  { value: 'TRABAJO', label: 'Trabajo' },
  { value: 'SALUD', label: 'Salud' },
  { value: 'DESCANSO', label: 'Descanso' },
  { value: 'CREATIVIDAD', label: 'Creatividad' },
  { value: 'PROYECTO', label: 'Proyecto' },
  { value: 'ORDEN', label: 'Orden' },
  { value: 'SOCIAL', label: 'Social' },
];
const MOOD_OPTIONS: { value: MoodTone; label: string; tone: string }[] = [
  { value: 'LOW', label: 'Bajo', tone: 'mood-low' },
  { value: 'NEUTRAL', label: 'Neutral', tone: 'mood-neutral' },
  { value: 'GOOD', label: 'Bueno', tone: 'mood-good' },
  { value: 'EXCELLENT', label: 'Excelente', tone: 'mood-excellent' },
];

type DailyCheckInProps = {
  initialDate?: string;
  inline?: boolean;
  onClose?: () => void;
  onSaved?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

type PopoverPosition = {
  top: number;
  left: number;
  origin: string;
};

export default function DailyCheckIn({
  initialDate,
  inline = false,
  onClose,
  onSaved,
  open,
  onOpenChange,
}: DailyCheckInProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [today, setToday] = useState(() => initialDate ?? localISODate());
  const [form, setForm] = useState<FormState>({
    sleepDuration: null,
    sleepQuality: null,
    energyLevel: 3,
    mood: null,
    stress: null,
    focus: null,
  });
  const [energyCommitted, setEnergyCommitted] = useState(true);
  const [energyDragValue, setEnergyDragValue] = useState<number | null>(null);
  const [sleepHours, setSleepHours] = useState(8);
  const [sleepPopover, setSleepPopover] = useState(false);
  const [focusPopover, setFocusPopover] = useState(false);
  const [sleepPopoverPos, setSleepPopoverPos] = useState<PopoverPosition | null>(null);
  const [focusPopoverPos, setFocusPopoverPos] = useState<PopoverPosition | null>(null);
  const sleepTriggerRef = useRef<HTMLButtonElement | null>(null);
  const focusTriggerRef = useRef<HTMLButtonElement | null>(null);
  const sleepPanelRef = useRef<HTMLDivElement | null>(null);
  const focusPanelRef = useRef<HTMLDivElement | null>(null);
  const layerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved'>('idle');
  const [internalCollapsed, setInternalCollapsed] = useState(true);
  const isControlled = typeof open === 'boolean';
  const collapsed = inline ? false : (isControlled ? !open : internalCollapsed);
  const [lastSavedKey, setLastSavedKey] = useState<string | null>(null);

  const setCollapsed = useCallback(
    (value: boolean) => {
      if (inline) return;
      if (isControlled) {
        onOpenChange?.(!value);
      } else {
        setInternalCollapsed(value);
      }
    },
    [inline, isControlled, onOpenChange],
  );

  useEffect(() => {
    if (inline) return;
    const requested = searchParams?.get('checkinDate');
    if (requested && DATE_RE.test(requested)) {
      if (requested !== today) setToday(requested);
      setCollapsed(false);
    }
  }, [searchParams, today, inline, setCollapsed]);

  useEffect(() => {
    if (initialDate && initialDate !== today) {
      setToday(initialDate);
    }
  }, [initialDate, today]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        setNeedsAuth(false);
        setError(null);
        const response = await api.get('/checkins', { params: { date: today } });
        if (!active) return;
        const item = response.data?.item;
        if (item) {
          setForm({
            sleepDuration: item.sleepDuration ?? null,
            sleepQuality: item.sleepQuality ?? null,
            energyLevel: item.energyLevel ?? 3,
            mood: item.mood ?? null,
            stress: item.stress ?? null,
            focus: item.focus ?? null,
          });
          if (
            item.sleepDuration != null &&
            item.sleepQuality != null &&
            item.mood &&
            item.stress &&
            item.focus
          ) {
            if (item.energyLevel != null) setEnergyCommitted(true);
            setSleepHours(item.sleepDuration);
            setLastSavedKey(
              serializePayload({
                date: today,
                sleepDuration: item.sleepDuration,
                sleepQuality: item.sleepQuality,
                energyLevel: item.energyLevel ?? 3,
                mood: item.mood,
                stress: item.stress,
                focus: item.focus,
              }),
            );
          }
        }
      } catch (err: any) {
        if (!active) return;
        if (err?.response?.status === 401) {
          setNeedsAuth(true);
        } else if (err?.request && !err?.response) {
          setError('No pudimos conectar con el servidor. Verificá tu conexión.');
        } else {
          setError('No pudimos cargar tu check-in.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [today]);

  useEffect(() => {
    if (inline || initialDate) return;
    const syncToday = () => {
      setToday((prev) => {
        const current = localISODate();
        return current === prev ? prev : current;
      });
    };
    const intervalId = window.setInterval(syncToday, 60 * 1000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [inline, initialDate]);

  useEffect(() => {
    if (inline) return;
    const body = document.body;
    const root = document.documentElement;
    if (!body) return;
    if (!collapsed) {
      body.classList.add('checkin-overlay-open');
      root.classList.add('checkin-overlay-open');
    } else {
      body.classList.remove('checkin-overlay-open');
      root.classList.remove('checkin-overlay-open');
    }
    return () => {
      body.classList.remove('checkin-overlay-open');
      root.classList.remove('checkin-overlay-open');
    };
  }, [collapsed, inline]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as Node;
      if (sleepPopover && sleepPanelRef.current?.contains(target)) return;
      if (focusPopover && focusPanelRef.current?.contains(target)) return;
      setSleepPopover(false);
      setFocusPopover(false);
    };
    if (sleepPopover || focusPopover) {
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }
  }, [sleepPopover, focusPopover]);

  const ready =
    form.sleepDuration != null &&
    form.sleepQuality != null &&
    form.mood &&
    form.stress &&
    form.focus &&
    energyCommitted;

  const payload: CheckInPayload | null = useMemo(() => {
    if (!ready) return null;
    return {
      date: today,
      sleepDuration: form.sleepDuration!,
      sleepQuality: form.sleepQuality!,
      energyLevel: form.energyLevel,
      mood: form.mood!,
      stress: form.stress!,
      focus: form.focus!,
    };
  }, [form, ready, today]);

  const currentEnergyValue = energyDragValue !== null ? energyDragValue : form.energyLevel;
  const sliderFill = useMemo(() => {
    const value = energyDragValue !== null ? energyDragValue : form.energyLevel;
    return `${((value - 1) / 4) * 100}%`;
  }, [energyDragValue, form.energyLevel]);

  // Función para animar suavemente al valor redondeado
  const animateToSnappedValue = useCallback((startValue: number, targetValue: number) => {
    if (Math.abs(startValue - targetValue) < 0.01) {
      // Ya está en el valor objetivo
      setEnergyDragValue(null);
      setForm((prev) => ({ ...prev, energyLevel: targetValue }));
      setEnergyCommitted(true);
      return;
    }

    const startTime = performance.now();
    const duration = 400; // ms
    const distance = targetValue - startValue;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing suave (ease-out-cubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + distance * eased;

      setEnergyDragValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Animación completa
        setEnergyDragValue(null);
        setForm((prev) => ({ ...prev, energyLevel: targetValue }));
        setEnergyCommitted(true);
      }
    };

    requestAnimationFrame(animate);
  }, []);

  const summaryText = useMemo(() => {
    if (!payload) return 'Seleccioná tus parámetros clave';
    return `${formatDuration(payload.sleepDuration)} · Energía ${payload.energyLevel}/5 · Foco ${focusLabel(
      payload.focus,
    )}`;
  }, [payload]);
  const displayDate = useMemo(() => new Date(`${today}T00:00:00`), [today]);

  const canSave = !saving;

  const savePayload = async (body: CheckInPayload) => {
    const currentDate = localISODate();
    const hasQueryDate = !!searchParams?.get('checkinDate');
    const liveMode = !inline && !initialDate && !hasQueryDate;
    const targetDate = liveMode ? currentDate : today;
    if (liveMode && targetDate !== today) setToday(targetDate);
    const payloadToSave = { ...body, date: targetDate };
    setSaving(true);
    try {
      await api.put('/checkins', payloadToSave);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('agendo:checkin-saved', { detail: { date: payloadToSave.date } }));
      }
      setLastSavedKey(serializePayload(payloadToSave));
      setStatus('saved');
      if (inline) {
        onSaved?.();
      } else {
        setCollapsed(true);
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setNeedsAuth(true);
        setError('Tu sesión expiró. Iniciá sesión para guardar tus valores.');
      } else if (err?.request && !err?.response) {
        setError('No pudimos conectar con el servidor. Verificá tu conexión.');
      } else {
        setError('No pudimos guardar tu check-in.');
      }
      throw err;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (status !== 'saved') return;
    const id = setTimeout(() => setStatus('idle'), 3000);
    return () => clearTimeout(id);
  }, [status]);

  const updateSleepPopoverPosition = useCallback(() => {
    if (!sleepTriggerRef.current || !sleepPanelRef.current) return;
    const pos = measurePopover(sleepTriggerRef.current, sleepPanelRef.current, layerRef.current);
    if (pos) setSleepPopoverPos(pos);
  }, []);

  const updateFocusPopoverPosition = useCallback(() => {
    if (!focusTriggerRef.current || !focusPanelRef.current) return;
    const pos = measurePopover(focusTriggerRef.current, focusPanelRef.current, layerRef.current);
    if (pos) setFocusPopoverPos(pos);
  }, []);

  useLayoutEffect(() => {
    if (!sleepPopover) return;
    updateSleepPopoverPosition();
    const handler = () => updateSleepPopoverPosition();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [sleepPopover, updateSleepPopoverPosition]);

  useLayoutEffect(() => {
    if (!focusPopover) return;
    updateFocusPopoverPosition();
    const handler = () => updateFocusPopoverPosition();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [focusPopover, updateFocusPopoverPosition]);

  const openSleepPopover = () => {
    setFocusPopover(false);
    if (sleepPopover) {
      setSleepPopover(false);
      setSleepPopoverPos(null);
      return;
    }
    setSleepPopover(true);
    setSleepPopoverPos(null);
  };

  const openFocusPopover = () => {
    setSleepPopover(false);
    if (focusPopover) {
      setFocusPopover(false);
      setFocusPopoverPos(null);
      return;
    }
    setFocusPopover(true);
    setFocusPopoverPos(null);
  };

  const handleSaveClick = () => {
    if (needsAuth) {
      const from = encodeURIComponent(pathname || '/');
      router.push(`/acceso?from=${from}`);
      return;
    }
    if (!payload) {
      setError('Completá todas las respuestas del check-in para guardar.');
      return;
    }
    if (serializePayload(payload) === lastSavedKey) {
      setError('No hay cambios para guardar.');
      return;
    }
    savePayload(payload).catch(() => {});
  };


  return (
    <Fragment>
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            ref={layerRef}
            className={clsx('checkin-layer', inline && 'is-inline')}
            initial={inline ? false : { opacity: 0, scale: 0.96, y: 24 }}
            animate={inline ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={inline ? undefined : { opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.28, ease: [0.45, 0, 0.55, 1] }}
          >
            {!inline && (
              <motion.div
                className="checkin-backdrop"
                onClick={() => setCollapsed(true)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            )}
            <article className="checkin-panel" data-loading={loading || undefined}>
            <section className="checkin-block">
              <div className="checkin-label">Sueño</div>
              <p className="checkin-sub">Duración</p>
              <div className="checkin-sleep">
                {SLEEP_PRESETS.map((value) => (
                  <motion.button
                    key={value}
                    className={clsx('chip', form.sleepDuration === value && 'is-active')}
                    onClick={() => {
                      setForm((prev) => ({ ...prev, sleepDuration: value }));
                      setSleepPopover(false);
                    }}
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.15 }}
                  >
                    {formatDuration(value)}
                  </motion.button>
                ))}
                <motion.button
                  ref={sleepTriggerRef}
                  className={clsx('chip', 'chip-ghost', sleepPopover && 'is-active')}
                  onClick={openSleepPopover}
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.15 }}
                >
                  Personalizar
                </motion.button>
              </div>
              <p className="checkin-sub mt-3">Calidad</p>
              <div className="checkin-stars">
                {[1, 2, 3, 4, 5].map((value) => (
                  <StarButton
                    key={value}
                    value={value}
                    active={form.sleepQuality != null && form.sleepQuality >= value}
                    onSelect={() => setForm((prev) => ({ ...prev, sleepQuality: value }))}
                  />
                ))}
              </div>
            </section>

            <section className="checkin-block">
              <div className="checkin-label">Energía actual</div>
              <p className="checkin-sub">Deslizá para medirla</p>
              <div className="checkin-slider" style={{ '--energy-fill': sliderFill } as CSSProperties}>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step="any"
                  value={currentEnergyValue}
                  onInput={(e) => {
                    const val = Number((e.target as HTMLInputElement).value);
                    setEnergyDragValue(val);
                  }}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setEnergyDragValue(val);
                  }}
                  onMouseUp={(e) => {
                    const val = Number(e.currentTarget.value);
                    const snapped = Math.round(val);
                    // Animar suavemente al valor redondeado usando requestAnimationFrame
                    animateToSnappedValue(val, snapped);
                  }}
                  onTouchEnd={(e) => {
                    const val = Number(e.currentTarget.value);
                    const snapped = Math.round(val);
                    // Animar suavemente al valor redondeado usando requestAnimationFrame
                    animateToSnappedValue(val, snapped);
                  }}
                />
                <div className="checkin-slider-scale">
                  {[1, 2, 3, 4, 5].map((n) => {
                    // Calcular la posición del número para alinearlo con el centro del thumb
                    // El contenedor .checkin-slider tiene padding: 26px 32px 22px
                    // El input range ocupa el 100% del ancho del contenedor (incluyendo el padding)
                    // El thumb tiene 26px de ancho, su centro está a 13px desde su borde izquierdo
                    // Para valores 1-5, el thumb está en 0%, 25%, 50%, 75%, 100% del track del input
                    // El track del input comienza donde comienza el input (después del padding izquierdo de 32px)
                    const percentage = ((n - 1) / 4) * 100;
                    // El thumb se mueve dentro del input, que tiene width: 100%
                    // La posición del centro del thumb = padding izquierdo (32px) + porcentaje del ancho del input
                    // Como el input tiene width: 100%, el porcentaje se aplica al ancho total del contenedor
                    return (
                      <span
                        key={n}
                        className={clsx('checkin-slider-number', form.energyLevel === n && 'is-active')}
                        style={{
                          position: 'absolute',
                          left: `${percentage}%`,
                        } as CSSProperties}
                      >
                        {n}
                      </span>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="checkin-block">
              <div className="checkin-label">Humor del día</div>
              <div className="checkin-moods">
                {MOOD_OPTIONS.map((m) => (
                  <motion.button
                    key={m.value}
                    className={clsx('mood-pill', form.mood === m.value && 'is-active')}
                    data-tone={m.tone}
                    onClick={() => setForm((prev) => ({ ...prev, mood: m.value }))}
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.15 }}
                  >
                    <span className="mood-label">{m.label}</span>
                  </motion.button>
                ))}
              </div>
            </section>

            <section className="checkin-block">
              <div className="checkin-label">Estrés percibido</div>
              <div className="checkin-stress">
                {STRESS_OPTIONS.map((option) => (
                  <motion.button
                    key={option.value}
                    className={clsx('chip', 'stress-chip', form.stress === option.value && 'is-active')}
                    onClick={() => setForm((prev) => ({ ...prev, stress: option.value }))}
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.15 }}
                  >
                    {option.label}
                  </motion.button>
                ))}
              </div>
            </section>
            <section className="checkin-block">
              <div className="checkin-label">Foco del día</div>
              <div className="checkin-focus">
                <motion.button
                  ref={focusTriggerRef}
                  className={clsx('focus-trigger', form.focus && 'has-value')}
                  onClick={openFocusPopover}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ scale: 1.01 }}
                  aria-expanded={focusPopover}
                  aria-haspopup="dialog"
                >
                  <span>{form.focus ? focusLabel(form.focus) : 'Elegí el foco del día'}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M6 9l6 6 6-6"
                      stroke="rgba(255,255,255,0.72)"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </motion.button>
              </div>
            </section>

            {error && <p className="checkin-error">{error}</p>}
            {needsAuth && (
              <p className="checkin-hint">
                Iniciá sesión para guardar tus valores diarios y mantener la coherencia de tu check-in.
              </p>
            )}

            <button
              className="checkin-save"
              disabled={!canSave && !needsAuth}
              onClick={handleSaveClick}
            >
              {needsAuth ? 'Iniciá sesión para guardar' : saving ? 'Guardando…' : 'Guardar check-in'}
            </button>
          </article>

          <AnimatePresence>
            {sleepPopover && (
              <motion.div
                className="mini-panel"
                style={
                  sleepPopoverPos
                    ? {
                        top: sleepPopoverPos.top,
                        left: sleepPopoverPos.left,
                        transformOrigin: sleepPopoverPos.origin,
                      }
                    : { top: 0, left: 0, opacity: 0, pointerEvents: 'none', visibility: 'hidden' }
                }
                ref={sleepPanelRef}
                initial={{ opacity: 0, scale: 0.96, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -6 }}
                transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
              >
                <h4>Horas personalizadas</h4>
                <div className="sleep-display">{formatDuration(sleepHours)}</div>
                <input
                  className="sleep-slider"
                  type="range"
                  min={0}
                  max={12}
                  step={0.25}
                  value={sleepHours}
                  onChange={(e) => setSleepHours(Number(e.target.value))}
                />
                <button
                  className="chip apply-btn"
                  onClick={() => {
                    const hours = clamp(Number(sleepHours) || 0, 0, 24);
                    setForm((prev) => ({ ...prev, sleepDuration: hours }));
                    setSleepPopover(false);
                  }}
                  type="button"
                >
                  Aplicar
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {focusPopover && (
              <motion.div
                className="mini-panel focus"
                style={
                  focusPopoverPos
                    ? {
                        top: focusPopoverPos.top,
                        left: focusPopoverPos.left,
                        transformOrigin: focusPopoverPos.origin,
                      }
                    : { top: 0, left: 0, opacity: 0, pointerEvents: 'none', visibility: 'hidden' }
                }
                ref={focusPanelRef}
                initial={{ opacity: 0, scale: 0.94, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: -8 }}
                transition={{ duration: 0.18, ease: [0.35, 0.7, 0, 1] }}
              >
                <h4>Elegí tu foco</h4>
                <div className="focus-grid">
                  {FOCUS_OPTIONS.map((option) => (
                    <motion.button
                      key={option.value}
                      className={clsx('focus-option', form.focus === option.value && 'is-active')}
                      onClick={() => {
                        setForm((prev) => ({ ...prev, focus: option.value }));
                        setFocusPopover(false);
                      }}
                      whileTap={{ scale: 0.96 }}
                      whileHover={{ scale: 1.01 }}
                      aria-pressed={form.focus === option.value}
                      type="button"
                    >
                      {option.label}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
      </AnimatePresence>

      {!inline && collapsed && (
        <div className="checkin-entry is-collapsed">
          <button
            className={clsx('checkin-summary', !lastSavedKey && 'checkin-summary--pulse')}
            onClick={() => setCollapsed(false)}
          >
            <div className="checkin-summary-lines">
              <p className="checkin-summary-label">
                <span className="checkin-summary-check" aria-hidden="true">
                  <svg width="12" height="10" viewBox="0 0 12 10" aria-hidden="true" focusable="false">
                    <path d="M1 5l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {lastSavedKey ? 'Check-in diario completo' : 'Check-in pendiente'}
              </p>
            </div>
            <span className="checkin-summary-action">{lastSavedKey ? 'Editar' : 'Registrar'}</span>
          </button>
        </div>
      )}

    </Fragment>
  );
}

function StarButton({
  active,
  value,
  onSelect,
}: {
  active: boolean;
  value: number;
  onSelect: () => void;
}) {
  const id = useId();
  const gradientId = `${id}-${value}`;
  return (
    <button
      className={clsx('star-btn', active && 'is-active')}
      onClick={onSelect}
      aria-label={`Calidad ${value}`}
      type="button"
    >
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8E7CFF" />
            <stop offset="100%" stopColor="#B68CFF" />
          </linearGradient>
        </defs>
        <path
          d="M14 4.5L16.8472 10.6303L23.5 11.5939L18.75 16.2097L19.9146 22.9061L14 19.7L8.08535 22.9061L9.25 16.2097L4.5 11.5939L11.1528 10.6303L14 4.5Z"
          stroke="rgba(255,255,255,0.8)"
          strokeWidth="1.6"
          fill={active ? `url(#${gradientId})` : 'transparent'}
        />
      </svg>
    </button>
  );
}

function formatDuration(hours: number) {
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  if (minutes === 0) return `${whole}h`;
  return `${whole}h ${minutes}m`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function focusLabel(value: FocusArea) {
  return FOCUS_OPTIONS.find((f) => f.value === value)?.label ?? value;
}

function localISODate() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function serializePayload(payload: CheckInPayload) {
  return JSON.stringify(payload);
}

function measurePopover(
  trigger: HTMLElement | null,
  panel: HTMLElement | null,
  container: HTMLElement | null,
): PopoverPosition | null {
  if (!trigger || !panel || !container) return null;
  const margin = 12;
  const triggerRect = trigger.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const scrollTop = container.scrollTop;
  const scrollLeft = container.scrollLeft;
  const availableAbove = triggerRect.top - containerRect.top;
  const preferAbove = availableAbove >= panelRect.height + margin;

  let top = preferAbove
    ? triggerRect.top - panelRect.height - margin
    : triggerRect.bottom + margin;

  // Clamp within container vertical bounds
  const maxTop = containerRect.bottom - panelRect.height - margin;
  const minTop = containerRect.top + margin;
  if (top < minTop) top = minTop;
  if (top > maxTop) top = maxTop;

  let left = triggerRect.left + triggerRect.width / 2 - panelRect.width / 2;
  const minLeft = containerRect.left + margin;
  const maxLeft = containerRect.right - panelRect.width - margin;
  if (left < minLeft) left = minLeft;
  if (left > maxLeft) left = maxLeft;

  const topWithScroll = top + scrollTop;
  const leftWithScroll = left + scrollLeft;

  const centerX = triggerRect.left + triggerRect.width / 2 + scrollLeft;
  const originX = clamp(((centerX - leftWithScroll) / panelRect.width) * 100, 0, 100);
  const originY = preferAbove ? 100 : 0;

  return {
    top: topWithScroll - containerRect.top,
    left: leftWithScroll - containerRect.left,
    origin: `${originX}% ${originY}%`,
  };
}

function CloseGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6 6l12 12m0-12L6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}





