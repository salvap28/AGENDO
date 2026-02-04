'use client';

import { useEffect, useState } from 'react';
import { AgendoCoachCard } from '@/components/AgendoCoachCard';
import { CoachError } from '@/components/CoachError';
import { CoachLoading } from '@/components/CoachLoading';
import { FocusHeatmap } from '../profile/components/FocusHeatmap';
import type { WeeklyInsightsResponse } from '@/lib/api/coach';
import type { AiSummary } from '@/lib/api/ai';
import { getWeeklyInsights } from '@/lib/api/coach';
import { getAiSummary } from '@/lib/api/ai';

export default function CoachPageClient() {
  const [coachData, setCoachData] = useState<WeeklyInsightsResponse | null>(null);
  const [aiSummary, setAiSummary] = useState<AiSummary | null>(null);
  const [coachStatus, setCoachStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [summaryStatus, setSummaryStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [coachProgress, setCoachProgress] = useState(0);

  useEffect(() => {
    let mounted = true;

    const loadCoach = async () => {
      setCoachStatus('loading');
      try {
        const insights = await getWeeklyInsights();
        if (!mounted) return;
        setCoachData(insights);
        setCoachStatus('loaded');
      } catch {
        if (!mounted) return;
        setCoachStatus('error');
      }
    };

    const loadSummary = async () => {
      setSummaryStatus('loading');
      try {
        const summary = await getAiSummary();
        if (!mounted) return;
        setAiSummary(summary);
        setSummaryStatus('loaded');
      } catch {
        if (!mounted) return;
        setSummaryStatus('error');
      }
    };

    loadCoach();
    loadSummary();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (coachStatus !== 'loading') {
      setCoachProgress(coachStatus === 'loaded' ? 100 : 0);
      return;
    }
    setCoachProgress(10);
    const id = setInterval(() => {
      setCoachProgress((prev) => Math.min(95, prev + Math.random() * 12 + 3));
    }, 400);
    return () => clearInterval(id);
  }, [coachStatus]);

  return (
    <main className="profile-shell">
      <div className="mx-auto max-w-5xl space-y-6 px-4 pb-12 pt-6 md:px-6 lg:px-0">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-white/60">Agendo AI Coach</p>
          <h1 className="text-2xl font-semibold text-white">Resumen semanal inteligente</h1>
          <p className="text-sm text-white/75">Insights y recomendaciones generadas con tu actividad real.</p>
        </header>

        {coachStatus === 'loading' && <CoachLoading progress={coachProgress} />}
        {coachStatus === 'error' && <CoachError />}
        {coachStatus === 'loaded' && coachData && (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
            <AgendoCoachCard data={coachData} />
          </section>
        )}

        {aiSummary ? (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md space-y-3">
            <h2 className="text-base font-semibold text-white">Heatmap de foco</h2>
            <p className="text-xs text-white/60">
              Minutos de foco por día y franja horaria. Úsalo para planificar tus bloques.
            </p>
            <FocusHeatmap heatmap={aiSummary.focusHeatmap} />
          </section>
        ) : null}

        {summaryStatus === 'error' ? (
          <p className="text-sm text-rose-200/70">
            No pudimos cargar el heatmap. Reintentǭ en unos segundos.
          </p>
        ) : null}
      </div>
    </main>
  );
}
