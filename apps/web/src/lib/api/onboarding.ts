import { API_BASE } from '@/lib/api';

export type OnboardingState = { completed: boolean };

export type OnboardingData = {
  completed: boolean;
  profileInfo: OnboardingPayload['profileInfo'] | null;
  goals: OnboardingPayload['goals'] | null;
  aiSettings: OnboardingPayload['aiSettings'] | null;
  notificationPreferences: OnboardingPayload['notificationPreferences'] | null;
};

export type OnboardingPayload = {
  profileInfo: {
    mainContext: 'study' | 'work' | 'both' | 'personal_projects' | 'other';
    mainGoal: string;
    bestPerceivedSlot: 'morning' | 'afternoon' | 'evening' | 'unknown';
    desiredDailyFocusHours: 1 | 2 | 3 | 4;
    struggles: ('start' | 'focus' | 'prioritization' | 'time_estimation' | 'memory')[];
  };
  goals: {
    weeklyFocusMinutesGoal: number;
    weeklyBlocksGoal?: number;
    weeklyCheckInDaysGoal?: number;
    goalsEnabled: boolean;
  };
  aiSettings: {
    tone: 'warm' | 'neutral' | 'direct';
    interventionLevel: 'low' | 'medium' | 'high';
    dailyReflectionQuestionEnabled: boolean;
  };
  notificationPreferences?: {
    preBlockReminderMinutes: 0 | 5 | 10 | 15;
    dailyCheckInReminderTime?: string;
  };
};

export async function fetchOnboardingState(token: string): Promise<OnboardingState> {
  const res = await fetch(`${API_BASE}/api/onboarding/state`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return { completed: false };
  return (await res.json()) as OnboardingState;
}

export async function submitOnboarding(payload: OnboardingPayload, token: string) {
  const res = await fetch(`${API_BASE}/api/onboarding/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'No se pudo guardar el onboarding');
  }
  return res.json();
}

export async function resetOnboarding(token: string) {
  const res = await fetch(`${API_BASE}/api/onboarding/reset`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'No se pudo reiniciar el onboarding');
  }
  return res.json();
}

export async function fetchOnboardingData(token: string): Promise<OnboardingData> {
  const res = await fetch(`${API_BASE}/api/onboarding/data`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return { completed: false, profileInfo: null, goals: null, aiSettings: null, notificationPreferences: null };
  return (await res.json()) as OnboardingData;
}

export async function updateOnboardingGoals(goals: OnboardingPayload['goals'], token: string) {
  const res = await fetch(`${API_BASE}/api/onboarding/goals`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(goals),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'No se pudieron guardar los objetivos');
  }
  return res.json();
}

export async function updateOnboardingAiSettings(aiSettings: OnboardingPayload['aiSettings'], token: string) {
  const res = await fetch(`${API_BASE}/api/onboarding/ai-settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(aiSettings),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'No se pudieron guardar la configuración de IA');
  }
  return res.json();
}
