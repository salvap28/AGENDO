'use client';

import { useEffect, useMemo, useState } from 'react';
import { ProfileHeader, type ProfileStats, type ProfileUser } from './components/ProfileHeader';
import { ProfileStatsCard, type ProfileHabits } from './components/ProfileStatsCard';
import {
  ProfilePreferencesCard,
  type UserPreferences,
  type NotificationPreferences,
} from './components/ProfilePreferencesCard';
import { ProfileInsightsCard, type ProfileInsights } from './components/ProfileInsightsCard';
import { ProfileGoalsCard, type UserGoals } from './components/ProfileGoalsCard';
import { AiSettingsCard, type AiSettings } from './components/AiSettingsCard';
import { AccountSettingsCard, type AccountData } from './components/AccountSettingsCard';
import api, { API_BASE } from '@/lib/api';
import { getAiSummary, type AiSummary } from '@/lib/api/ai';
import { useAuth } from '@/components/providers/AuthProvider';

export function ProfileClientShell() {
  const { user: authUser, loading: authLoading } = useAuth();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [habits, setHabits] = useState<ProfileHabits | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [insights, setInsights] = useState<ProfileInsights | null>(null);
  const [goals, setGoals] = useState<UserGoals | null>(null);
  const [aiSettings, setAiSettings] = useState<AiSettings | null>(null);
  const [account, setAccount] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);

  const token = useMemo(() => (typeof window !== 'undefined' ? localStorage.getItem('agendo_token') : null), [authUser]);

  useEffect(() => {
    const load = async () => {
      if (authLoading) return;
      if (!authUser || !token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [statsData, summary] = await Promise.all([fetchStats(lastThirtyDays(), token), getAiSummary()]);

        const profileUser: ProfileUser = {
          name: authUser.name || authUser.email,
          email: authUser.email,
        };

        const profileStats: ProfileStats = {
          currentStreakDays: statsData.productivity?.bestStreak ?? 0,
          focusTimeThisWeekMinutes: summary.weeklySummary.totalFocusMinutes ?? 0,
          memberSince: authUser.createdAt || new Date().toISOString(),
        };

        const profileHabits: ProfileHabits = {
          avgBlocksPerDay: statsData.productivity?.avgCompletedPerDay ?? 0,
          completionRatePercent: statsData.productivity?.completionRate ?? 0,
          focusDistribution: focusDistributionFromHeatmap(summary),
        };

        const profileInsights: ProfileInsights = {
          bestFocusSlot: summary.profileInsights.bestFocusSlot || 'Sin datos',
          strongestDay: summary.profileInsights.strongestDay || 'Sin datos',
          weakestDay: summary.profileInsights.weakestDay || 'Sin datos',
          topCategories: summary.profileInsights.topCategories ?? [],
          recommendations: summary.profileInsights.recommendations?.length
            ? summary.profileInsights.recommendations
            : summary.recommendations.planning ?? [],
        };

        const profileGoals: UserGoals = {
          weeklyFocusMinutesGoal: summary.weeklySummary.totalFocusMinutes ?? 0,
          weeklyBlocksGoal: summary.weeklySummary.completedBlocks ?? 0,
          weeklyCheckInDaysGoal: Math.round((statsData.state?.dayClassPct?.good ?? 0) / 100 * 7),
          goalsEnabled: true,
        };

        const profileAi: AiSettings = {
          tone: 'warm',
          interventionLevel: 'medium',
          dailyReflectionQuestionEnabled: summary.profileInsights.recommendations?.length > 0,
        };

        const defaultPrefs: UserPreferences = {
          notifications: { preBlockReminderMinutes: 10, dailyCheckInReminderTime: '22:00', nudgeStyle: 'motivational' },
        };

        const profilePrefs: UserPreferences = authUser.preferences || defaultPrefs;

        const profileAccount: AccountData = {
          name: authUser.name || authUser.email,
          email: authUser.email,
          language: navigator.language || 'es',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          integrations: [{ id: 'gcal', name: 'Google Calendar', connected: false }],
        };

        setUser(profileUser);
        setStats(profileStats);
        setHabits(profileHabits);
        setPreferences(profilePrefs);
        setInsights(profileInsights);
        setGoals(profileGoals);
        setAiSettings(profileAi);
        setAccount(profileAccount);
      } catch (err) {
        console.error('No pudimos cargar el perfil', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authUser, authLoading, token]);

  useEffect(() => {
    if (!loading) {
      setLoadProgress(100);
      return;
    }
    setLoadProgress(10);
    const id = setInterval(() => {
      setLoadProgress((prev) => Math.min(95, prev + Math.random() * 10 + 5));
    }, 400);
    return () => clearInterval(id);
  }, [loading]);

  if (loading || !user || !stats || !habits || !preferences || !insights || !goals || !aiSettings || !account) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <p className="text-sm text-white/75">Cargando tu perfil e IA...</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-500 transition-all duration-300 ease-out"
            style={{ width: `${loadProgress}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-white/60">{Math.round(loadProgress)}% listo</p>
      </div>
    );
  }

  const savePrefs = async (newPrefs: UserPreferences) => {
    try {
      const { data } = await api.put('/user/preferences', newPrefs);
      setPreferences(data.preferences);
    } catch (err) {
      console.error('Error saving preferences', err);
      throw err;
    }
  };

  return (
    <div className="space-y-6">
      <ProfileHeader user={user} stats={stats} />
      <ProfileStatsCard habits={habits} />
      <ProfilePreferencesCard initial={preferences} onSave={savePrefs} />
      <ProfileInsightsCard insights={insights} />
      <ProfileGoalsCard initial={goals} onSave={mockSave} />
      <AiSettingsCard initial={aiSettings} onSave={mockSave} />
      <AccountSettingsCard
        account={account}
        onUpdate={mockSave}
        onExport={async () => {
          await mockSave(null);
          alert('Export preparado (mock)');
        }}
        onDelete={async () => {
          await mockSave(null);
          alert('Cuenta eliminada (mock)');
        }}
        onLogout={() => {
          window.location.href = '/logout';
        }}
      />
    </div>
  );
}

async function mockSave(_data: any) {
  await new Promise((resolve) => setTimeout(resolve, 400));
}

async function fetchStats(range: { from: string; to: string }, token: string) {
  const res = await fetch(`${API_BASE}/api/stats/full?from=${range.from}&to=${range.to}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'No pudimos cargar estad��sticas');
  }
  return res.json();
}

function focusDistributionFromHeatmap(summary: AiSummary): ProfileHabits['focusDistribution'] {
  const { focusHeatmap } = summary;
  if (!focusHeatmap.days?.length || !focusHeatmap.matrix?.length) return [];
  return focusHeatmap.days.map((day, idx) => {
    const minutes = focusHeatmap.matrix[idx]?.reduce((acc, val) => acc + (val ?? 0), 0) ?? 0;
    return { day, focusMinutes: minutes };
  });
}

function lastThirtyDays(): { from: string; to: string } {
  const today = new Date();
  const from = new Date();
  from.setDate(today.getDate() - 30);
  return { from: formatYmd(from), to: formatYmd(today) };
}

function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
