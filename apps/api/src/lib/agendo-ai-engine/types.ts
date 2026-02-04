export type BlockCategory =
  | 'study'
  | 'work'
  | 'creative'
  | 'health'
  | 'personal'
  | 'other';

export interface Block {
  id: string;
  userId: string;
  start: Date;
  end: Date;
  category: BlockCategory;
  plannedDurationMinutes: number;
  actualDurationMinutes?: number;
  completed: boolean;
}

export interface Task {
  id: string;
  userId: string;
  createdAt: Date;
  dueDate?: Date;
  completedAt?: Date;
  category: BlockCategory;
  completed: boolean;
}

export interface CheckIn {
  id: string;
  userId: string;
  date: string;
  completed: boolean;
}

export type CompletionFeeling =
  | 'excellent'
  | 'good'
  | 'neutral'
  | 'tired'
  | 'frustrated';

export interface CompletionFeedback {
  blockId?: string;
  taskId?: string;
  completedAt: Date;
  feeling: CompletionFeeling;
  focus: 'yes' | 'partial' | 'no';
  interruptions: {
    hadInterruptions: boolean;
    cause?:
      | 'notifications'
      | 'people'
      | 'fatigue'
      | 'self-distraction'
      | 'other';
  };
  timeComparison: 'more' | 'equal' | 'less';
  note?: string;
}

export type AiTone = 'warm' | 'neutral' | 'direct';

export type AiInterventionLevel = 'low' | 'medium' | 'high';

export interface AiSettings {
  tone: AiTone;
  interventionLevel: AiInterventionLevel;
  dailyReflectionQuestionEnabled: boolean;
}

export interface AiEngineInput {
  blocks: Block[];
  tasks: Task[];
  checkIns: CheckIn[];
  feedback: CompletionFeedback[];
  settings: AiSettings;
  from: Date;
  to: Date;
}

export interface ProfileInsightsResult {
  bestFocusSlot: string | null;
  strongestDay: string | null;
  weakestDay: string | null;
  topCategories: string[];
  recommendations: {
    title: string;
    description: string;
  }[];
}

export interface WeeklySummaryResult {
  weekRangeLabel: string;
  totalFocusMinutes: number;
  completedBlocks: number;
  completedTasks: number;
  completionRatePercent: number;
  highlight: string;
  lowlight?: string;
  suggestions: string[];
}

export type FocusHeatmap = {
  days: string[];
  slots: string[];
  matrix: number[][];
};

export interface CategoryMetric {
  category: BlockCategory;
  completionRate: number;
  averageDurationMinutes: number;
  focusYesRate: number;
  averageFeeling: number | null;
}

export interface EnergyHourPoint {
  hour: number;
  score: number;
}

export interface ConsistencyMetrics {
  activeDays: number;
  focusVariance: number;
  stable: boolean;
  daysAboveThreshold: number;
}

export interface EstimationVariance {
  overallStd: number;
  byCategory: { category: BlockCategory; std: number; sampleSize: number }[];
}

export interface OddDayFlag {
  dayIndex: number;
  reason: string[];
}

export interface PlannedVsSpontaneous {
  plannedMinutes: number;
  spontaneousMinutes: number;
  plannedRatio: number;
}

export interface AbandonmentStats {
  totalAbandoned: number;
  byCategory: { category: BlockCategory; count: number }[];
  bySlot: { slotLabel: string; count: number }[];
}

export interface DeepFocusIndex {
  score: number;
  longBlocks: number;
  qualifyingBlocks: number;
}

export interface HabitScore {
  category: BlockCategory;
  score: number;
  streak: number;
}

export interface InterruptionInsight {
  topCauses: { cause: string; count: number }[];
  vulnerableHours: number[];
  byCategory: { category: BlockCategory; interruptions: number }[];
  pseudoFocusBlocks: string[];
}

export interface FeelingInsight {
  curve: EnergyHourPoint[];
  byCategory: { category: BlockCategory; feeling: number | null }[];
  completionCorrelation: number;
  positiveVsProductive: 'positivo' | 'productivo' | 'balanceado';
  highlightDays: { dayIndex: number; focusMinutes: number; feeling: number | null }[];
}

export interface GoalInsight {
  progressPercent: number;
  projectionPercent: number;
  adjustment: 'subir' | 'bajar' | 'mantener';
  byCategory: { category: BlockCategory; progress: number }[];
  abandoned: string[];
}

export interface PlanningInsight {
  goldSlots: string[];
  overloadDays: number[];
  bundlingSuggested: boolean;
  suggestedReplans: string[];
}

export interface ExtendedMetrics {
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
}

export interface EngineRecommendationItem {
  title: string;
  description: string;
  tag?: string;
}

export interface EngineRecommendations {
  planning: EngineRecommendationItem[];
  interruptions: EngineRecommendationItem[];
  recovery: EngineRecommendationItem[];
  habits: EngineRecommendationItem[];
}

export interface TrendPoint {
  label: string;
  focusMinutes: number;
  completionRate: number;
}

export interface CategoryStackBar {
  category: BlockCategory;
  minutes: number;
}

export interface TimelineEntry {
  blockId: string;
  start: Date;
  end: Date;
  category: BlockCategory;
  focusMinutes: number;
  feeling?: number | null;
  interruptions?: number;
}

export interface WeeklyComparison {
  currentFocus: number;
  baselineFocus: number;
  trendScore: number;
}

export interface CategoryHeatmap {
  category: BlockCategory;
  heatmap: FocusHeatmap;
}

export interface EngineTrends {
  categoryHeatmaps: CategoryHeatmap[];
  focusTrend: TrendPoint[];
  stackedFocus: CategoryStackBar[];
  timeline: TimelineEntry[];
  weeklyComparison: WeeklyComparison;
}

export interface AgendoAiEngineResult {
  profileInsights: ProfileInsightsResult;
  weeklySummary: WeeklySummaryResult;
  focusHeatmap: FocusHeatmap;
  extendedMetrics: ExtendedMetrics;
  recommendations: EngineRecommendations;
  trends: EngineTrends;
}

export interface RangeBounds {
  from: Date;
  to: Date;
}

export interface CategoryBias {
  category: BlockCategory;
  biasPercent: number;
}

export interface CategoryScore {
  category: BlockCategory;
  label: string;
  score: number;
  completionRate: number;
  feelingAverage: number | null;
  focusYesRate: number;
  sampleSize: number;
}

export interface DayScore {
  dayIndex: number;
  dayName: string;
  score: number;
  completionRate: number;
  focusMinutes: number;
  completedBlocks: number;
  tasksCreatedOrDue: number;
  tasksCompleted: number;
}

export interface DayPatternResult {
  strongestDay: string | null;
  weakestDay: string | null;
  dayScores: DayScore[];
}
