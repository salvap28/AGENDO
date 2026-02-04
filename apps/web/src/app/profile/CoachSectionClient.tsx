'use client';

import { useEffect, useState } from 'react';
import { AgendoCoachCard } from '@/components/AgendoCoachCard';
import type { WeeklyInsightsResponse } from '@/lib/api/coach';
import { getWeeklyInsights } from '@/lib/api/coach';
import { CoachLoading } from '@/components/CoachLoading';
import { CoachError } from '@/components/CoachError';

export default function CoachSectionClient() {
  const [data, setData] = useState<WeeklyInsightsResponse | null>(null);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  useEffect(() => {
    let mounted = true;
    getWeeklyInsights()
      .then((res) => {
        if (!mounted) return;
        setData(res);
        setStatus('loaded');
      })
      .catch(() => {
        if (!mounted) return;
        setStatus('error');
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      {status === 'loading' && <CoachLoading />}
      {status === 'error' && <CoachError />}
      {status === 'loaded' && data && <AgendoCoachCard data={data} />}
    </>
  );
}
