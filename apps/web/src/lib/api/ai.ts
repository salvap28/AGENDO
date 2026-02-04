import { API_BASE } from '@/lib/api';

export type FocusHeatmap = {
  days: string[];
  slots: string[];
  matrix: number[][];
};

export type CategoryMetric = {
  category: string;
  completionRate: number;
  averageDurationMinutes: number;
  focusYesRate: number;
  averageFeeling: number | null;
};

export type EnergyHourPoint = { hour: number; score: number };

export type ConsistencyMetrics = {
  activeDays: number;
  focusVariance: number;
  stable: boolean;
  daysAboveThreshold: number;
};

export type EstimationVariance = {
  overallStd: number;
  byCategory: { category: string; std: number; sampleSize: number }[];
};

export type OddDayFlag = { dayIndex: number; reason: string[] };

export type PlannedVsSpontaneous = {
  plannedMinutes: number;
  spontaneousMinutes: number;
  plannedRatio: number;
};

export type AbandonmentStats = {
  totalAbandoned: number;
  byCategory: { category: string; count: number }[];
  bySlot: { slotLabel: string; count: number }[];
};

export type DeepFocusIndex = {
  score: number;
  longBlocks: number;
  qualifyingBlocks: number;
};

export type HabitScore = {
  category: string;
  score: number;
  streak: number;
};

export type InterruptionInsight = {
  topCauses: { cause: string; count: number }[];
  vulnerableHours: number[];
  byCategory: { category: string; interruptions: number }[];
  pseudoFocusBlocks: string[];
};

export type FeelingInsight = {
  curve: EnergyHourPoint[];
  byCategory: { category: string; feeling: number | null }[];
  completionCorrelation: number;
  positiveVsProductive: 'positivo' | 'productivo' | 'balanceado';
  highlightDays: { dayIndex: number; focusMinutes: number; feeling: number | null }[];
};

export type GoalInsight = {
  progressPercent: number;
  projectionPercent: number;
  adjustment: 'subir' | 'bajar' | 'mantener';
  byCategory: { category: string; progress: number }[];
  abandoned: string[];
};

export type PlanningInsight = {
  goldSlots: string[];
  overloadDays: number[];
  bundlingSuggested: boolean;
  suggestedReplans: string[];
};

export type ExtendedMetrics = {
  byCategory: CategoryMetric[];
  energyCurve: EnergyHourPoint[];
  consistency: ConsistencyMetrics;
  estimationVariance: EstimationVariance;
  oddDays: OddDayFlag[];
  plannedVsSpontaneous: PlannedVsSpontaneous;
  abandonment: AbandonmentStats;
  deepFocus: DeepFocusIndex;
  habits: HabitScore[];
  interruptions: InterruptionInsight;
  feelings: FeelingInsight;
  goals: GoalInsight;
  planning: PlanningInsight;
  burnoutRisk: number;
  dayClusters: { dayIndex: number; label: 'calm' | 'heavy' | 'chaotic' }[];
  phase: 'inicio' | 'consolidacion' | 'estancamiento';
  perceptionVsReality: { perceivedSlot: string | null; bestSlot: string | null; alignment: boolean };
};

export type EngineRecommendationItem = {
  title: string;
  description: string;
  tag?: string;
};

export type EngineRecommendations = {
  planning: EngineRecommendationItem[];
  interruptions: EngineRecommendationItem[];
  recovery: EngineRecommendationItem[];
  habits: EngineRecommendationItem[];
};

export type TrendPoint = {
  label: string;
  focusMinutes: number;
  completionRate: number;
};

export type CategoryStackBar = { category: string; minutes: number };

export type TimelineEntry = {
  blockId: string;
  start: string | Date;
  end: string | Date;
  category: string;
  focusMinutes: number;
  feeling?: number | null;
  interruptions?: number;
};

export type WeeklyComparison = {
  currentFocus: number;
  baselineFocus: number;
  trendScore: number;
};

export type CategoryHeatmap = { category: string; heatmap: FocusHeatmap };

export type EngineTrends = {
  categoryHeatmaps: CategoryHeatmap[];
  focusTrend: TrendPoint[];
  stackedFocus: CategoryStackBar[];
  timeline: TimelineEntry[];
  weeklyComparison: WeeklyComparison;
};

export type AiSummary = {
  profileInsights: {
    bestFocusSlot: string | null;
    strongestDay: string | null;
    weakestDay: string | null;
    topCategories: string[];
    recommendations: { title: string; description: string }[];
  };
  weeklySummary: {
    weekRangeLabel: string;
    totalFocusMinutes: number;
    completedBlocks: number;
    completedTasks: number;
    completionRatePercent: number;
    highlight: string;
    lowlight?: string;
    suggestions: string[];
  };
  focusHeatmap: FocusHeatmap;
  extendedMetrics: ExtendedMetrics;
  recommendations: EngineRecommendations;
  trends: EngineTrends;
};

const EMPTY_SUMMARY: AiSummary = {
  profileInsights: {
    bestFocusSlot: null,
    strongestDay: null,
    weakestDay: null,
    topCategories: [],
    recommendations: [],
  },
  weeklySummary: {
    weekRangeLabel: '',
    totalFocusMinutes: 0,
    completedBlocks: 0,
    completedTasks: 0,
    completionRatePercent: 0,
    highlight: 'Sin datos suficientes aun.',
    lowlight: undefined,
    suggestions: [],
  },
  focusHeatmap: { days: [], slots: [], matrix: [] },
  extendedMetrics: {
    byCategory: [],
    energyCurve: [],
    consistency: { activeDays: 0, focusVariance: 0, stable: true, daysAboveThreshold: 0 },
    estimationVariance: { overallStd: 0, byCategory: [] },
    oddDays: [],
    plannedVsSpontaneous: { plannedMinutes: 0, spontaneousMinutes: 0, plannedRatio: 0 },
    abandonment: { totalAbandoned: 0, byCategory: [], bySlot: [] },
    deepFocus: { score: 0, longBlocks: 0, qualifyingBlocks: 0 },
    habits: [],
    interruptions: { topCauses: [], vulnerableHours: [], byCategory: [], pseudoFocusBlocks: [] },
    feelings: {
      curve: [],
      byCategory: [],
      completionCorrelation: 0,
      positiveVsProductive: 'balanceado',
      highlightDays: [],
    },
    goals: {
      progressPercent: 0,
      projectionPercent: 0,
      adjustment: 'mantener',
      byCategory: [],
      abandoned: [],
    },
    planning: { goldSlots: [], overloadDays: [], bundlingSuggested: false, suggestedReplans: [] },
    burnoutRisk: 0,
    dayClusters: [],
    phase: 'inicio',
    perceptionVsReality: { perceivedSlot: null, bestSlot: null, alignment: false },
  },
  recommendations: { planning: [], interruptions: [], recovery: [], habits: [] },
  trends: {
    categoryHeatmaps: [],
    focusTrend: [],
    stackedFocus: [],
    timeline: [],
    weeklyComparison: { currentFocus: 0, baselineFocus: 0, trendScore: 0 },
  },
};

export async function getAiSummary(from?: string, to?: string): Promise<AiSummary> {
  const { from: defaultFrom, to: defaultTo } = computeLastWeekRange();
  const qs = new URLSearchParams();
  if (from ?? defaultFrom) qs.set('from', from ?? defaultFrom);
  if (to ?? defaultTo) qs.set('to', to ?? defaultTo);
  const query = qs.toString();
  const url = `${API_BASE}/api/ai/summary${query ? `?${query}` : ''}`;

  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    method: 'GET',
    headers,
    cache: 'no-store',
    credentials: 'include',
  }).catch((err) => {
    throw new Error(`No se pudo conectar con Agendo AI: ${err instanceof Error ? err.message : 'desconocido'}`);
  });

  if (!res.ok) {
    if (res.status === 401) {
      return EMPTY_SUMMARY;
    }
    const text = await res.text().catch(() => '');
    throw new Error(text || `Error ${res.status} al obtener el resumen AI`);
  }

  const data = (await res.json()) as AiSummary;
  return {
    ...data,
    focusHeatmap: data.focusHeatmap ?? { days: [], slots: [], matrix: [] },
    extendedMetrics: data.extendedMetrics ?? EMPTY_SUMMARY.extendedMetrics,
    recommendations: data.recommendations ?? EMPTY_SUMMARY.recommendations,
    trends: data.trends ?? EMPTY_SUMMARY.trends,
  };
}

function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('agendo_token');
  }
  return null;
}

function computeLastWeekRange(): { from: string; to: string } {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = (day + 6) % 7;
  const thisMonday = new Date(now);
  thisMonday.setHours(0, 0, 0, 0);
  thisMonday.setDate(thisMonday.getDate() - diffToMonday);
  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(lastMonday.getDate() - 7);
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastSunday.getDate() + 6);
  lastSunday.setHours(23, 59, 59, 999);
  return { from: formatYmd(lastMonday), to: formatYmd(lastSunday) };
}

function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
