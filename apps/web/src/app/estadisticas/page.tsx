'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { fetchOnboardingData } from '@/lib/api/onboarding';
import { getAiSummary } from '@/lib/api/ai';

type StatsResponse = {
  range: { from: string; to: string };
  state: {
    moodAvg: number | null;
    energyAvg: number | null;
    sleepAvg: number | null;
    stress: Record<string, number>;
    focusLeader: string | null;
    dayClassPct: { good: number; neutral: number; bad: number };
  };
  productivity: {
    completionRate: number;
    avgCompletedPerDay: number;
    productiveHour: number | null;
    workdays: { planned: number; completed: number };
    weekend: { planned: number; completed: number };
    bestStreak: number;
    currentCheckInStreak: number;
    bestCheckInStreak: number;
  };
  correlations: {
    sleep_mood: number | null;
    sleep_energy: number | null;
    quality_energy: number | null;
  };
  completionInsights: {
    total: number;
    feelings: Record<string, number>;
    focus: Record<string, number>;
    interruptionRate: number;
    interruptionReasons: Record<string, number>;
    timeDelta: Record<string, number>;
  };
};

type InsightItem = { label: string; value: string; tone?: 'turquoise' | 'violet' | 'neutral' };

export default function StatsPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [goals, setGoals] = useState<{ weeklyFocusMinutesGoal: number; goalsEnabled: boolean } | null>(null);
  const [weeklyFocusMinutes, setWeeklyFocusMinutes] = useState<number>(0);

  const { from, to } = useMemo(() => {
    const today = new Date();
    const end = formatKey(today);
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 13);
    const start = formatKey(startDate);
    return { from: start, to: end };
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const token = typeof window !== 'undefined' ? localStorage.getItem('agendo_token') : null;
        const [statsRes, onboardingData, aiSummary] = await Promise.all([
          api.get('/stats/full', { params: { from, to } }),
          token ? fetchOnboardingData(token).catch(() => null) : Promise.resolve(null),
          getAiSummary().catch(() => null),
        ]);
        
        if (!active) return;
        setStats(statsRes.data);
        
        if (onboardingData?.goals) {
          setGoals({
            weeklyFocusMinutesGoal: onboardingData.goals.weeklyFocusMinutesGoal ?? 0,
            goalsEnabled: onboardingData.goals.goalsEnabled ?? false,
          });
        }
        
        if (aiSummary?.weeklySummary?.totalFocusMinutes) {
          setWeeklyFocusMinutes(aiSummary.weeklySummary.totalFocusMinutes);
        }
        
        setError(null);
      } catch (err: any) {
        if (!active) return;
        setError('No pudimos cargar tus estadísticas.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [from, to]);

  const feelingChips = useMemo(() => buildTopList(stats?.completionInsights.feelings, ['excellent', 'good', 'neutral', 'tired', 'frustrated']), [stats]);
  const focusChips = useMemo(() => buildTopList(stats?.completionInsights.focus), [stats]);
  const interruptionChips = useMemo(() => buildTopList(stats?.completionInsights.interruptionReasons), [stats]);
  const timeDeltaChips = useMemo(() => buildTopList(stats?.completionInsights.timeDelta), [stats]);

  const headerCopy = stats
    ? `Últimos 14 días · ${niceDate(stats.range.from)} — ${niceDate(stats.range.to)}`
    : `Últimos 14 días`;

  const feelingsDist = useMemo(
    () => buildDistribution(stats?.completionInsights.feelings, ['excellent', 'good', 'neutral', 'tired', 'frustrated']),
    [stats],
  );
  const interruptionDist = useMemo(
    () => buildDistribution(stats?.completionInsights.interruptionReasons),
    [stats],
  );
  const focusDist = useMemo(() => buildDistribution(stats?.completionInsights.focus), [stats]);
  const completionGauge = useMemo(() => stats?.productivity.completionRate ?? 0, [stats]);
  
  // Calcular progreso hacia los goals
  const goalProgress = useMemo(() => {
    if (!goals?.goalsEnabled || !goals.weeklyFocusMinutesGoal) return null;
    const progress = Math.min(100, Math.round((weeklyFocusMinutes / goals.weeklyFocusMinutesGoal) * 100));
    return {
      current: weeklyFocusMinutes,
      goal: goals.weeklyFocusMinutesGoal,
      progress,
      remaining: Math.max(0, goals.weeklyFocusMinutesGoal - weeklyFocusMinutes),
    };
  }, [goals, weeklyFocusMinutes]);

  return (
    <main className="stats-stage" style={{ padding: 'clamp(16px, 4vw, 32px)' }}>
      <div className="stats-halo" aria-hidden />
      <header
        className="stats-hero"
        style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start' }}
      >
        <div>
          <p className="stats-kicker">Pulse de tu rutina</p>
          <h1>Estadísticas</h1>
          <p className="stats-sub">{headerCopy}</p>
        </div>
        <div className="stats-hero__badge">
          <span className="dot" />
          {loading ? 'Cargando' : 'Actualizado'}
        </div>
      </header>

      {error ? (
        <div className="stats-card">
          <p className="text-red-200">{error}</p>
        </div>
      ) : null}

      <div
        className="stats-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '12px' }}
      >
        <section className="stats-card">
          <div className="stats-card__head">
            <p className="stats-label">Bienestar</p>
            <span className="stats-pill">Check-ins</span>
          </div>
          <div className="stats-metrics">
            <Metric value={fmtNum(stats?.state.moodAvg)} label="Humor promedio" tone="violet" />
            <Metric value={fmtNum(stats?.state.energyAvg)} label="Energía" />
            <Metric value={stats?.state.sleepAvg ? `${stats.state.sleepAvg.toFixed(1)}h` : '-'} label="Sueño" />
          </div>
          <div className="stats-pct">
            <PctBar label="Días buenos" value={stats?.state.dayClassPct.good ?? 0} tone="good" />
            <PctBar label="Días neutros" value={stats?.state.dayClassPct.neutral ?? 0} tone="neutral" />
            <PctBar label="Días difíciles" value={stats?.state.dayClassPct.bad ?? 0} tone="bad" />
          </div>
        </section>

        <section className="stats-card">
          <div className="stats-card__head">
            <p className="stats-label">Correlaciones</p>
            <span className="stats-pill">Insights</span>
          </div>
          <div className="stats-corr">
            <Corr value={stats?.correlations.sleep_mood} label="Sueño vs. humor" />
            <Corr value={stats?.correlations.sleep_energy} label="Sueño vs. energía" />
            <Corr value={stats?.correlations.quality_energy} label="Calidad vs. energía" />
          </div>
        </section>

        {goalProgress && (
          <section className="stats-card">
            <div className="stats-card__head">
              <p className="stats-label">Progreso semanal</p>
              <span className="stats-pill">Objetivos</span>
            </div>
            <div className="stats-metrics">
              <div className="metric">
                <span className="metric-value" data-tone="turquoise">
                  {Math.round(goalProgress.current / 60)}h
                </span>
                <p className="metric-label">de {Math.round(goalProgress.goal / 60)}h objetivo</p>
              </div>
            </div>
            <div className="stats-meter" style={{ marginTop: '16px' }}>
              <p>Foco semanal</p>
              <div className="meter-track">
                <div 
                  className="meter-fill" 
                  style={{ 
                    width: `${Math.min(100, goalProgress.progress)}%`,
                    background: goalProgress.progress >= 100 
                      ? 'linear-gradient(to right, #56e1e9, #7b6cff)' 
                      : undefined
                  }} 
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                <span className="meter-value">{goalProgress.progress}%</span>
                {goalProgress.remaining > 0 && (
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                    Faltan {Math.round(goalProgress.remaining / 60)}h
                  </span>
                )}
                {goalProgress.remaining <= 0 && (
                  <span style={{ fontSize: '0.75rem', color: '#56e1e9' }}>
                    ¡Meta alcanzada! 🎉
                  </span>
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      <section className="stats-card stats-card--completion stats-card--fullwidth">
        <div className="stats-card__head">
          <p className="stats-label">Feedback de finalización</p>
          <span className="stats-pill">Compleciones</span>
        </div>
        <div className="completion-summary">
          <div className="completion-badge">
            <span className="completion-icon">✨</span>
            <div>
              <span className="completion-count">{stats?.completionInsights.total ?? 0}</span>
              <p className="completion-label">Compleciones registradas</p>
            </div>
          </div>
        </div>
        <div className="completion-charts-vertical">
          <CompletionVerticalChart 
            title="Sensaciones" 
            icon="😊"
            items={feelingChips} 
            total={stats?.completionInsights.total ?? 1}
            color="violet"
          />
          <CompletionVerticalChart 
            title="Foco declarado" 
            icon="🎯"
            items={focusChips} 
            total={stats?.completionInsights.total ?? 1}
            color="teal"
          />
          <CompletionVerticalChart 
            title="Interrupciones" 
            icon="⚠️"
            items={interruptionChips} 
            total={stats?.completionInsights.total ?? 1}
            color="orange"
          />
          <CompletionVerticalChart 
            title="Tiempo vs. expectativa" 
            icon="⏱️"
            items={timeDeltaChips} 
            total={stats?.completionInsights.total ?? 1}
            color="turquoise"
          />
        </div>
        <div className="completion-interruption">
          <div className="interruption-header">
            <span className="interruption-icon">📊</span>
            <div>
              <p className="interruption-title">Tasa de interrupción</p>
              <p className="interruption-subtitle">Porcentaje de tareas interrumpidas</p>
            </div>
          </div>
          <div className="interruption-visual">
            <div className="interruption-meter">
              <div 
                className="interruption-fill" 
                style={{ 
                  width: `${stats?.completionInsights.interruptionRate ?? 0}%`,
                  background: (stats?.completionInsights.interruptionRate ?? 0) > 50
                    ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                    : (stats?.completionInsights.interruptionRate ?? 0) > 25
                    ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                    : 'linear-gradient(90deg, #56e1e9, #7b6cff)'
                }}
              />
            </div>
            <div className="interruption-value">
              <span className="interruption-percentage">{fmtPct(stats?.completionInsights.interruptionRate)}</span>
              <span className="interruption-status">
                {(stats?.completionInsights.interruptionRate ?? 0) < 25 
                  ? 'Excelente' 
                  : (stats?.completionInsights.interruptionRate ?? 0) < 50 
                  ? 'Bueno' 
                  : 'A mejorar'}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div
        className="stats-visuals"
        style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginTop: '12px' }}
      >
        <section className="stats-card stats-card--wide">
          <div className="stats-card__head">
            <p className="stats-label">Visuales rápidas</p>
            <span className="stats-pill">Resumen gráfico</span>
          </div>
          <div className="visual-grid">
            <div className="visual-block">
              <p className="visual-title">Tasa de finalización</p>
              <Donut value={completionGauge} label={fmtPct(completionGauge)} />
              <p className="visual-hint">Meta de 100% de completados planificados.</p>
            </div>
            <div className="visual-block">
              <p className="visual-title">Distribución de sensaciones</p>
              <BarList data={feelingsDist} />
            </div>
            <div className="visual-block">
              <p className="visual-title">Interrupciones más comunes</p>
              <BarList data={interruptionDist} tone="violet" />
            </div>
            <div className="visual-block">
              <p className="visual-title">Foco declarado</p>
              <BarList data={focusDist} tone="turquoise" compact />
            </div>
          </div>
        </section>
      </div>

      {loading && (
        <div className="stats-loading">
          <div className="glow" />
          <p>Cargando datos...</p>
        </div>
      )}
    </main>
  );
}

function Metric({ value, label, tone }: { value: string | number; label: string; tone?: 'turquoise' | 'violet' }) {
  return (
    <div className="metric">
      <span className="metric-value" data-tone={tone}>{value}</span>
      <p className="metric-label">{label}</p>
    </div>
  );
}

function BarBlock({ label, planned = 0, completed = 0 }: { label: string; planned?: number; completed?: number }) {
  const pct = planned ? Math.min(100, Math.round((completed / planned) * 100)) : 0;
  return (
    <div className="barblock">
      <div className="barblock-head">
        <p>{label}</p>
        <span>{completed}/{planned}</span>
      </div>
      <div className="barblock-track">
        <div className="barblock-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function PctBar({ label, value, tone }: { label: string; value: number; tone: 'good' | 'neutral' | 'bad' }) {
  return (
    <div className="pctbar">
      <div className="pctbar-label">
        <span>{label}</span>
        <strong>{value.toFixed(1)}%</strong>
      </div>
      <div className="pctbar-track">
        <div className="pctbar-fill" data-tone={tone} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ChipGroup({ title, items }: { title: string; items: InsightItem[] }) {
  if (!items.length) return null;
  return (
    <div className="chip-group">
      <p className="chip-group__title">{title}</p>
      <div className="chip-group__body">
        {items.map((item) => (
          <span key={item.label} className="insight-chip" data-tone={item.tone ?? 'neutral'}>
            {item.label} <small>{item.value}</small>
          </span>
        ))}
      </div>
    </div>
  );
}

function CompletionChart({ 
  icon, 
  title, 
  items, 
  color,
  total 
}: { 
  icon: string; 
  title: string; 
  items: InsightItem[]; 
  color: 'violet' | 'teal' | 'orange' | 'turquoise';
  total: number;
}) {
  if (!items.length) return null;
  
  // Calcular porcentajes para cada item
  const itemsWithPct = items.map(item => {
    const value = parseInt(item.value) || 0;
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return { ...item, pct, value };
  });
  
  return (
    <div className={`completion-chart completion-chart--${color}`}>
      <div className="completion-chart-header">
        <span className="completion-chart-icon">{icon}</span>
        <p className="completion-chart-title">{title}</p>
      </div>
      <div className="completion-chart-bars">
        {itemsWithPct.map((item, index) => (
          <div key={item.label} className="completion-bar-item">
            <div className="completion-bar-label-row">
              <span className="completion-bar-label">{item.label}</span>
              <span className="completion-bar-count">{item.value}</span>
            </div>
            <div className="completion-bar-track">
              <div 
                className="completion-bar-fill" 
                style={{ 
                  width: `${item.pct}%`,
                  animationDelay: `${index * 0.1}s`
                }}
              />
            </div>
            <span className="completion-bar-pct">{item.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompletionVerticalChart({ 
  icon, 
  title, 
  items, 
  color,
  total 
}: { 
  icon: string; 
  title: string; 
  items: InsightItem[]; 
  color: 'violet' | 'teal' | 'orange' | 'turquoise';
  total: number;
}) {
  if (!items.length) return null;
  
  // Calcular porcentajes y valores para cada item
  const itemsWithData = items.map(item => {
    const value = parseInt(item.value) || 0;
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return { ...item, pct, value };
  });
  
  // Encontrar el valor máximo para escalar las barras
  const maxValue = Math.max(...itemsWithData.map(item => item.value), 1);
  
  return (
    <div className={`completion-vertical-chart completion-vertical-chart--${color}`}>
      <div className="completion-vertical-header">
        <span className="completion-vertical-icon">{icon}</span>
        <p className="completion-vertical-title">{title}</p>
      </div>
      <div className="completion-vertical-bars">
        {itemsWithData.map((item, index) => {
          const barHeight = Math.min(100, (item.value / maxValue) * 100);
          return (
            <div key={item.label} className="completion-vertical-bar-item">
              <div className="completion-vertical-bar-container">
                <div 
                  className="completion-vertical-bar-fill" 
                  style={{ 
                    height: `${barHeight}%`,
                    animationDelay: `${index * 0.1}s`
                  }}
                />
              </div>
              <div className="completion-vertical-bar-label">{item.label}</div>
              <div className="completion-vertical-bar-value">{item.value}</div>
              <div className="completion-vertical-bar-pct">{item.pct}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Corr({ value, label }: { value: number | null | undefined; label: string }) {
  const status = value == null ? 'neutral' : value > 0.3 ? 'positive' : value < -0.3 ? 'negative' : 'neutral';
  const formatted = value == null ? '—' : value.toFixed(2);
  return (
    <div className="corr" data-state={status}>
      <span className="corr-value">{formatted}</span>
      <p className="corr-label">{label}</p>
    </div>
  );
}

function buildTopList(record?: Record<string, number>, order?: string[]) {
  if (!record) return [];
  const entries = Object.entries(record).filter(([, v]) => typeof v === 'number' && v > 0);
  if (order) entries.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  else entries.sort((a, b) => b[1] - a[1]);
  return entries.slice(0, 4).map(([k, v]) => {
    const tone: 'turquoise' | 'violet' | 'neutral' =
      k === 'excellent' || k === 'good' || k === 'yes' || k === 'more'
        ? 'turquoise'
        : k === 'frustrated' || k === 'tired' || k === 'people' || k === 'fatigue' || k === 'less'
        ? 'violet'
        : 'neutral';
    return { label: prettyLabel(k), value: `${v}`, tone };
  });
}

function prettyLabel(key: string) {
  const map: Record<string, string> = {
    excellent: 'Excelente',
    good: 'Bien',
    neutral: 'Neutral',
    tired: 'Cansado',
    frustrated: 'Frustrado',
    yes: 'Sí',
    partial: 'Parcial',
    no: 'No',
    notifications: 'Notificaciones',
    people: 'Gente',
    fatigue: 'Cansancio',
    self: 'Distracciones propias',
    other: 'Otro',
    more: 'Más de lo esperado',
    equal: 'Lo esperado',
    less: 'Menos tiempo',
  };
  return map[key] ?? key;
}

function buildDistribution(record?: Record<string, number>, order?: string[]) {
  if (!record) return [];
  const entries = Object.entries(record).filter(([, v]) => typeof v === 'number' && v > 0);
  if (order) entries.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  else entries.sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((acc, [, v]) => acc + v, 0) || 1;
  return entries.map(([key, value]) => ({
    label: prettyLabel(key),
    pct: Math.round((value / total) * 100),
    raw: value,
    tone: toneForKey(key),
  }));
}

function toneForKey(key: string): 'turquoise' | 'violet' | 'neutral' {
  if (['excellent', 'good', 'yes', 'more', 'notifications', 'self'].includes(key)) return 'turquoise';
  if (['frustrated', 'tired', 'people', 'other', 'fatigue', 'less'].includes(key)) return 'violet';
  return 'neutral';
}

function Donut({ value, label }: { value: number; label: string }) {
  const normalized = Math.max(0, Math.min(100, value));
  const angle = (normalized / 100) * 360;
  const bg = `conic-gradient(rgba(var(--teal-rgb),0.85) 0deg ${angle}deg, rgba(255,255,255,0.08) ${angle}deg 360deg)`;
  return (
    <div className="donut">
      <div className="donut-ring" style={{ background: bg }}>
        <div className="donut-hole">
          <span>{label}</span>
        </div>
      </div>
    </div>
  );
}

function BarList({
  data,
  tone = 'neutral',
  compact = false,
}: {
  data: { label: string; pct: number; tone?: 'turquoise' | 'violet' | 'neutral'; raw?: number }[];
  tone?: 'turquoise' | 'violet' | 'neutral';
  compact?: boolean;
}) {
  if (!data.length) return <p className="stats-sub">Sin datos aún.</p>;
  return (
    <div className={compact ? 'barlist barlist--compact' : 'barlist'}>
      {data.map((item) => {
        const t = item.tone ?? tone;
        return (
          <div key={item.label} className="barlist-row">
            <span>{item.label}</span>
            <div className="barlist-meter">
              <div className="barlist-fill" data-tone={t} style={{ width: `${item.pct}%` }} />
            </div>
            <small>{item.pct}%</small>
          </div>
        );
      })}
    </div>
  );
}

function fmtPct(value?: number | null) {
  if (value == null) return '—';
  return `${value.toFixed(1)}%`;
}

function fmtNum(value?: number | null) {
  if (value == null) return '—';
  return value.toFixed(1);
}

function formatKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function niceDate(key: string) {
  const [y, m, d] = key.split('-').map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}
