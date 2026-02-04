'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { resetOnboarding, submitOnboarding, type OnboardingPayload } from '@/lib/api/onboarding';

type StepKey = 'context' | 'schedule' | 'struggles' | 'ai' | 'notifications';

const STEPS: StepKey[] = ['context', 'schedule', 'struggles', 'ai', 'notifications'];

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState<StepKey>('context');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mainContext, setMainContext] = useState<'study' | 'work' | 'both' | 'personal_projects' | 'other'>('work');
  const [mainGoal, setMainGoal] = useState('Organizar trabajo / proyectos');
  const [goalNote, setGoalNote] = useState('');
  const [bestSlot, setBestSlot] = useState<'morning' | 'afternoon' | 'evening' | 'unknown'>('afternoon');
  const [focusHours, setFocusHours] = useState<1 | 2 | 3 | 4>(2);
  const [struggles, setStruggles] = useState<
    ('start' | 'focus' | 'prioritization' | 'time_estimation' | 'memory')[]
  >([]);
  const [tone, setTone] = useState<'warm' | 'neutral' | 'direct'>('warm');
  const [intervention, setIntervention] = useState<'low' | 'medium' | 'high'>('medium');
  const [dailyReflection, setDailyReflection] = useState(true);
  const [dailyCheckInEnabled, setDailyCheckInEnabled] = useState(false);
  const [dailyCheckInTime, setDailyCheckInTime] = useState('22:00');
  const [preBlockReminder, setPreBlockReminder] = useState<0 | 5 | 10 | 15>(10);
  const [resetting, setResetting] = useState(false);
  const [introStep, setIntroStep] = useState<0 | 1 | 2 | 3 | 4>(0);

  const progress = useMemo(() => {
    const idx = STEPS.indexOf(step);
    return Math.round(((idx + 1) / STEPS.length) * 100);
  }, [step]);

  const toggleStruggle = (key: (typeof struggles)[number]) => {
    setStruggles((prev) => (prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]));
  };

  const next = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };
  const prev = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const submit = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('agendo_token') : null;
    if (!token) {
      setError('Necesitas estar logueado para guardar tu onboarding.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        profileInfo: {
          mainContext,
          mainGoal: goalNote?.trim() || mainGoal,
          bestPerceivedSlot: bestSlot,
          desiredDailyFocusHours: focusHours,
          struggles,
        },
        goals: {
          weeklyFocusMinutesGoal: focusHours * 7 * 60,
          goalsEnabled: true,
        },
        aiSettings: {
          tone,
          interventionLevel: intervention,
          dailyReflectionQuestionEnabled: dailyReflection,
        },
        notificationPreferences: dailyCheckInEnabled
          ? { preBlockReminderMinutes: preBlockReminder, dailyCheckInReminderTime: dailyCheckInTime }
          : { preBlockReminderMinutes: preBlockReminder },
      };
      await submitOnboarding(payload, token);
      localStorage.removeItem('agendo_onboarding_skip');
      router.replace('/calendario');
    } catch (err: any) {
      setError(err?.message || 'No pudimos guardar tus preferencias.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const body = document.body;
    if (body) body.classList.add('app-bg');
    const timers = [
      setTimeout(() => setIntroStep(1), 1100),
      setTimeout(() => setIntroStep(2), 2300),
      setTimeout(() => setIntroStep(3), 3800), // inicia fade más rápido
      setTimeout(() => setIntroStep(4), 4800), // oculta overlay
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <main className="min-h-screen px-4 py-6 sm:py-8 md:px-8 lg:px-16">
      {introStep < 4 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black"
          style={{ opacity: introStep === 3 ? 0 : 1, transition: 'opacity 1s ease' }}
        >
          <p
            className="text-white font-semibold text-center px-6"
            style={{
              opacity: introStep === 0 ? 1 : 0,
              fontSize: 'clamp(48px, 10vw, 132px)',
              lineHeight: 1.05,
              transform: introStep === 0 ? 'translateY(0)' : 'translateY(40px)',
              transition: 'opacity 0.7s ease, transform 0.7s ease',
            }}
          >
            ¡Hola!
          </p>
          <p
            className="absolute text-white font-semibold text-center px-6"
            style={{
              opacity: introStep === 1 ? 1 : 0,
              fontSize: 'clamp(48px, 10vw, 132px)',
              lineHeight: 1.05,
              transform: introStep === 1 ? 'translateY(0)' : 'translateY(40px)',
              transition: 'opacity 0.7s ease, transform 0.7s ease',
            }}
          >
            Soy Agendo
          </p>
          <p
            className="absolute text-white font-semibold text-center px-6"
            style={{
              opacity: introStep === 2 ? 1 : introStep === 3 ? 0 : 0,
              transform: introStep === 2 ? 'translateY(32px)' : 'translateY(72px)',
              fontSize: 'clamp(36px, 7vw, 96px)',
              lineHeight: 1.08,
              transition: 'opacity 1s ease, transform 0.8s ease',
            }}
          >
            Quiero hacerte algunas preguntas
          </p>
        </div>
      )}
      <div className="mx-auto max-w-4xl space-y-4 pb-12">
        <header className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 backdrop-blur-md">
          <p className="text-xs uppercase tracking-[0.2em] text-white/60">Onboarding</p>
          <div className="mt-2 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-white">Configura tu Agendo en 1 minuto</h1>
            <div className="w-full max-w-[190px] rounded-full bg-white/10 p-1">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-[#7b6cff] to-[#56e1e9]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <p className="mt-1 text-sm text-white/70">
            Personalizamos recomendaciones, IA y notificaciones según tus respuestas.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={resetting}
              onClick={async () => {
                const token = typeof window !== 'undefined' ? localStorage.getItem('agendo_token') : null;
                if (!token) return;
                setResetting(true);
                try {
                  await resetOnboarding(token);
                  localStorage.removeItem('agendo_onboarding_skip');
                  setStep('context');
                } catch (e) {
                  console.error('No se pudo reiniciar el onboarding', e);
                } finally {
                  setResetting(false);
                }
              }}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80 transition hover:border-white/30 hover:bg-white/10 disabled:opacity-50"
            >
              {resetting ? 'Reiniciando...' : 'Rehacer cuestionario'}
            </button>
          </div>
        </header>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
          {step === 'context' && (
            <StepContext
              mainContext={mainContext}
              setMainContext={setMainContext}
              mainGoal={mainGoal}
              setMainGoal={setMainGoal}
              goalNote={goalNote}
              setGoalNote={setGoalNote}
            />
          )}
          {step === 'schedule' && (
            <StepSchedule
              bestSlot={bestSlot}
              setBestSlot={setBestSlot}
              focusHours={focusHours}
              setFocusHours={setFocusHours}
            />
          )}
          {step === 'struggles' && <StepStruggles struggles={struggles} toggleStruggle={toggleStruggle} />}
          {step === 'ai' && (
            <StepAiSettings
              tone={tone}
              setTone={setTone}
              intervention={intervention}
              setIntervention={setIntervention}
              dailyReflection={dailyReflection}
              setDailyReflection={setDailyReflection}
            />
          )}
          {step === 'notifications' && (
            <StepNotifications
              dailyCheckInEnabled={dailyCheckInEnabled}
              setDailyCheckInEnabled={setDailyCheckInEnabled}
              dailyCheckInTime={dailyCheckInTime}
              setDailyCheckInTime={setDailyCheckInTime}
              preBlockReminder={preBlockReminder}
              setPreBlockReminder={setPreBlockReminder}
            />
          )}

          {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

          <div className="mt-6 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              className="text-sm text-white/60 hover:text-white/80"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.setItem(
                    'agendo_onboarding_skip',
                    JSON.stringify({ userId: user?.id ?? 'unknown', ts: Date.now() }),
                  );
                }
                router.replace('/calendario');
              }}
            >
              Saltar por ahora
            </button>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={step === 'context'}
                onClick={prev}
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/80 disabled:opacity-40"
              >
                Atrás
              </button>
              {step === STEPS[STEPS.length - 1] ? (
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting}
                  className="rounded-full border border-white/15 bg-gradient-to-r from-[#7b6cff] to-[#56e1e9] px-5 py-2 text-sm font-semibold text-white shadow-[0_15px_50px_rgba(123,108,255,0.35)] transition hover:-translate-y-0.5 disabled:opacity-60"
                >
                  {submitting ? 'Guardando...' : 'Terminar y continuar'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={next}
                  className="rounded-full border border-white/15 bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                >
                  Siguiente
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function CardGrid({ children }: { children: React.ReactNode }) {
  return <div className="mt-3 grid gap-3 sm:grid-cols-2">{children}</div>;
}

function SelectCard({
  label,
  description,
  active,
  onClick,
}: {
  label: string;
  description?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-3 text-left transition-all ${
        active
          ? 'border-[#7b6cff]/70 bg-[linear-gradient(120deg,rgba(123,108,255,0.25),rgba(86,225,233,0.18))] shadow-[0_12px_40px_rgba(123,108,255,0.35)]'
          : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
      }`}
    >
      <p className="text-sm font-semibold text-white">{label}</p>
      {description && <p className="text-xs text-white/70 leading-relaxed">{description}</p>}
    </button>
  );
}

function StepContext({
  mainContext,
  setMainContext,
  mainGoal,
  setMainGoal,
  goalNote,
  setGoalNote,
}: {
  mainContext: OnboardingPayload['profileInfo']['mainContext'];
  setMainContext: (v: OnboardingPayload['profileInfo']['mainContext']) => void;
  mainGoal: string;
  setMainGoal: (v: string) => void;
  goalNote: string;
  setGoalNote: (v: string) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white">Tu contexto y objetivo</h2>
      <p className="text-sm text-white/70">Con esto ajustamos tono, recordatorios y el tipo de bloques sugeridos.</p>
      <CardGrid>
        {[
          { value: 'study', label: 'Estudio', description: 'Carrera, cursos, exámenes o certificaciones.' },
          { value: 'work', label: 'Trabajo', description: 'Proyectos del día a día, clientes, equipo.' },
          { value: 'both', label: 'Ambos', description: 'Mix de estudio y trabajo con peso similar.' },
          { value: 'personal_projects', label: 'Proyectos personales', description: 'Contenido, side projects, hobbies.' },
          { value: 'other', label: 'Otro', description: 'Algo distinto o flexible.' },
        ].map((opt) => (
          <SelectCard
            key={opt.value}
            label={opt.label}
            description={opt.description}
            active={mainContext === opt.value}
            onClick={() => setMainContext(opt.value as any)}
          />
        ))}
      </CardGrid>

      <h3 className="mt-4 text-sm font-semibold text-white">Objetivo principal usando Agendo</h3>
      <CardGrid>
        {[
          { label: 'Estudiar mejor y ser constante', description: 'Subir horas efectivas y mantener ritmo.' },
          { label: 'Organizar trabajo / proyectos', description: 'Priorizar, planificar y cerrar pendientes.' },
          { label: 'Crear contenido / creatividad', description: 'Espacio para idear, escribir, diseñar.' },
          { label: 'Ordenar vida personal y hábitos', description: 'Rutinas, bienestar y tareas personales.' },
          { label: 'Una mezcla de todo', description: 'Balance entre varias áreas.' },
        ].map((opt) => (
          <SelectCard
            key={opt.label}
            label={opt.label}
            description={opt.description}
            active={mainGoal === opt.label}
            onClick={() => setMainGoal(opt.label)}
          />
        ))}
      </CardGrid>
      <div className="mt-4">
        <label className="text-xs text-white/70">
          Si Agendo te pudiera ayudar con una sola cosa este mes, ¿cuál sería?
          <textarea
            className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none focus:border-[#7b6cff]/60"
            rows={2}
            value={goalNote}
            onChange={(e) => setGoalNote(e.target.value)}
            placeholder="Ej: mantener 3 bloques de concentración por día sin distraerme"
          />
        </label>
      </div>
    </div>
  );
}

function StepSchedule({
  bestSlot,
  setBestSlot,
  focusHours,
  setFocusHours,
}: {
  bestSlot: OnboardingPayload['profileInfo']['bestPerceivedSlot'];
  setBestSlot: (v: OnboardingPayload['profileInfo']['bestPerceivedSlot']) => void;
  focusHours: OnboardingPayload['profileInfo']['desiredDailyFocusHours'];
  setFocusHours: (v: OnboardingPayload['profileInfo']['desiredDailyFocusHours']) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white">Horarios y concentración</h2>
      <p className="text-sm text-white/70">Ajustamos recordatorios y planes según tus horas más vivas.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        {[
          { value: 'morning', label: 'Mañana (7–12)', description: 'Arrancas con energía.' },
          { value: 'afternoon', label: 'Tarde (12–18)', description: 'Mejor rendimiento después del mediodía.' },
          { value: 'evening', label: 'Noche (18–24)', description: 'Foco cuando baja el ruido.' },
          { value: 'unknown', label: 'Depende / no lo sé', description: 'Prefiero que Agendo observe y sugiera.' },
        ].map((opt) => (
          <SelectCard
            key={opt.value}
            label={opt.label}
            description={opt.description}
            active={bestSlot === opt.value}
            onClick={() => setBestSlot(opt.value as any)}
          />
        ))}
      </div>

      <h3 className="mt-4 text-sm font-semibold text-white">Horas de concentración deseadas por día</h3>
      <div className="mt-2 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        {[
          { value: 1, label: '1–2 h', description: 'Impulso corto diario.' },
          { value: 2, label: '2–3 h', description: 'Ritmo sostenible.' },
          { value: 3, label: '3–4 h', description: 'Push moderado.' },
          { value: 4, label: '4+ h', description: 'Objetivo intenso.' },
        ].map((opt) => (
          <SelectCard
            key={opt.value}
            label={opt.label}
            description={opt.description}
            active={focusHours === opt.value}
            onClick={() => setFocusHours(opt.value as any)}
          />
        ))}
      </div>
    </div>
  );
}

function StepStruggles({
  struggles,
  toggleStruggle,
}: {
  struggles: OnboardingPayload['profileInfo']['struggles'];
  toggleStruggle: (v: OnboardingPayload['profileInfo']['struggles'][number]) => void;
}) {
  const options = [
    { value: 'start', label: 'Empezar (procrastino)', description: 'Me cuesta arrancar la primera tarea.' },
    { value: 'focus', label: 'Mantener el foco', description: 'Interrupciones o dispersión.' },
    { value: 'prioritization', label: 'Priorizar', description: 'No sé qué va primero.' },
    { value: 'time_estimation', label: 'Estimar tiempo', description: 'Sub/sobreestimo las duraciones.' },
    { value: 'memory', label: 'Recordar pendientes', description: 'Se me escapan cosas importantes.' },
  ];
  return (
    <div>
      <h2 className="text-lg font-semibold text-white">¿Qué te cuesta más?</h2>
      <p className="text-sm text-white/70">Podés elegir varias opciones.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {options.map((opt) => (
            <SelectCard
              key={opt.value}
              label={opt.label}
              description={opt.description}
              active={struggles.includes(opt.value as any)}
              onClick={() => toggleStruggle(opt.value as any)}
            />
          ))}
      </div>
    </div>
  );
}

function StepAiSettings({
  tone,
  setTone,
  intervention,
  setIntervention,
  dailyReflection,
  setDailyReflection,
}: {
  tone: 'warm' | 'neutral' | 'direct';
  setTone: (v: 'warm' | 'neutral' | 'direct') => void;
  intervention: 'low' | 'medium' | 'high';
  setIntervention: (v: 'low' | 'medium' | 'high') => void;
  dailyReflection: boolean;
  setDailyReflection: (v: boolean) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white">¿Cómo querés que se comporte Agendo AI?</h2>
      <p className="text-sm text-white/70">Elegí tono e intervención.</p>
      <h3 className="mt-3 text-sm font-semibold text-white">Tono</h3>
      <div className="mt-2 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {[
          { value: 'warm', label: 'Cálido / cercano', description: 'Mensajes amables y motivadores.' },
          { value: 'neutral', label: 'Neutral / directo', description: 'Al grano, tono equilibrado.' },
          { value: 'direct', label: 'Directo / sin vueltas', description: 'Clarity first, breve y concreto.' },
        ].map((opt) => (
          <SelectCard
            key={opt.value}
            label={opt.label}
            description={opt.description}
            active={tone === opt.value}
            onClick={() => setTone(opt.value as any)}
          />
        ))}
      </div>

      <h3 className="mt-4 text-sm font-semibold text-white">Intervención</h3>
      <div className="mt-2 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {[
          { value: 'low', label: 'Solo cuando yo lo abra', description: 'Control manual, sin interrupciones.' },
          { value: 'medium', label: 'Sugerencias de vez en cuando', description: 'Nudges ligeros y contexto.' },
          { value: 'high', label: 'Proactivo si ve oportunidades', description: 'Recomendaciones frecuentes.' },
        ].map((opt) => (
          <SelectCard
            key={opt.value}
            label={opt.label}
            description={opt.description}
            active={intervention === opt.value}
            onClick={() => setIntervention(opt.value as any)}
          />
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">Pregunta diaria de reflexión</p>
          <p className="text-xs text-white/70">Cierre rápido para aprender de cada día.</p>
        </div>
        <button
          type="button"
          onClick={() => setDailyReflection(!dailyReflection)}
          className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
            dailyReflection
              ? 'border-[#7b6cff]/50 bg-[#7b6cff]/20 text-white'
              : 'border-white/20 bg-white/10 text-white/80'
          }`}
        >
          {dailyReflection ? 'Sí' : 'No'}
        </button>
      </div>
    </div>
  );
}

function StepNotifications({
  dailyCheckInEnabled,
  setDailyCheckInEnabled,
  dailyCheckInTime,
  setDailyCheckInTime,
  preBlockReminder,
  setPreBlockReminder,
}: {
  dailyCheckInEnabled: boolean;
  setDailyCheckInEnabled: (v: boolean) => void;
  dailyCheckInTime: string;
  setDailyCheckInTime: (v: string) => void;
  preBlockReminder: 0 | 5 | 10 | 15;
  setPreBlockReminder: (v: 0 | 5 | 10 | 15) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white">Notificaciones</h2>
      <p className="text-sm text-white/70">Recordatorios ligeros para mantener el ritmo.</p>

      <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Recordar check-in diario</p>
            <p className="text-xs text-white/70">Un toque al final del día para registrar cómo fue.</p>
          </div>
          <button
            type="button"
            onClick={() => setDailyCheckInEnabled(!dailyCheckInEnabled)}
            className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
              dailyCheckInEnabled
                ? 'border-[#56e1e9]/50 bg-[#56e1e9]/15 text-white'
                : 'border-white/20 bg-white/10 text-white/80'
            }`}
          >
            {dailyCheckInEnabled ? 'Sí' : 'No'}
          </button>
        </div>
        {dailyCheckInEnabled && (
          <div className="mt-3">
            <label className="text-xs text-white/70">
              Horario preferido
              <input
                type="time"
                value={dailyCheckInTime}
                onChange={(e) => setDailyCheckInTime(e.target.value)}
                className="mt-1 w-32 rounded-lg border border-white/10 bg-black/30 p-2 text-sm text-white outline-none focus:border-[#7b6cff]/60"
              />
            </label>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
        <p className="text-sm font-semibold text-white">Recordatorios antes de un bloque</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {[0, 5, 10, 15].map((min) => (
            <SelectCard
              key={min}
              label={min === 0 ? 'No' : `Sí, ${min} min antes`}
              description={min === 0 ? 'Sin aviso previo.' : 'Ping breve antes de empezar.'}
              active={preBlockReminder === min}
              onClick={() => setPreBlockReminder(min as 0 | 5 | 10 | 15)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
